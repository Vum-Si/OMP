# -*- coding: utf-8 -*-
import argparse
import logging
import os
import subprocess
import time

SERVICE_NAME = 'grafana'

parser = argparse.ArgumentParser(usage="it's usage tip.", description="help info.")
parser.add_argument("--config-dir", default="/data/omp/omp_monitor/conf", dest="config_dir",
                    help="the config dir of omp_monitor")
args = parser.parse_args()


def custom_logging():
    log_format = '%(asctime)s %(filename)s[line:%(lineno)d] %(levelname)s %(message)s'
    logging.basicConfig(level=logging.INFO,
                        format=log_format,
                        filename=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'log',
                                              os.path.basename(os.path.abspath(__file__))[:-2] + "log")
                        )
    # 定义一个StreamHandler，将INFO级别或更高的日志信息打印到标准错误，并将其添加到当前的日志处理对象#
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    formatter = logging.Formatter(log_format)
    console.setFormatter(formatter)
    logging.getLogger('').addHandler(console)
    return logging


ct_logging = custom_logging()


def run_shell(cmd):
    """
    执行shell命令
    :param cmd: shell命令
    :return: 执行结果
    """
    p = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
    )
    stdout, stderr = p.communicate()
    if p.returncode != 0:
        ct_logging.error("{}\ncmd: {}".format(stderr.strip(), cmd))
        exit(-1)
    else:
        return stdout.strip()


def get_service_port(service_name, service_port_config_file):
    """
    获取服务对应的exporter端口
    :param service_name:服务名
    :param service_port_config_file:服务exporter对应端口配置文件
    :return:
    """
    if not os.path.exists(service_port_config_file):
        ct_logging.error('文件{}不存在！'.format(service_port_config_file))
        exit(-1)
    with open(service_port_config_file, 'r') as f:
        lines = f.readlines()
    if not lines:
        ct_logging.error('获取服务端口配置文件失败，请纠正后再试！')
        exit(-1)
    service_name_dict = dict()
    for line in lines:
        if line.startswith(';'):
            continue
        line = line.strip()
        if not line:
            continue
        service_name_dict[line.split('=')[0]] = line.split('=')[1]

    try:
        return service_name_dict[service_name]
    except KeyError as gsp_e:
        ct_logging.error(gsp_e)
        exit(-1)


def get_basic_config(basic_config_name, basic_config_file):
    """
    获取自监控的基础配置
    :param basic_config_file: 基础配置文件名
    :param basic_config_name: 基础配置键
    :return:
    """
    current_dir = os.path.split(os.path.abspath(__file__))[0]
    # basic_config_file = os.path.join(current_dir, '..', 'conf', 'config.ini')

    if not os.path.exists(basic_config_file):
        ct_logging.error('文件{}不存在！'.format(basic_config_file))
        exit(-1)
    with open(basic_config_file, 'r') as f:
        lines = f.readlines()
    if not lines:
        ct_logging.error('获取基础配置失败，请纠正后再试！')
        exit(-1)
    basic_config_dict = dict()
    for line in lines:
        if line.startswith(';'):
            continue
        line = line.strip()
        if not line:
            continue
        basic_config_dict[line.split('=')[0]] = (line.split('=')[1]).replace('"', '')

    try:
        return basic_config_dict[basic_config_name]
    except KeyError as gbc_e:
        ct_logging.error(gbc_e)
        exit(-1)


if __name__ == '__main__':
    bcf = os.path.join(args.config_dir, 'config.ini')
    spcf = os.path.join(args.config_dir, 'promemonitor_port.ini')
    CW_INSTALL_APP_DIR = get_basic_config("CW_INSTALL_APP_DIR", basic_config_file=bcf)
    CW_INSTALL_DATA_DIR = get_basic_config("CW_INSTALL_DATA_DIR", basic_config_file=bcf)
    CW_INSTALL_LOGS_DIR = get_basic_config("CW_INSTALL_LOGS_DIR", basic_config_file=bcf)
    app_path = os.path.join(CW_INSTALL_APP_DIR, 'monitor_server', SERVICE_NAME)
    ct_logging.info('grafana 数据导入中')
    run_shell('bash {}/monitor_server/grafana/scripts/grafana start >/dev/null'.format(CW_INSTALL_APP_DIR))
    time.sleep(20)
    run_shell('bash {}/monitor_server/grafana/scripts/grafana stop >/dev/null'.format(CW_INSTALL_APP_DIR))
    time.sleep(20)
    run_shell('sqlite3 {}/grafana/grafana.db ".read {}/monitor_server/grafana/sql/1_user.sql" > /dev/null'.format(
        CW_INSTALL_DATA_DIR, CW_INSTALL_APP_DIR))
    time.sleep(10)
    run_shell(
        'sqlite3 {}/grafana/grafana.db ".read {}/monitor_server/grafana/sql/2_data_source.sql" > /dev/null'.format(
            CW_INSTALL_DATA_DIR, CW_INSTALL_APP_DIR))
    time.sleep(10)
    run_shell('sqlite3 {}/grafana/grafana.db ".read {}/monitor_server/grafana/sql/3_dashboard.sql" > /dev/null'.format(
        CW_INSTALL_DATA_DIR, CW_INSTALL_APP_DIR))
    time.sleep(10)
    run_shell('sqlite3 {}/grafana/grafana.db ".read {}/monitor_server/grafana/sql/4_star.sql" > /dev/null'.format(
        CW_INSTALL_DATA_DIR, CW_INSTALL_APP_DIR))
    time.sleep(10)
    run_shell(
        'sqlite3 {}/grafana/grafana.db ".read {}/monitor_server/grafana/sql/5_preferences.sql" > /dev/null'.format(
            CW_INSTALL_DATA_DIR, CW_INSTALL_APP_DIR))
    time.sleep(10)
    run_shell('sqlite3 {}/grafana/grafana.db ".read {}/monitor_server/grafana/sql/6_org_user.sql" > /dev/null'.format(
        CW_INSTALL_DATA_DIR, CW_INSTALL_APP_DIR))
    time.sleep(20)
    ct_logging.info('grafana 数据导入完成')
    run_shell('bash {}/monitor_server/grafana/scripts/grafana start >/dev/null'.format(CW_INSTALL_APP_DIR))
