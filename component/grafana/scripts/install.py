# -*- coding: utf-8 -*-
import argparse
import logging
import os

import yaml

SERVICE_NAME = 'grafana'

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
omp_grafana_log_path = os.path.join(omp_path, 'logs', SERVICE_NAME)
if not os.path.exists(omp_grafana_log_path):
    os.makedirs(omp_grafana_log_path)


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

    # 修改 conf/defaults.ini
    cdi_file = os.path.join(app_path, 'conf', 'defaults.ini')
    CW_GRAFANA_PORT = omp_config_obj.get('monitor_port').get('grafana')
    cdi_placeholder_script = [
        {'CW-HTTP-PORT': CW_GRAFANA_PORT},
        {'OMP_GRAFANA_LOG_PATH': omp_grafana_log_path},
    ]
    replace_placeholder(cdi_file, cdi_placeholder_script)

    # 修改 scripts/grafana
    sa_placeholder_script = [
        {'OMP_GRAFANA_LOG_PATH': omp_grafana_log_path},
    ]
    sa_file = os.path.join(app_path, 'scripts', 'grafana')
    replace_placeholder(sa_file, sa_placeholder_script)


if __name__ == '__main__':
    config_update()
