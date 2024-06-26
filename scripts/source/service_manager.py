# -*- coding:utf-8 -*-
import os
import sys
import time
import argparse
import django

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
sys.path.append(os.path.join(PROJECT_DIR, 'omp_server'))
# 加载django环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omp_server.settings")
django.setup()

from services.tasks import exec_action, order
from db_models.models import Service, ApplicationHub
from concurrent.futures import (
    ThreadPoolExecutor, as_completed
)
from utils.parse_config import BASIC_ORDER
import logging
from utils.plugin.salt_client import SaltClient
from utils.parse_config import THREAD_POOL_MAX_WORKERS

logger = logging.getLogger('server')


def check_result(future_list):
    """
    查看线程结果
    """
    for future in as_completed(future_list):
        ip, message = future.result()
        print(f"{ip} {message}")
    time.sleep(5)


def service_status(service_objs):
    """
    查询全局状态
    """
    salt_obj = SaltClient()
    ips = {}
    for obj in service_objs:
        exec_cmd = obj.service_controllers.get(
            "start", "").replace(" start", " status")
        if not ips.get(obj.ip):
            ips[obj.ip] = f'{exec_cmd};'
        else:
            ips[obj.ip] = ips.get(obj.ip) + f'{exec_cmd};'
    for ip, exe_action in ips.items():
        is_success, info = salt_obj.cmd(ip, exe_action, 600)
        print(f"{ip}:{is_success}\n{info}")


def service_actions(actions, ip=None, service_name=None, service_type="s_type"):
    """
    执行服务启停，支持ip筛选
    状态为删除中，安装中，升级中，会滚中状态不被允许执行服务起停操作
    """
    choice = {
        "start": ["1", Service.SERVICE_STATUS_STARTING],
        "stop": ["2", Service.SERVICE_STATUS_STOPPING],
        "restart": ["3", Service.SERVICE_STATUS_RESTARTING]
    }
    application_type = {
        "basic": 0,
        "product": 1
    }
    action = choice.get(actions)
    old_actions = actions
    actions = "start" if actions in ["status", "restart"] else actions
    service_obj = Service.objects.filter(service_controllers__has_key=actions).exclude(
        service_status__in=[Service.SERVICE_STATUS_INSTALLING,
                            Service.SERVICE_STATUS_UPGRADE,
                            Service.SERVICE_STATUS_ROLLBACK,
                            Service.SERVICE_STATUS_DELETING
                            ]
    ).select_related("service")

    if ip:
        service_obj = service_obj.filter(ip=ip)
    if service_name:
        service_obj = service_obj.filter(service__app_name=service_name)
    if application_type.get(service_type) is not None:
        service_obj = service_obj.filter(service__app_type=application_type.get(service_type))
    # 调整顺序
    if not action:
        service_status(service_obj)
        return

    service_obj.update(service_status=action[1])
    service_ls = order(service_obj, old_actions, need_reverse_restart=True)
    for index, service_ids in enumerate(service_ls):
        # 重启重写
        if old_actions == "restart":
            if index < len(service_ls) / 2:
                action[0] = "2"
            else:
                action[0] = "1"
        with ThreadPoolExecutor(THREAD_POOL_MAX_WORKERS) as executor:
            future_list = []
            for i in service_ids:
                # print(i.get("service_instance_name"))
                future_obj = executor.submit(
                    exec_action, action[0],
                    i.id, "admin", need_sleep=False
                )
                future_list.append(future_obj)
            check_result(future_list)


def jvm_del(ip=None, service_name=None):
    service_obj = Service.objects.filter(service_controllers__has_key="start", service__app_type=1).exclude(
        service_status__in=[Service.SERVICE_STATUS_INSTALLING,
                            Service.SERVICE_STATUS_UPGRADE,
                            Service.SERVICE_STATUS_ROLLBACK,
                            Service.SERVICE_STATUS_DELETING
                            ]
    ).select_related("service")

    if ip:
        service_obj = service_obj.filter(ip=ip)
    if service_name:
        service_obj = service_obj.filter(service__app_name=service_name)

    ip_scripts = {}
    for obj in service_obj:
        cmd_str = "sed -i '/javaagent/d' {0}".format(obj.service_controllers.get("start").split()[0])
        ip_scripts.setdefault(obj.ip, []).append(cmd_str)
    for i, cmd_ls in ip_scripts.items():
        salt_obj = SaltClient()
        salt_obj.cmd(i, " && ".join(cmd_ls), 600)


def parameters():
    """
    传递参数
    :return: 脚本接收到的参数
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", "-action", required=True,
                        help="Json文件位置")
    parser.add_argument("--ip", "-ip", help="指定IP地址")
    parser.add_argument("--service_name", "-service_name", help="版本信息")
    parser.add_argument("--service_type", "-service_type", help="该服务备份绝对路径")
    param = parser.parse_args()
    return param


if __name__ == '__main__':
    try:
        param = parameters()
        if param.action not in ["start", "stop", "restart", "status", "jvm_del"]:
            print("请输入正确的(start,stop,restart,status)参数")
            sys.exit(1)
        if param.action == "jvm_del":
            jvm_del(ip=param.ip, service_name=param.service_name)
        else:
            service_actions(param.action, ip=param.ip,
                        service_name=param.service_name,
                        service_type=param.service_type)
    except Exception as err:
        print(f"请输入参数(start,stop,restart,status):{err}")
