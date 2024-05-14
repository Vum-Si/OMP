# -*- coding: utf-8 -*-
# Project: __init__.py
# Author: jerry.zhang@yunzhihui.com
# Create time: 2021-12-16 10:10
# IDE: PyCharm
# Version: 1.0
# Introduction:

import logging

logger = logging.getLogger("server")


class Flink(object):
    @staticmethod
    def update_service(service_list):
        """
        分配redis服务角色
        :param service_list: 服务数据列表
        :return:
        """
        if len(service_list) == 1:
            service_list[0]['roles'] = "taskmanager,jobmanager"
        for index, i in enumerate(service_list):
            if i.get('roles'):
                continue
            if index == 0:
                i['roles'] = "taskmanager,jobmanager"
            else:
                i['roles'] = "jobmanager"
        return service_list
