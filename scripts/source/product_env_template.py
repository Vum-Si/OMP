# -*- coding:utf-8 -*-
import os
import sys
import django

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
sys.path.append(os.path.join(PROJECT_DIR, 'omp_server'))
# 加载django环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omp_server.settings")
django.setup()

from db_models.models import Service, Host
from utils.plugin.crypto import AESCryptor
import pandas as pd


def host(h_data):
    host_ls = Host.objects.all().values_list("instance_name", "ip",
                                             "port", "username",
                                             "password", "data_folder",
                                             "operate_system")
    for line, line_h in enumerate(host_ls):
        for row, row_h in enumerate(line_h):
            if row == 4:
                aes_crypto = AESCryptor()
                row_h = aes_crypto.decode(row_h)
            h_data.iloc[line + 4, row + 1] = row_h
    return h_data


def service(s_data):
    service_instance = Service.objects.all().values_list("ip", "service__app_name",
                                                         "vip", "service_role",
                                                         "deploy_mode")
    host_dc = dict(Host.objects.all().values_list("ip", "instance_name"))

    for line, line_s in enumerate(service_instance):
        row_add = 1
        for row, row_s in enumerate(line_s):
            if row == 0:
                row_s = host_dc[row_s]
            if row > 1:
                row_add = 2
            s_data.iloc[line + 3, row + row_add] = row_s
    return s_data


def run(file_path):
    excel_file = pd.ExcelFile(file_path)
    sheet_names = excel_file.sheet_names

    with pd.ExcelWriter('deployment-new.xlsx') as writer:
        for sheet in sheet_names:
            data = pd.read_excel(excel_file, sheet_name=sheet)
            if sheet == "节点信息":
                data = host(data)
            else:
                data = service(data)
            data.to_excel(writer, sheet_name=sheet, index=False)


if __name__ == '__main__':
    excel_path = os.path.join(PROJECT_DIR, 'package_hub/template/deployment-new.xlsx')
    run(excel_path)
