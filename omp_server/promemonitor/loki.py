# -*- coding:utf-8 -*-
# Project: loki
# Create time: 2023/3/1 5:01 下午
import requests
import logging
from utils.parse_config import MONITOR_PORT

logger = logging.getLogger('server')


class Loki(object):
    """定义loki的参数及动作"""

    def __init__(self):
        self.basic_url = self.get_loki_config()
        self.headers = {'Content-Type': 'application/json', "X-Scope-OrgID": "tenant1"}
        self.lables_url = f'http://{self.basic_url}/loki/api/v1/labels'

    @staticmethod
    def get_loki_config():
        return f"127.0.0.1:{MONITOR_PORT.get('loki', '19012')}"

    def get_lables_list(self):
        """获取loki 所有的标签"""
        labels_list = list()
        try:
            res = requests.get(self.lables_url, headers=self.headers).json()
            if res.get("status") == "success":
                labels_list = res.get("data", [])
        except Exception as e:
            logger.error(f"获取全部loki labels失败，详情为：{str(e)}")
            labels_list = list()
        return labels_list

    def get_label_values_list(self, label):
        """
        获取特定标签的全部值
        :param value: label
        :return: 成功返回：values_list
                 失败：[]
        """
        values_list = list()
        lable_value_url = f'http://{self.basic_url}/loki/api/v1/label/{label}/values'
        try:
            res = requests.get(lable_value_url, headers=self.headers).json()
            if res.get("status") == "success":
                values_list = res.get("data", [])
        except Exception as e:
            logger.error(f"获取{label}全部 values失败，详情为：{str(e)}")
            values_list = list()
        return values_list
