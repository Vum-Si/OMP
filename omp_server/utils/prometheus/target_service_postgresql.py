# !/usr/bin/python3
# -*-coding:utf-8-*-
# Author: lingyang guo
# CreateDate: 2021/12/15 8:00 下午
# Description:
from utils.plugin.salt_client import SaltClient
from utils.prometheus.prometheus import Prometheus


class ServicePostgresqlCrawl(Prometheus):
    """
    查询 prometheus postgresql 指标
    """

    def __init__(self, env, instance):
        self.ret = {}
        self.basic = []
        self.env = env  # 环境
        self.instance = instance  # 主机ip
        self._obj = SaltClient()
        self.metric_num = 16
        self.service_name = "postgreSql"
        Prometheus.__init__(self)

    def service_status(self):
        """运行状态"""
        expr = f"probe_success{{env='{self.env}', instance='{self.instance}', " \
               f"app='{self.service_name}'}}"
        self.ret['service_status'] = self.unified_job(*self.query(expr))

    def run_time(self):
        """postgresql 运行时间"""
        expr = f"process_uptime_seconds{{env='{self.env}', instance='{self.instance}', app='{self.service_name}'}}"
        _ = self.unified_job(*self.query(expr))
        _ = float(_) if _ else 0
        minutes, seconds = divmod(_, 60)
        hours, minutes = divmod(minutes, 60)
        days, hours = divmod(hours, 24)
        if int(days) > 0:
            self.ret['run_time'] = \
                f"{int(days)}天{int(hours)}小时{int(minutes)}分钟{int(seconds)}秒"
        elif int(hours) > 0:
            self.ret['run_time'] = \
                f"{int(hours)}小时{int(minutes)}分钟{int(seconds)}秒"
        else:
            self.ret['run_time'] = f"{int(minutes)}分钟{int(seconds)}秒"

    def cpu_usage(self):
        """postgresql cpu使用率"""
        expr = f"service_process_cpu_percent{{instance='{self.instance}',app='{self.service_name}'}}"
        val = self.unified_job(*self.query(expr))
        val = round(float(val), 4) if val else '-'
        self.ret['cpu_usage'] = f"{val}%"

    def mem_usage(self):
        """postgresql 内存使用率"""
        expr = f"service_process_memory_percent{{instance='{self.instance}',app='{self.service_name}'}}"
        val = self.unified_job(*self.query(expr))
        val = round(float(val), 4) if val else '-'
        self.ret['mem_usage'] = f"{val}%"

    def current_fetch_data(self):
        expr = f"SUM(pg_db_tup_fetched{{env='{self.env}',instance='{self.instance}',app='{self.service_name}'}})"
        val = self.unified_job(*self.query(expr))
        val = val if val else 0
        self.ret["current_fetch_data"] = val
        self.basic.append({
            "name": "current_fetch_data",
            "name_cn": "当前fetch数据",
            "value": val
        })

    def current_insert_data(self):
        expr = f"SUM(pg_db_tup_inserted{{env='{self.env}',instance='{self.instance}',app='{self.service_name}'}})"
        val = self.unified_job(*self.query(expr))
        val = val if val else 0
        self.ret["current_insert_data"] = val
        self.basic.append({
            "name": "current_insert_data",
            "name_cn": "当前insert数据",
            "value": val
        })

    def current_update_data(self):
        expr = f"SUM(pg_db_tup_updated{{env='{self.env}',instance='{self.instance}',app='{self.service_name}'}})"
        val = self.unified_job(*self.query(expr))
        val = val if val else 0
        self.ret["current_update_data"] = val
        self.basic.append({
            "name": "current_update_data",
            "name_cn": "当前update数据",
            "value": val
        })

    def max_connections(self):
        expr = f"pg_setting_max_connections{{env='{self.env}',instance='{self.instance}',app='{self.service_name}'}}"
        val = self.unified_job(*self.query(expr))
        val = val if val else 0
        self.ret["max_connections"] = val
        self.basic.append({
            "name": "max_connections",
            "name_cn": "最大连接数",
            "value": val
        })

    def open_file_descriptors(self):
        expr = f"process_open_fds{{env='{self.env}',instance='{self.instance}',app='{self.service_name}'}}"
        val = self.unified_job(*self.query(expr))
        val = val if val else 0
        self.ret["open_file_descriptors"] = val
        self.basic.append({
            "name": "open_file_descriptors",
            "name_cn": "打开文件描述符数",
            "value": val
        })

    def max_worker_processes(self):
        expr = f"pg_setting_max_worker_processes{{env='{self.env}',instance='{self.instance}',app='{self.service_name}'}}"
        val = self.unified_job(*self.query(expr))
        val = val if val else 0
        self.ret["max_worker_processes"] = val
        self.basic.append({
            "name": "max_worker_processes",
            "name_cn": "最大进程worker数",
            "value": val
        })

    def pg_setting_block_size(self):
        expr = f"pg_setting_block_size{{env='{self.env}',instance='{self.instance}',app='{self.service_name}'}}"
        val = self.unified_job(*self.query(expr))
        val = val if val else 0
        self.ret["pg_setting_block_size"] = val
        self.basic.append({
            "name": "pg_setting_block_size",
            "name_cn": "pg_setting_block_size",
            "value": val
        })

    def run(self):
        """统一执行实例方法"""
        target = ['service_status', 'run_time', 'cpu_usage', 'mem_usage', 'current_fetch_data',
                  'current_insert_data', 'current_update_data', 'max_connections',
                  'open_file_descriptors',
                  'max_worker_processes', 'pg_setting_block_size']
        for t in target:
            if getattr(self, t):
                getattr(self, t)()
