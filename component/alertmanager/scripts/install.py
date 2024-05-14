# -*- coding: utf-8 -*-
import argparse
import logging
import os

import yaml

SERVICE_NAME = 'alertmanager'

parser = argparse.ArgumentParser(usage="it's usage tip.", description="help info.")
parser.add_argument("--omp-config-file", default="/data/omp/config/omp.yaml", dest="omp_config_file",
                    help="the config file of omp")
args = parser.parse_args()
omp_config_file_path = args.omp_config_file
current_dir = os.path.dirname(os.path.abspath(__file__))
app_path = os.path.dirname(current_dir)
omp_path = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../..'))


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


def get_omp_config_dict():
    """获取配置文件信息"""
    with open(omp_config_file_path, "r", encoding="utf8") as fp:
        return yaml.load(fp, Loader=yaml.FullLoader)


# omp配置文件对象
omp_config_obj = get_omp_config_dict()

# 创建应用所需目录
omp_alertmanager_log_path = os.path.join(omp_path, 'logs', SERVICE_NAME)
if not os.path.exists(omp_alertmanager_log_path):
    os.makedirs(omp_alertmanager_log_path)


def set_alertmanager_email():
    """
    根据omp.yml决定是否配置邮箱告警
    :return:
    """
    email_open = omp_config_obj.get('alert_manager').get('send_email')
    if not email_open:
        return None
    alertmanager_conf_file = os.path.join(app_path, 'conf', 'alertmanager.yml')
    with open(alertmanager_conf_file, "r", encoding="utf8") as fp:
        alertmanager_conf_content = yaml.load(fp, Loader=yaml.FullLoader)
    receivers = alertmanager_conf_content['receivers']
    print(receivers)
    if not receivers[0].get("email_configs"):
        # 初次安装
        receivers[0]['email_configs'] = [{'send_resolved': True, 'to': '${EMAIL_ADDRESS}'}]
    else:
        # 二次执行安装
        receivers[0]['email_configs'] = [{'send_resolved': True, 'to': '${EMAIL_ADDRESS}'}]
    with open(alertmanager_conf_file, 'w', encoding='utf8') as fw:
        yaml.dump(alertmanager_conf_content, fw, Dumper=yaml.SafeDumper)


def replace_placeholder(path, placeholder_list):
    """配置文件占位符替换
    参数: path 要替换的文件路径, 占位符字典列表 [{"key":"value"}]
    """
    if not os.path.isfile(path):
        ct_logging.error("No such file {}".format(path))
    with open(path, "r") as f:
        data = f.read()
        for item in placeholder_list:
            for k, v in item.items():
                placeholder = "${{{}}}".format(k)
                data = data.replace(placeholder, str(v))
    with open(path, "w") as f:
        f.write(data)


def config_update():
    """
    更新当前服务需要更改的配置
    :return:
    """

    # 修改 conf/alertmanager.yml
    EMAIL_SEND = omp_config_obj.get('alert_manager').get('EMAIL_SEND')
    SMTP_SMARTHOST = omp_config_obj.get('alert_manager').get('SMTP_SMARTHOST')
    EMAIL_SEND_USER = omp_config_obj.get('alert_manager').get('EMAIL_SEND_USER')
    EMAIL_SEND_PASSWORD = omp_config_obj.get('alert_manager').get('EMAIL_SEND_PASSWORD')
    SMTP_HELLO = omp_config_obj.get('alert_manager').get('SMTP_HELLO')
    EMAIL_ADDRESS = omp_config_obj.get('alert_manager').get('EMAIL_ADDRESS')
    RECEIVER = omp_config_obj.get('alert_manager').get('RECEIVER')
    EMAIL_SEND_INTERVAL = omp_config_obj.get('alert_manager').get('EMAIL_SEND_INTERVAL')
    WEBHOOK_URL = omp_config_obj.get('alert_manager').get('WEBHOOK_URL')

    alertmanager_yml_file = os.path.join(app_path, 'conf', 'alertmanager.yml')

    cay_placeholder_script = [
        {'EMAIL_SEND': EMAIL_SEND},
        {'SMTP_SMARTHOST': SMTP_SMARTHOST},
        {'EMAIL_SEND_USER': EMAIL_SEND_USER},
        {'EMAIL_SEND_PASSWORD': EMAIL_SEND_PASSWORD},
        {'SMTP_HELLO': SMTP_HELLO},
        {'EMAIL_ADDRESS': EMAIL_ADDRESS},
        {'RECEIVER': RECEIVER},
        {'EMAIL_SEND_INTERVAL': EMAIL_SEND_INTERVAL},
        {'WEBHOOK_URL': WEBHOOK_URL}
    ]
    replace_placeholder(alertmanager_yml_file, cay_placeholder_script)

    # 修改 scripts/alertmanager
    CW_ALERTMANAGER_PORT = omp_config_obj.get('monitor_port').get('alertmanager')
    sa_placeholder_script = [
        {'OMP_ALERTMANAGER_LOG_PATH': omp_alertmanager_log_path},
        {'CW_ALERTMANAGER_PORT': CW_ALERTMANAGER_PORT}
    ]
    sa_file = os.path.join(app_path, 'scripts', 'alertmanager')
    replace_placeholder(sa_file, sa_placeholder_script)


if __name__ == '__main__':
    set_alertmanager_email()
    config_update()
