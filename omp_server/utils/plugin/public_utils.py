# -*- coding: utf-8 -*-
# Project: public_utils
# Author: jon.liu@yunzhihui.com
# Create time: 2021-10-09 19:55
# IDE: PyCharm
# Version: 1.0
# Introduction:

"""
文件md5值处理模块
"""

import os
import socket
import hashlib
import ipaddress
import subprocess
import time
from functools import wraps
from db_models.models import Host, Service
from collections import Counter
from utils.plugin.salt_client import SaltClient
from omp_server.settings import PROJECT_DIR
from promemonitor.prometheus import Prometheus
from utils.parse_config import DISK_ERROR_LINE, DISK_AVAILABLE_SIZE


def local_cmd(command):
    """
    执行本地shell命令
    :param command: 执行命令
    :return: (stdout, stderr, ret_code)
    """
    p = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True
    )
    stdout, stderr = p.communicate()
    _out, _err, _code = \
        stdout.decode("utf8"), stderr.decode("utf8"), p.returncode
    return _out, _err, _code


def check_agent_df(ip_dc):
    ip_dc = Prometheus().get_host_data_disk_usage(ip_dc)
    disk_err = []
    for i in ip_dc:
        # 监控存在异常不检查
        if not i.get('data_disk_usage'):
            continue
        if float(i.get('data_disk_usage')) >= DISK_ERROR_LINE or i.get('data_disk_status') not in ["normal", "warning"]:
            disk_err.append(i.get('ip'))
    return disk_err


def check_agent(ip=None):
    """
    检查salt_agent状态
    :param ip: ip列表 ["192.168.0.1",...] 不填写为全部主机
    :return: list 异常ip列表
    """
    ip_ls = Host.objects.all() if ip is None else \
        Host.objects.filter(ip__in=ip)
    ip_ls = list(ip_ls.values("ip", "data_folder"))
    error_lst = []
    salt_cli = SaltClient()
    for i in ip_ls:
        _flag, _ = salt_cli.fun(target=i.get("ip"), fun="test.ping")
        if not _flag:
            error_lst.append(i.get("ip"))
    if not error_lst and ip_ls:
        return error_lst, check_agent_df(ip_ls)
    return error_lst, []


def check_localhost_df():
    cmd = {f"df --block-size=1G {PROJECT_DIR} |tail -1"}
    out, _, _ = local_cmd(cmd)
    out_ls = out.split()
    if float(out_ls[3]) <= DISK_AVAILABLE_SIZE or float(out_ls[4][:-1]) >= DISK_ERROR_LINE:
        return False, "omp服务端磁盘资源即将占满，请清理磁盘后再使用。"
    return True, "磁盘正常"


def check_env_cmd(ip=None, need_check_agent=False):
    """
    检查omp当前状态状态
    :param ip: ip列表 ["192.168.0.1",...]
    :param need_check_agent: 是否需要检查salt agent 默认不检查
    :return: bool 状态， str 异常信息
    """
    cmd_service = {"salt-master": "salt-master",
                   "\"celery -A omp_server worker\"": "worker",
                   "component/redis/bin/redis-server": "redis"
                   }

    for cmd in cmd_service.keys():
        out, err, code = local_cmd(
            f" ps -eO lstart  |grep {cmd} |grep -v grep  | awk '{{print $5}}' |uniq |wc -l")
        if str(out).strip() == "2":
            out, err, code = local_cmd(
                f"ps  -eO lstart |grep {cmd} |grep -v grep  | awk '{{print $5}}'|uniq|sort")
            out_ls = out.split()
            old_time = int(time.mktime(time.strptime(out_ls[0], "%H:%M:%S")))
            new_time = int(time.mktime(time.strptime(out_ls[1], "%H:%M:%S")))
            if old_time - new_time <= 7200:
                out = 1
            else:
                out = 2
        if code == 0 and str(out).strip() != "0":
            continue
        service_name = cmd_service.get(cmd, "")
        err_str = f"{service_name}进程不存在" if str(out).strip() == "0" else f"{service_name}存在可能存在残留进程"
        err_str = f"{service_name}进程查询异常:{err}" if code != 0 else err_str
        return False, err_str
    # 检查磁盘
    status, msg = check_localhost_df()
    if not status:
        return False, msg

    if need_check_agent:
        error_ls, error_disk = check_agent(ip)
        if error_ls:
            return False, f"agent存在异常，请检查agent状态:{','.join(error_ls)}"
        if error_disk:
            return False, f"agent磁盘超过最大限制或磁盘异常，请及时清理磁盘空间，避免服务掉线{','.join(error_disk)}"
    return True


