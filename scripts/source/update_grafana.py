# -*- coding: utf-8 -*-
# Project: update_grafana
# Author: jon.liu@yunzhihui.com
# Create time: 2021-10-10 16:58
# IDE: PyCharm
# Version: 1.0
# Introduction:

"""
grafana数据更新及初始化操作
grafana默认的用户名密码均为admin，不做更改
"""

import os
import sys
import json
import time

import django
import requests
from ruamel import yaml

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
GRAFANA_DASHBOARD_JSON = os.path.join(
    PROJECT_DIR, "package_hub/grafana_dashboard_json")
AGREE = "http"
sys.path.append(os.path.join(PROJECT_DIR, "omp_server"))

# 加载Django环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omp_server.settings")
django.setup()
from utils.parse_config import GRAFANA_AUTH
from utils.plugin.synch_grafana import synch_grafana_info


class Grafana(object):
    """ grafana 安装时使用 """

    def __init__(
            self,
            ip="127.0.0.1", port=19014,
            loki_ip="127.0.0.1", loki_port=19012,
            prometheus_ip="127.0.0.1", prometheus_port=19011
    ):
        self.ip = ip
        self.port = port
        self.loki_ip = loki_ip
        self.loki_port = loki_port
        self.prometheus_ip = prometheus_ip
        self.prometheus_port = prometheus_port
        self.login_url = \
            f"{AGREE}://{self.ip}:{self.port}/proxy/v1/grafana/login"
        self.login_key = \
            f"{AGREE}://{self.ip}:{self.port}/proxy/v1/grafana/api/auth/keys"
        self.create_user_url = \
            f"{AGREE}://{self.ip}:{self.port}/api/admin/users"
        self.data_source_url = \
            f"{AGREE}://{self.ip}:{self.port}/api/datasources"
        self.dashboard_url = \
            f"{AGREE}://{self.ip}:{self.port}/api/dashboards/db"
        self.dashboard_id_url = \
            f"{AGREE}://{self.ip}:{self.port}/api/dashboards/uid/XrwAXz_Mz"
        self.profile_url = \
            f"{AGREE}://{self.ip}:{self.port}/api/user/preferences"
        self.content_type = {'Content-Type': 'application/json'}
        self.basic_auth = (GRAFANA_AUTH.get("grafana_admin_auth").get("username", "admin"),
                           GRAFANA_AUTH.get("grafana_admin_auth").get("plaintext_password", "Yunweiguanli@OMP_123"))
        self.omp_auth = (GRAFANA_AUTH.get("grafana_viewer_auth").get("username", "omp"),
                         GRAFANA_AUTH.get("grafana_viewer_auth").get("plaintext_password", "Common@123"))

    def post(self, url, data, auth):
        """
        封装post方法
        :param url: 请求url
        :param data: 请求数据
        :param auth: 权限信息
        :return:
        """
        try:
            res = requests.post(
                url=url,
                data=json.dumps(data),
                headers=self.content_type,
                auth=auth
            )
            return True, json.loads(res.text)
        except requests.ConnectionError:
            print("Grafana can not connected - POST!")
            return False, "ConnectionError"

    def put(self, url, data, auth):
        """
        封装put方法
        :param url: 请求url
        :param data: 请求数据
        :param auth: 权限信息
        :return:
        """
        try:
            res = requests.put(
                url=url,
                data=json.dumps(data),
                headers=self.content_type,
                auth=auth
            )
            return True, json.loads(res.text)
        except requests.ConnectionError:
            print("Grafana can not connected - PUT!")
            return False, "ConnectionError"

    def get(self, url, params, auth):
        """
        封装get方法
        :param url: 请求url
        :param params: 请求参数
        :param auth: 权限信息
        :return:
        """
        try:
            res = requests.get(
                url=url,
                params=params,
                headers=self.content_type,
                auth=auth
            )
            return True, json.loads(res.text)
        except requests.ConnectionError:
            print("Grafana can not connected - GET!")
            return False, "ConnectionError"

    def create_omp_user(self):
        """
        创建omp使用用户
        :return:
        """
        user_dict = {
            "name": self.omp_auth[0],
            "email": f"{self.omp_auth[0]}@cloudwise.com",
            "login": self.omp_auth[0],
            "password": self.omp_auth[1],
            "OrgId": 1
        }
        create_flag, create_message = self.post(
            url=self.create_user_url,
            data=user_dict,
            auth=self.basic_auth
        )
        if not create_flag:
            return create_flag, create_message
        if create_message.get("message") == "User created" or \
                "already exists" in create_message.get("message"):
            return True, "success"
        return False, f"Create omp user failed with error: {create_message}"

    def update_user_profile(self):
        """
        更新用户设置
        :return:
        """
        flag, res = self.get(
            url=self.dashboard_id_url,
            params=None,
            auth=self.basic_auth
        )
        if not flag:
            print(f"update_user_profile 更新用户配置失败")
            return flag, res
        home_dashboard_id = res.get("dashboard", {}).get("id")
        if not home_dashboard_id:
            return False, "can not get home dashboard id"
        profile_setting = {
            "theme": "light",
            "homeDashboardId": int(home_dashboard_id),
            "timezone": "browser"
        }
        self.put(
            url=self.profile_url,
            data=profile_setting,
            auth=self.basic_auth
        )
        self.put(
            url=self.profile_url,
            data=profile_setting,
            auth=self.omp_auth
        )
        return True, "success"

    def grafana_auth(self):
        """
         请求grafana获取api_keys
        """
        # name 必须是唯一值
        data = {"name": "jonA", "role": "Admin", "secondsToLive": None}

        res = self.post(
            url=self.login_key,
            data=data,
            auth=self.basic_auth
        )
        api_key = None
        if res[0]:
            api_key = res[1].get("key")
        if api_key:
            config_path = os.path.join(PROJECT_DIR, "config/omp.yaml")
            with open(config_path, "r", encoding="utf8") as fp:
                content = fp.read()
            my_yaml = yaml.YAML()
            code = my_yaml.load(content)
            code["grafana_api_key"] = api_key
            with open(config_path, "w", encoding="utf8") as fp:
                my_yaml.dump(code, fp)

    def run(self):
        """
        更新入口
        :return:
        """
        self.create_omp_user()
        self.update_user_profile()
        self.grafana_auth()


if __name__ == '__main__':
    if len(sys.argv[1:]) != 1:
        print("Please use python update_grafana.py local_ip")
        exit(1)
    local_ip = sys.argv[1:][0]

    config_file_path = os.path.join(PROJECT_DIR, "config/omp.yaml")
    with open(config_file_path, "r") as fp:
        CONFIG_DIC = yaml.load(fp, Loader=yaml.SafeLoader)
    g_port = CONFIG_DIC.get("monitor_port", {}).get("grafana")
    p_port = CONFIG_DIC.get("monitor_port", {}).get("prometheus")
    l_port = CONFIG_DIC.get("monitor_port", {}).get("loki")
    obj = Grafana(
        ip=local_ip, port=g_port,
        loki_ip=local_ip, loki_port=l_port,
        prometheus_ip=local_ip, prometheus_port=p_port
    )
    obj.run()
    # 更新grafana的面板数据
    # synch_grafana_info()
