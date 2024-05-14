# -*- coding:utf-8 -*-
# Project: deploy_mode
# Author: vum.si@yunzhihui.com
# Create time: 2022/8/18 00:00
import os
import sys
import json
import django
import argparse

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
PACKAGE_DIR = os.path.join(PROJECT_DIR, "package_hub")
PYTHON_PATH = os.path.join(PROJECT_DIR, 'component/env/bin/python3')
sys.path.append(os.path.join(PROJECT_DIR, 'omp_server'))

# 加载django环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omp_server.settings")
django.setup()

import string
import random

from django.db import transaction
from db_models.models import (Service, Product, ApplicationHub, ProductHub)
from app_store.new_install_utils import DeployTypeUtil


class DeployModeUtil:

    def __init__(self, pro_name, target_mode):
        self.pro_name = pro_name
        self.target_mode = target_mode
        self.new_service_dp_dict = {}

    def get_or_create_pro_queryset(self):
        """ 查询或创建产品实例 """
        # 5.5 dodp 升级是通过服务安装而来，并非产品级别安装，不会产生 pro 实例
        pro_queryset = Product.objects.filter(product__pro_name=self.pro_name)
        if not pro_queryset:
            # 当服务实例不存在时，如果存在 service 实例，则生成 pro 实例
            service_queryset = Service.objects.filter(
                service__product__pro_name=self.pro_name)
            if service_queryset.exists():
                pro_obj = ProductHub.objects.filter(
                    pro_name=self.pro_name).last()
                upper_key = ''.join(random.choice(
                    string.ascii_uppercase) for _ in range(7))
                _obj = Product.objects.create(
                    product_instance_name=f"{self.pro_name}-{upper_key}",
                    product=pro_obj,
                )
                return _obj
            return None
        return pro_queryset.last()

    def valid(self):
        """ 校验目标是否为基础组件 / 产品名称 """
        if self.pro_name is None:
            return False, "需要包含参数 [--pro_name]"
        pro_obj = self.get_or_create_pro_queryset()
        if pro_obj is not None:
            if self.target_mode is None:
                deploy_mode = "通用模式"
                if pro_obj.deploy_mode is not None:
                    deploy_mode = pro_obj.deploy_mode
                print(deploy_mode)
                exit(0)
            if (self.target_mode == "通用模式" and pro_obj.deploy_mode is None) \
                    or self.target_mode == pro_obj.deploy_mode:
                print(f"产品 [{self.pro_name}] 部署模式已修改为 [{self.target_mode}]")
                exit(0)
            # 校验 target_mode 是否支持
            app_queryset = ApplicationHub.objects.filter(
                product__product=pro_obj)
            pro_deploy_mode_ls = []
            for app in app_queryset:
                if app.deploy_mode is not None:
                    deploy_mode_ls = app.deploy_mode.get("deploy_mode_ls", [])
                    pro_deploy_mode_ls.extend(deploy_mode_ls)
            if self.target_mode != "通用模式" and \
                    self.target_mode not in set(pro_deploy_mode_ls):
                return False, f"产品 [{self.pro_name}] 不支持模式 [{self.target_mode}]"
            service_queryset = Service.objects.filter(
                service__product__product=pro_obj).prefetch_related("service")
            if not service_queryset.exists():
                return False, f"产品 [{self.pro_name} - {pro_obj.product.pro_version}] 无已安装服务实例"
            # 校验所有服务实例的依赖是否缺失
            for service_obj in service_queryset:
                _mode = None if self.target_mode == "通用模式" else self.target_mode
                if service_obj.service.deploy_mode is None:
                    continue
                deploy_mode_ls = service_obj.service.deploy_mode.get(
                    "deploy_mode_ls", [])
                _flag = False
                if (_mode is None and service_obj.deploy_mode is not None) \
                        or (_mode is not None and _mode in deploy_mode_ls):
                    _flag = True
                if not _flag:
                    continue
                dependence_ls = DeployTypeUtil(
                    service_obj.service, json.loads(
                        service_obj.service.app_dependence)
                ).get_dependence_by_deploy(_mode)

                # 构建切换后的 service 依赖信息
                service_dependence_ls = []
                for item in dependence_ls:
                    app_name = item.get("name", None)
                    app_version = item.get("version", "")
                    dependence_service_queryset = Service.objects.filter(
                        service__app_name=app_name,
                        service__app_version__regex=f"^{app_version}"
                    )
                    if not dependence_service_queryset.exists():
                        return False, f"产品 [{self.pro_name}] 下服务 [{service_obj.service.app_name}] " \
                                      f"缺少依赖组件 [{app_name}] - [{app_version}]"
                    dependence_service_obj = dependence_service_queryset.last()
                    cluster_name = None
                    if dependence_service_obj.cluster is not None:
                        cluster_name = dependence_service_obj.cluster.cluster_name
                    service_dependence_ls.append({
                        "name": app_name,
                        "cluster_name": cluster_name,
                        "instance_name": dependence_service_obj.service_instance_name
                    })
                self.new_service_dp_dict[service_obj.service_instance_name] = service_dependence_ls

            return True, [pro_obj, service_queryset]
        return False, f"未找到产品 [{self.pro_name}]"

    def set_pro_deploy_mode(self, info):
        """ 设置产品的部署模式 """
        pro_obj, service_queryset = info
        _mode = None if self.target_mode == "通用模式" else self.target_mode
        try:
            with transaction.atomic():
                # 修改服务依赖信息、部署模式
                for service_obj in service_queryset:
                    if service_obj.service_instance_name in self.new_service_dp_dict:
                        service_obj.service_dependence = json.dumps(
                            self.new_service_dp_dict[service_obj.service_instance_name]
                        )
                        service_obj.deploy_mode = _mode
                        service_obj.save()
                # 修改产品部署模式
                pro_obj.deploy_mode = _mode
                pro_obj.save()
        except Exception as err:
            print(f"出现异常: {err}")
            print("-" * 50)
            print("修改失败")
            exit(1)

    def run(self):
        is_valid, info = self.valid()
        if not is_valid:
            print(info)
            exit(1)
        self.set_pro_deploy_mode(info)
        print(f"产品 [{self.pro_name}] 部署模式已修改为 [{self.target_mode}]")
        exit(0)


def parameters():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pro_name", "-pro_name", help="产品名称")
    parser.add_argument("--target_mode", "-target_mode", help="目标模式")
    param = parser.parse_args()
    return param


if __name__ == '__main__':
    args = parameters()
    DeployModeUtil(
        pro_name=args.pro_name,
        target_mode=args.target_mode
    ).run()