def get_file_md5(file_path):
    """
    获取文件的md5值
    :param file_path: 文件路径
    :return:
    """
    if not os.path.exists(file_path):
        return False, "File not exists!"
    m = hashlib.md5()
    with open(file_path, 'rb') as f_obj:
        while True:
            data = f_obj.read(4096)
            if not data:
                break
            m.update(data)
    return True, m.hexdigest()


def check_is_ip_address(value):
    """
    检查是否为ip地址
    :param value: ip地址字符串
    :return:
    """
    try:
        ipaddress.ip_address(value)
        return True, value
    except ValueError:
        return False, "not valid ip address!"


def check_ip_port(ip, port):
    """
    检查ip、port的联通性
    :param ip: 地址
    :param port: 端口
    :return:
    """
    if not check_is_ip_address(value=ip)[0]:
        return False, "ip address not correct"
    try:
        int_port = int(port)
        if int_port < 0 or int_port > 65535:
            return False, "port must be 0 ~ 65535"
    except ValueError:
        return False, "port must be 0 ~ 65535, int or string"
    sock_obj = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock_obj.connect_ex((ip, port))
    if result == 0:
        return_tuple = (True, "success")
    else:
        return_tuple = (False, "failed")
    sock_obj.close()
    return return_tuple


class DurationTime:

    def __init__(self, seconds):
        self.second = seconds
        self.minute = self.hour = self.day = 0

    def analysis_day(self):
        day, hour = divmod(self.hour, 24)
        setattr(self, "hour", hour)
        setattr(self, "day", day)

    def analysis_hour(self):
        hour, minute = divmod(self.minute, 60)
        setattr(self, "minute", minute)
        setattr(self, "hour", hour)

    def analysis_minute(self):
        minute, second = divmod(self.second, 60)
        setattr(self, "second", second)
        setattr(self, "minute", minute)

    def __call__(self, *args, **kwargs):
        for key in ["minute", "hour", "day"]:
            getattr(self, f"analysis_{key}")()
            if not getattr(self, key):
                return self
        return self


def timedelta_strftime(timedelta):
    """
    四舍五入格式化timedelta
    :param timedelta: <class datetime.timedelta>
    :return: "XX天XX时XX分XX秒"
    """
    seconds = round(timedelta.total_seconds())
    duration = DurationTime(seconds)()
    en_zh = [("day", "天"), ("hour", "时"), ("minute", "分"), ("second", "秒")]
    strftime = ""
    for en, zh in en_zh:
        if strftime:
            strftime += f"{getattr(duration, en)}{zh}"
        elif not strftime and getattr(duration, en):
            strftime += f"{getattr(duration, en)}{zh}"
    return strftime


def file_md5(file_path):
    # md5校验生成
    md5_out = local_cmd(f'md5sum {file_path}')

    if md5_out[2] != 0:
        return None
    return md5_out[0].split()[0]


def format_location_size(size):
    # 格式化文件大小
    if int(size / 1024) < 100:
        return "%.3f" % (size / 1024) + "K"
    size = size / 1024
    if int(size / 1024) < 100:
        return "%.3f" % (size / 1024) + "M"
    return "%.3f" % (size / 1024 / 1024) + "G"


def sync_service_num(f):
    """
    同步主机服务数
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        res = f(*args, **kwargs)
        ip_ls = list(Service.objects.all().values_list("ip", flat=True))
        counter = dict(Counter(ip_ls))
        for i in Host.objects.all():
            ser_count = counter.get(i.ip)
            if ser_count and ser_count != i.service_num:
                i.service_num = ser_count
                i.save()
        return res
    return decorated
