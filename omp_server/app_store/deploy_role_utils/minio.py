# -*- coding: utf-8 -*-
# Project: __init__.py
# Author: jerry.zhang@yunzhihui.com
# Create time: 2021-09-01 14:19
# IDE: PyCharm
# Version: 1.0
# Introduction:

import logging

logger = logging.getLogger("server")


class Minio(object):
    @staticmethod
    def update_service(service_list):
        """
        分配redis服务角色
        :param service_list: 服务数据列表
        :return:
        """
        if len(service_list) == 1:
            service_list[0]['roles'] = "master"
        for index, i in enumerate(service_list):
            if i.get('roles'):
                continue
            if index % 2 == 0:
                i['roles'] = "master"
            else:
                i['roles'] = "slave"
        return service_list