# -*- coding:utf-8 -*-
# Project: monitor_unmanaged

import os
import sys
from ruamel import yaml as r_yaml
import yaml
import logging
import json
import django

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
sys.path.append(os.path.join(PROJECT_DIR, 'omp_server'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", 'omp_server.settings')
django.setup()

config_file_path = os.path.join(PROJECT_DIR, 'config/monitor_unmanaged.yaml')
logger = logging.getLogger("server")

from promemonitor.prometheus_utils import PrometheusUtils
from concurrent.futures import (ThreadPoolExecutor, as_completed)
from utils.parse_config import THREAD_POOL_MAX_WORKERS


class PrometheusUnmanaged(PrometheusUtils):
    """监控非纳管服务类"""
    """
    services_data = [{
        "service_name":"redis",
        "instance_name":"redis_dosm",
        "data_path":"\/data\/appData\/redis",
        "log_path":"\/data\/logs\/redis",
        "env":"default",
        "ip":"127.0.0.1",
        "listen_port":18130,
        "metric_port":18130,
        "only_process":false,
        "process_key_word":"",
        "username":"redis",
        "password":"Yzh@redis_123"
    }]
    """

    def __init__(self):
        super(PrometheusUnmanaged, self).__init__()
        # self.flag = True

    def load_and_check_data(self, action='add'):
        """数据校验"""
        new_sevices_data = list()
        with open(config_file_path, "r") as f:
            services_data = r_yaml.load(f, Loader=r_yaml.SafeLoader)
        if not services_data:
            print(f"请正确填写")
        services_data = services_data.get(action, [])
        for service_d in services_data:
            if service_d.get("metric_port", "") or service_d.get("process_key_word", ""):
                new_sevices_data.append(service_d)
        logger.info(f"本次校验完成的数据new_sevices_data为：{new_sevices_data}")
        return new_sevices_data

    def unmanaged_write_prometheus_conf(self, services_data):
        """监控数据写入prometheus配置文件"""
        # 1.写入prometheus.yml
        pro_job_list = list()
        for service_d in services_data:
            ser_name = service_d.get("service_name", "")
            job_name_str = "{}Exporter".format(ser_name)
            if ser_name.lower() == "flink":
                ser_name = "pushgateway"
            prom_job_dict = {
                "job_name": job_name_str,
                "metrics_path": f"/metrics/monitor/{ser_name}",
                "file_sd_configs": [
                    {
                        "refresh_interval": "30s",
                        "files": [
                            f"targets/{ser_name}Exporter_all.json"
                        ]
                    }
                ]
            }
            pro_job_list.append(prom_job_dict)
        print(f"self.prometheus_conf_path=={self.prometheus_conf_path}")
        with open(self.prometheus_conf_path, "r") as f:
            content = r_yaml.load(f.read(), Loader=r_yaml.SafeLoader)
            print(f"content=={content}")
        try:
            content_list = content.get("scrape_configs")
        except Exception as e:
            logger.error(e)
            logger.error(f"获取{self.prometheus_conf_path}配置内容失败，具体为：{content}")
            return False, "get content from prometheus.yml failed!"
        content_list.extend(pro_job_list)
        content_list = self.json_distinct(content_list)
        content["scrape_configs"] = content_list
        with open(self.prometheus_conf_path, "w", encoding="utf8") as f:
            yaml.dump(data=content, stream=f, allow_unicode=True, sort_keys=False)
        logger.info(f"本次成功写入prometheus.yml，pro_dict数量: {len(content_list)}, 具体为：{content_list}")

        # 2.targets/myslqExporter_all.json
        service_name_set = set([i.get("service_name") for i in services_data])
        for service_n in service_name_set:
            self_exporter_target_file = os.path.join(self.prometheus_targets_path,
                                                     "{}Exporter_all.json".format(service_n))
            tmp_list = list()
            for service_d in services_data:
                if service_d.get("service_name").lower() == "flink":
                    continue
                if service_d.get("service_name") == service_n:
                    target_ele = {
                        "labels": {
                            "instance": "{}".format(service_d["ip"]),
                            "instance_name": "{}".format(service_d.get("instance_name")),
                            "service_type": "service",
                            "env": "default",
                            "cluster": "{}".format(service_d.get("cluster", ""))
                        },
                        "targets": [
                            "{}:{}".format(service_d["ip"], self.monitor_port)
                        ]
                    }
                    tmp_list.append(target_ele)
            if os.path.exists(self_exporter_target_file):
                with open(self_exporter_target_file, 'r') as f:
                    content = f.read()
                    if content:
                        old_self_target_list = json.loads(content)
                        tmp_list.extend(old_self_target_list)
            tmp_list = self.json_distinct(tmp_list)
            with open(self_exporter_target_file, 'w') as f2:
                json.dump(tmp_list, f2, ensure_ascii=False, indent=4)
            logger.info(f"写入: {self_exporter_target_file}, 内容为：{tmp_list}")

        # 4.向omp_monitor发送数据,更新配置
        error_message = ''
        with ThreadPoolExecutor(THREAD_POOL_MAX_WORKERS) as executor:
            _future_list = list()
            for service_d in services_data:
                if service_d.get("service_name").lower() == "flink":
                    continue
                _future_obj = executor.submit(self.update_agent_service, *(service_d.get('ip'), 'add', [service_d]))
                _future_list.append(_future_obj)
            for future in as_completed(_future_list):
                future.result()

    def unmanaged_add_prometheus(self, action):
        """添加未监控服务至prometheus"""
        services_data = self.load_and_check_data(action=action)
        self.unmanaged_write_prometheus_conf(services_data)
        self.reload_prometheus()
        logger.info("Add Prometheus End")

    def unmanaged_del_prometheus(self, action):
        """从prometheus删除未监控服务"""
        services_data = self.load_and_check_data(action)
        with ThreadPoolExecutor(THREAD_POOL_MAX_WORKERS) as executor:
            _future_list = list()
            for service_d in services_data:
                _future_obj = executor.submit(self.delete_service, service_d)
                _future_list.append(_future_obj)
            for future in as_completed(_future_list):
                future.result()


if __name__ == '__main__':
    sys_args = sys.argv[1:]
    if len(sys_args) != 1:
        print("Please use: python monitor_unmanaged.py add|del")
    action = sys_args[0]
    if action == 'add':
        PrometheusUnmanaged().unmanaged_add_prometheus(action='add')
    elif action == "del":
        PrometheusUnmanaged().unmanaged_del_prometheus(action="del")
    else:
        print("Please use action add|del")

