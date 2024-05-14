# -*- coding: utf-8 -*-
import argparse
import os
import logging
import yaml


SERVICE_NAME = 'prometheus'

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

if not omp_config_obj.get('monitor_data_path'):
    ct_logging.error('获取监控数据目录失败，程序即将退出！')
    omp_prometheus_data_path = '/tmp'
    exit(-1)
elif omp_config_obj.get('monitor_data_path') == 'default':
    omp_prometheus_data_path = os.path.join(omp_path, 'data/prometheus')
else:
    omp_prometheus_data_path = omp_config_obj.get('monitor_data_path')
omp_prometheus_log_path = os.path.join(omp_path, 'logs', 'prometheus')

# 创建prometheus所用到的目录
if not os.path.exists(omp_prometheus_data_path):
    os.makedirs(omp_prometheus_data_path)
if not os.path.exists(omp_prometheus_log_path):
    os.makedirs(omp_prometheus_log_path)


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

    # 修改 conf/prometheus.yml
    CW_PROMETHEUS_PORT = omp_config_obj.get('monitor_port').get('prometheus')
    CW_ALERTMANAGER_PORT = omp_config_obj.get('monitor_port').get('alertmanager')
    prometheus_yml_file = os.path.join(app_path, 'conf', 'prometheus.yml')

    cpy_placeholder_script = [
        {'CW_PROMETHEUS_PORT': CW_PROMETHEUS_PORT},
        {'CW_ALERTMANAGER_PORT': CW_ALERTMANAGER_PORT},
    ]
    replace_placeholder(prometheus_yml_file, cpy_placeholder_script)

    # 修改 scripts/prometheus
    sp_placeholder_script = [
        {'OMP_PROMETHEUS_DATA_PATH': omp_prometheus_data_path},
        {'OMP_PROMETHEUS_LOG_PATH': omp_prometheus_log_path},
        {'CW_PROMETHEUS_PORT': CW_PROMETHEUS_PORT}
    ]
    sl_file = os.path.join(app_path, 'scripts', 'prometheus')
    replace_placeholder(sl_file, sp_placeholder_script)


if __name__ == '__main__':
    config_update()
