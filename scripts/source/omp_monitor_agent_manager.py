# -*- coding:utf-8 -*-
import os
import sys
import argparse
import django

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
sys.path.append(os.path.join(PROJECT_DIR, 'omp_server'))
# 加载django环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omp_server.settings")
django.setup()

from db_models.models import Host
import logging
from utils.plugin.salt_client import SaltClient
import json
import requests

logger = logging.getLogger('server')

export_ser_dc = {
    "clickhouse": "clickhouseExporter",
    "elasticsearch": "elasticsearchExporter",
    "kafka": "kafkaExporter",
    "mysql": "mysqlExporter",
    "node": "nodeExporter",
    "postgreSql": "postgreSqlExporter",
    "Prometheus": "promtail",
    "redis": "redisExporter",
    "rocketmq": "rocketmqExporter",
    "tengine": "tengineExporter",
    "zookeeper": "zookeeperExporter"
}


def get_cmd(all_server, export_dir, action="restart"):
    cmd = ""
    for ser in all_server:
        if ser in list(export_ser_dc):
            cmd_str = "bash {0}/{1}/scripts/{1} {2}".format(export_dir, export_ser_dc[ser], action)
            if not cmd:
                cmd = cmd_str
            else:
                cmd += " && {0}".format(cmd_str)
    return cmd


def exec_export(action="restart"):
    salt_obj = SaltClient()
    for host in Host.objects.all():
        export_dir = os.path.join(host.data_folder, "omp_monitor_agent/exporters")
        monitor_conf = os.path.join(host.data_folder, "omp_monitor_agent/conf/service_info.json")
        flag, res = salt_obj.cmd(host.ip, f"cat {monitor_conf}", 600)
        if not flag:
            print(f"agent异常,{host.ip}")
        all_server = json.loads(res)
        cmd = get_cmd(all_server, export_dir, action)
        if cmd:
            flag, res = salt_obj.cmd(host.ip, cmd, 600)
            print(flag, res)


def request_metrics(name, export, ip):
    port = export.get("exporter_port")
    if not port:
        print("无法检测跳过{0}".format(name))
        return True
    url = f"http://{ip}:{port}/{export.get('exporter_metric')}"
    username, password = export.get("username"), export.get("password")
    if not username or not password:
        username, password = "mokey", "w7SiYs$oE"
    try:
        response = requests.get(url, auth=(username, password), timeout=5)
        if int(response.status_code) != 200:
            print("服务请求异常{0}:,url:{1},返回码:{2} 认证信息: {3} : {4}".format(
                name, url, response.status_code, username, password
            ))
    except Exception as e:
        print("服务请求异常{0}:{1}".format(name, e))


def check_ser_export():
    salt_obj = SaltClient()
    for host in Host.objects.all():
        monitor_conf = os.path.join(host.data_folder, "omp_monitor_agent/conf/service_info.json")
        flag, res = salt_obj.cmd(host.ip, f"cat {monitor_conf}", 600)
        if not flag:
            print(f"agent异常,{host.ip}")
        for name, export in json.loads(res).items():
            request_metrics(name, export, host.ip)


def parameters():
    """
    传递参数
    :return: 脚本接收到的参数
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", "-action", required=True,
                        help="start stop restart status")
    parser.add_argument("--type", "-type", help="监控类型 e:export s:service")
    param = parser.parse_args()
    return param


if __name__ == '__main__':
    try:
        param = parameters()
        if param.action not in ["start", "stop", "restart", "status"]:
            print("请输入正确的(start,stop,restart,status)参数")
            sys.exit(1)
        if param.type in ["e", "export"]:
            exec_export(action=param.action)
        elif param.type in ["s", "service"]:
            check_ser_export()
        else:
            print("参数未识别")
            sys.exit(1)
    except Exception as err:
        print(f"请输入参数(start,stop,restart,status):{err}")
