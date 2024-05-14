# -*- coding: utf-8 -*-
# Project: update_data
# Author: jon.liu@yunzhihui.com
# Create time: 2021-09-18 10:36
# IDE: PyCharm
# Version: 1.0
# Introduction:

import os
import sys
import hashlib
from ruamel.yaml import YAML

import django

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
CONFIG_PATH = os.path.join(PROJECT_DIR, "config/omp.yaml")
PYTHON_PATH = os.path.join(PROJECT_DIR, "component/env/bin/python3")
MANAGE_PATH = os.path.join(PROJECT_DIR, "omp_server/manage.py")
sys.path.append(os.path.join(PROJECT_DIR, "omp_server"))

# 加载Django环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omp_server.settings")
django.setup()

from db_models.models import UserProfile
from db_models.models import MonitorUrl
from utils.parse_config import MONITOR_PORT, CLEAR_DB
from db_models.models import Env, AlertRule, \
    Rule, \
    BackupHistory, BackupCustom, \
    DetailInstallHistory, Host, \
    Service, SelfHealingSetting, AlertSettings
from utils.plugin.crontab_utils import change_task
from utils.plugin.synch_grafana import synch_grafana_info


def create_default_user():
    """
    创建基础用户
    :return:
    """
    username = "admin"
    password = "Yunweiguanli@OMP_123"
    if UserProfile.objects.filter(username=username).count() != 0:
        return
    UserProfile.objects.create_superuser(
        username=username,
        password=password,
        email="omp@cloudwise.com",
        role="SuperUser"
    )
    read_only_username = "omp"
    read_only_password = "Yunweiguanli@OMP_123"
    if UserProfile.objects.filter(username=read_only_username).count() != 0:
        return
    UserProfile.objects.create_user(
        username=read_only_username,
        password=read_only_password,
        email="omp@cloudwise.com",
        role="ReadOnlyUser"
    )


def create_default_monitor_url():
    """
    配置监控地址初始入库
    :return:
    """
    if MonitorUrl.objects.all().count() != 0:
        return
    monitor_list = []
    with open(CONFIG_PATH, "r", encoding="utf8") as fp:
        content = fp.read()
    config_yaml = YAML()
    conf = config_yaml.load(content)
    local_ip = conf["local_ip"]
    local_ip = local_ip+":"
    monitor_list.append(
        MonitorUrl(id="1", name="prometheus", monitor_url=local_ip + str(
            MONITOR_PORT.get("prometheus", "19011"))))
    monitor_list.append(
        MonitorUrl(id="2", name="alertmanager", monitor_url=local_ip + str(
            MONITOR_PORT.get("alertmanager", "19013"))))
    monitor_list.append(MonitorUrl(
        id="3", name="grafana",
        monitor_url=local_ip + str(MONITOR_PORT.get("grafana", "19014"))))
    MonitorUrl.objects.bulk_create(monitor_list)


def create_default_env():
    """
    创建默认环境
    :return:
    """
    env_name = "default"
    if Env.objects.filter(name=env_name).count() != 0:
        return
    Env(name=env_name).save()


def get_hash_value(expr, severity):
    data = expr + severity
    hash_data = hashlib.md5(data.encode(encoding='UTF-8')).hexdigest()
    return hash_data


def create_threshold():
    """
    为告警添加默认的告警阈值规则
    :return:
    - alert: exporter 异常
    annotations:
      consignee: omp@cloudwise.com
      description: 主机 {{ $labels.instance }} 中的 {{ $labels.app }}_exporter 已经down掉超过一分钟.
      summary: exporter status(instance {{ $labels.instance }})
    expr: exporter_status{env="default"} == 0
    for: 1m
    labels:
      severity: critical
    """
    builtins_rules = [
        {
            "alert": "主机 CPU 使用率过高",
            "description": '主机 {{ $labels.instance }} CPU 使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": '(100 - sum(avg without (cpu)(irate('
                    'node_cpu_seconds_total{mode="idle", env="default"}['
                    '2m])))by (instance,job,env) * 100)',
            "summary": "-",
            "compare_str": ">=",
            "threshold_value": 90,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "job": "nodeExporter",
                "severity": "critical"
            },
            "name": "CPU使用率",
            "quota_type": 0,
            "status": 1,
            "service": "node",
            "forbidden": 2

        },
        {
            "alert": "主机 CPU 使用率过高",
            "description": '主机 {{ $labels.instance }} CPU 使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": '(100 - sum(avg without (cpu)(irate('
                    'node_cpu_seconds_total{mode="idle", env="default"}['
                    '2m])))by (instance,job,env) * 100)',
            "compare_str": ">=",
            "summary": "-",
            "threshold_value": 80,
            "for_time": "60s",
            "severity": "warning",
            "labels": {
                "job": "nodeExporter",
                "severity": "warning"
            },
            "name": "CPU使用率",
            "quota_type": 0,
            "status": 1,
            "service": "node",
            "forbidden": 2
        },
        {
            "alert": "主机 内存 使用率过高",
            "description": '主机 {{ $labels.instance }} 内存使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": '(1 - (node_memory_MemAvailable_bytes{env="default"} / (node_memory_MemTotal_bytes{env="default"})))* 100',
            "summary": "-",
            "compare_str": ">=",
            "threshold_value": 90,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "job": "nodeExporter",
                "severity": "critical"
            },
            "name": "内存使用率",
            "quota_type": 0,
            "status": 1,
            "service": "node",
            "forbidden": 2
        },
        {
            "alert": "主机 内存 使用率过高",
            "description": '主机 {{ $labels.instance }} 内存使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": '(1 - (node_memory_MemAvailable_bytes{env="default"} / (node_memory_MemTotal_bytes{env="default"})))* 100',
            "summary": "-",
            "compare_str": ">=",
            "threshold_value": 80,
            "for_time": "60s",
            "severity": "warning",
            "labels": {
                "job": "nodeExporter",
                "severity": "warning"
            },
            "name": "内存使用率",
            "quota_type": 0,
            "status": 1,
            "service": "node",
            "forbidden": 2
        },
        {
            "alert": "主机 根分区磁盘 使用率过高",
            "description": '主机 {{ $labels.instance }} 根分区使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": 'max((node_filesystem_size_bytes{env="default",'
                    'mountpoint="/"}-node_filesystem_free_bytes{'
                    'env="default",mountpoint="/"})*100/('
                    'node_filesystem_avail_bytes{env="default",'
                    'mountpoint="/"}+(node_filesystem_size_bytes{'
                    'env="default",'
                    'mountpoint="/"}-node_filesystem_free_bytes{'
                    'env="default",mountpoint="/"})))by(instance,job,env)',
            "summary": "-",
            "compare_str": ">=",
            "threshold_value": 90,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "job": "nodeExporter",
                "severity": "critical"
            },
            "name": "根分区使用率",
            "quota_type": 0,
            "status": 1,
            "service": "node",
            "forbidden": 2
        },
        {
            "alert": "主机 根分区磁盘 使用率过高",
            "description": '主机 {{ $labels.instance }} 根分区使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": 'max((node_filesystem_size_bytes{env="default",'
                    'mountpoint="/"}-node_filesystem_free_bytes{'
                    'env="default",mountpoint="/"})*100/('
                    'node_filesystem_avail_bytes{env="default",'
                    'mountpoint="/"}+(node_filesystem_size_bytes{'
                    'env="default",'
                    'mountpoint="/"}-node_filesystem_free_bytes{'
                    'env="default",mountpoint="/"})))by(instance,job,env)',
            "summary": "-",
            "compare_str": ">=",
            "threshold_value": 80,
            "for_time": "60s",
            "severity": "warning",
            "labels": {
                "job": "nodeExporter",
                "severity": "warning"
            },
            "name": "根分区使用率",
            "quota_type": 0,
            "status": 1,
            "service": "node",
            "forbidden": 2
        },
        {
            "alert": "kafka消费组堆积数过多",
            "description": 'Kafka 消费组{{ $labels.consumergroup }}消息堆积数过多 大于 {{ '
                           'humanize $value}} 大于阈值 1200000',
            "expr": 'sum(kafka_consumergroup_lag{env="default"}) by ('
                    'consumergroup,instance,job,env)',
            "summary": "-",
            "compare_str": ">=",
            "threshold_value": 1200000,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "job": "kafkaExporter",
                "severity": "critical"
            },
            "name": "消费组堆积消息",
            "quota_type": 0,
            "status": 1,
            "service": "kafka",
            "forbidden": 1
        },
        {
            "alert": "exporter 异常",
            "description": '主机 {{ $labels.instance }} 中的 {{ $labels.app }}_exporter 已经down掉超过一分钟',
            "expr": 'exporter_status{env="default"}',
            "summary": "-",
            "compare_str": "==",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "job": "nodeExporter",
                "severity": "critical"
            },
            "name": "exporter异常",
            "quota_type": 0,
            "status": 1,
            "service": "node",
            "forbidden": 2
        },
        {
            "alert": "服务存活状态",
            "description": '主机 {{ $labels.instance }} 中的 服务 {{ $labels.app }} been down for more than a minute',
            "expr": 'probe_success{env="default"}',
            "summary": "-",
            "compare_str": "==",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "服务状态",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 2
        },
        {
            "alert": "jvm 文件句柄使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} jvm 文件句柄使用率是{{ $value | '
                           'humanize }}%， 大于阈值 80%',
            "expr": '(process_files_open_files)*100/process_files_max_files',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 80,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "jvm 文件句柄使用率",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "heap使用率过高，可能导致oom",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,heap内存使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 85%',
            "expr": 'sum(jvm_memory_used_bytes{area=~"heap"}) by (env, instance, instance_name,job)/sum(jvm_memory_max_bytes{area=~"heap"}) by (env, instance, instance_name, job) * 100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 85,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "heap使用率",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "gc后老年代所占内存比例过高，可能导致oom",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,gc后老年代所占内存比例为 {{ $value | '
                           'humanize }}%, 大于阈值 85%',
            "expr": 'sum(jvm_gc_live_data_size_bytes) by (env, instance, instance_name, job)/sum(jvm_gc_max_data_size_bytes) by (env, instance, instance_name, job) * 100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 85,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "gc后老年代所占内存率",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "mysql连接使用率太高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,mysql连接使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": 'max_over_time(mysql_global_status_threads_connected[1m]) / mysql_global_variables_max_connections * 100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 80,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "连接使用率太高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "mysql新增过多慢查询",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,2m新增慢查询数量为 {{ $value | '
                           'humanize }}%, 大于阈值 5%',
            "expr": 'increase(mysql_global_status_slow_queries[2m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 5,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "mysql新增过多慢查询",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "mysql连接错误数过多",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,2m连接错误增长为 {{ $value | '
                           'humanize }}%, 大于阈值 20%',
            "expr": 'rate(mysql_global_status_connection_errors_total[2m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 20,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "mysql连接错误数过多",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "mysql死锁数量增长过多",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,1m死锁数量增长为 {{ $value | '
                           'humanize }}%, 大于阈值 5%',
            "expr": 'rate(mysql_global_variables_innodb_print_all_deadlocks[1m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 5,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "mysql死锁数量增长过多",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "mysql集群从节点sql未运行",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,从节点sql未运行为 {{ $value | '
                           'humanize }} 等于阈值 0',
            "expr": '( mysql_slave_status_slave_sql_running and ON (instance) mysql_slave_status_master_server_id > 0)',
            "summary": "-",
            "compare_str": "==",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "mysql从节点sql未运行",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "redis集群缺少master",
            "description": 'redis集群 {{ $labels.cluster }} ,缺少master为 {{ $value | '
                           'humanize }}, 小于阈值 1',
            "expr": 'sum(redis_instance_info{role="master"}) by (env, cluster, job, instance) ',
            "summary": "-",
            "compare_str": "<",
            "threshold_value": 1,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "redis集群缺少master",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "redis连接率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,redis连接率为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": 'redis_connected_clients / redis_config_maxclients * 100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 90,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "redis连接率过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "redis连接拒绝数过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,redis连接拒绝数为 {{ $value | '
                           'humanize }}, 大于阈值 5',
            "expr": 'rate(redis_rejected_connections_total[1m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 5,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "redis连接拒绝数",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "redis实例36小时内未备份",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,redis实例未备份时间为 {{ $value | '
                           'humanize }}%, 大于阈值 36小时',
            "expr": 'time() - redis_rdb_last_save_timestamp_seconds',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 60 * 60 * 36,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "redis实例36小时内未备份",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "redis从节点与主节点1min内重新连接",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,redis集群{{ $labels.cluster }}  1min内从节点失去与主节点重新连接 {{ $value | '
                           'humanize }}, 大于阈值 1',
            "expr": 'changes(redis_connected_slaves[1m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 1,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "redis从节点与主节点1min内重新连接",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "redis集群从节点丢失",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,redis集群 {{ $labels.cluster }}从节点丢失 {{ $value | '
                           'humanize }}, 小于阈值 0',
            "expr": 'delta(redis_connected_slaves[1m])',
            "summary": "-",
            "compare_str": "<",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "redis从节点丢失",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "服务内存使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,内存使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": 'service_process_memory_percent',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 90,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "服务内存使用率过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "服务cpu使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,cpu使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": 'service_process_cpu_percent',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 90,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "服务cpu使用率过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "clickhouse local线程占比过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,clickhouse local线程占比为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": 'ceil(clickhouse_local_thread_active/clickhouse_global_thread_active *100)',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 90,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "clickhouse local线程占比过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "clickhouse 并发query数量过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,clickhouse 并发query数量过高为 {{ $value | '
                           'humanize }}, 大于阈值 30',
            "expr": 'rate(clickhouse_query_thread[2m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 30,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "clickhouse 并发query数量过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "服务文件打开描述符过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,服务文件打开描述符过高为 {{ $value | '
                           'humanize }}%, 大于阈值 80',
            "expr": 'process_open_fds /process_max_fds *100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 80,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "服务文件打开描述符过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "tengine 4xx requests 占比过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,tengine 4xx requests 占比过高为 {{ $value | '
                           'humanize }}%, 大于阈值 10%',
            "expr": 'sum(rate(nginx_server_requests{code=~"^4.."}[2m]))  by (env, instance, job, instance_name)/sum(rate(nginx_server_requests[2m]))  by (env, instance, job, instance_name) *100 ',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 10,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "tengine 4xx requests 占比过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "tengine 5xx requests 占比过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,tengine 5xx requests 占比过高为 {{ $value | '
                           'humanize }}%, 大于阈值 10%',
            "expr": 'sum(rate(nginx_server_requests{code=~"^5.."}[2m])) by (env, instance,instance_name, job) /sum(rate(nginx_server_requests[2m])) by (env, instance,instance_name, job) *100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 10,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "tengine 5xx requests 占比过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "victoriaMetrics 磁盘使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,victoriaMetrics 磁盘使用率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": 'sum(vm_data_size_bytes) by (env, instance,instance_name, job)/(sum(vm_free_disk_space_bytes) by (env, instance,instance_name, job) + sum(vm_data_size_bytes) by (env, instance,instance_name, job) )*100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 80,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "victoriaMetrics 磁盘使用率过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "服务gc时间过多",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,服务gc时间过多 为 {{ $value | '
                           'humanize }}%, 大于阈值 1',
            "expr": 'go_gc_duration_seconds{quantile="0.75"}',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 1,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "服务gc时间过多",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "victoriaMetrics慢写入比例过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,victoriaMetrics慢写入过高为 {{ $value | '
                           'humanize }}%, 大于阈值 10%',
            "expr": 'sum (rate(vm_slow_row_inserts_total[5m])) by (env, job, instance, instance_name) / sum (rate(vm_rows_added_to_storage_total[5m])) by (env, job, instance, instance_name)*100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 10,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "victoriaMetrics慢写入比例过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "victoriaMetrics存在TSID丢失",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,victoriaMetrics存在TSID丢失为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'sum(rate(vm_missing_tsids_for_metric_id_total[5m])) by (env, instance,instance_name, job)',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "victoriaMetrics存在TSID丢失",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "postgreSql处理的事务过少",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,postgreSql处理的事务过少为 {{ $value | '
                           'humanize }}, 小于阈值 10',
            "expr": 'rate(pg_db_xact_commit[1m])',
            "summary": "-",
            "compare_str": "<",
            "threshold_value": 10,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "postgreSql处理的事务过少",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "postgreSql锁获取率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,postgreSql锁获取率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 20%',
            "expr": 'sum (pg_lock_count) by (env, instance,instance_name, job)/ (sum(pg_setting_max_locks_per_transaction) by (env, instance,instance_name, job) * sum(pg_setting_max_connections) by (env, instance,instance_name, job))*100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 20,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "postgreSql锁获取率过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "postgreSql连接率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,postgreSql连接率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": 'sum by (env, instance, job, server, instance_name) (pg_activity_count)/(min by (env, instance, job, server, instance_name) (pg_setting_max_connections))*100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 80,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "postgreSql连接率过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "postgreSql存在慢查询",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,postgreSql存在慢查询为 {{ $value | '
                           'humanize }}%, 大于阈值 10s',
            "expr": 'increase(pg_exporter_query_scrape_duration[1m])/ increase(pg_exporter_query_scrape_total_count[1m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 10,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "postgreSql存在慢查询",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "zookeepr集群中存在太多leader",
            "description": 'zookeepr集群{{ $labels.cluster }}存在太多leader为 {{ $value | '
                           'humanize }}, 大于阈值 1',
            "expr": 'sum(zk_server_leader) by (env, cluster, job)',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 1,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "zookeepr存在太多leader",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "zookeepr存在太多znode",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,zookeepr存在太多znode为 {{ $value | '
                           'humanize }}, 大于阈值 1000000',
            "expr": 'zk_znode_count',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 1000000,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "zookeepr存在太多znode",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "elasticsearch处于红色状态",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,elasticsearch处于红色状态为 {{ $value | '
                           'humanize }}, 等于阈值 1',
            "expr": 'elasticsearch_cluster_health_status{color="red"}',
            "summary": "-",
            "compare_str": "==",
            "threshold_value": 1,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "elasticsearch处于红色状态",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "elasticsearch heap使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,elasticsearch heap使用率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": '(elasticsearch_jvm_memory_used_bytes{area="heap"} / elasticsearch_jvm_memory_max_bytes{area="heap"}) * 100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 90,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "elasticsearch heap使用率过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "elasticsearch 磁盘使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,elasticsearch 磁盘使用率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": '(1 - elasticsearch_filesystem_data_available_bytes / elasticsearch_filesystem_data_size_bytes) * 100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 90,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "elasticsearch 磁盘使用率过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "elasticsearch 有未分配的shard",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,elasticsearch 有未分配的shard为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'elasticsearch_cluster_health_unassigned_shards',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "elasticsearch 有未分配的shard",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "Prometheus TSDB检查点创建失败",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Prometheus TSDB检查点创建失败为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'increase(prometheus_tsdb_checkpoint_creations_failed_total[1m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "Prometheus TSDB检查点创建失败",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "Prometheus TSDB检查点删除失败",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Prometheus TSDB检查点删除失败为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'increase(prometheus_tsdb_checkpoint_deletions_failed_total[1m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "Prometheus TSDB检查点删除失败",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "Prometheus TSDB重新加载失败",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Prometheus TSDB重新加载失败为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'increase(prometheus_tsdb_reloads_failures_total[1m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "Prometheus TSDB重新加载失败",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "Prometheus TSDB WAL截断失败",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Prometheus TSDB WAL截断失败为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'increase(prometheus_tsdb_wal_truncations_failed_total[1m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "Prometheus TSDB WAL截断失败",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "Minio 存在下线node",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Minio 存在下线node为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'minio_cluster_nodes_offline_total',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "Minio 存在下线node",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "Minio 存在下线drives",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Minio 存在下线drives为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'minio_cluster_disk_offline_total',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 0,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "Minio 存在下线drives",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "rocketmq 磁盘使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,rocketmq 磁盘使用率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": 'max by (env, instance,instance_name, job) (rocketmq_brokeruntime_commitlog_disk_ratio)  * 100',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 80,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "rocketmq 磁盘使用率过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "rocketmq 消费消息TPS过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,rocketmq 消费消息TPS过高为 {{ $value | '
                           'humanize }}, 大于阈值 1000',
            "expr": 'sum by (env, instance,instance_name, job) (rocketmq_consumer_tps)',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 1000,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "rocketmq 消费消息TPS过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "rocketmq 消息积压数量过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,rocketmq 消息积压数量过高为 {{ $value | '
                           'humanize }}, 大于阈值 100000',
            "expr": 'sum by (env, group,topic,instance_name, instance, job) (sum(rocketmq_producer_offset) by (env, topic,instance_name, instance, job) - on(topic,instance_name)  group_right  sum(rocketmq_consumer_offset) by (env, group,topic,instance_name, instance, job))',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 100000,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "rocketmq 消息积压数量过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        },
        {
            "alert": "request 请求时间过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,request 请求时间过高为 {{ $value | '
                           'humanize }}, 大于阈值 5s',
            "expr": 'increase(http_server_requests_seconds_sum[1m])/increase(http_server_requests_seconds_count[1m])',
            "summary": "-",
            "compare_str": ">",
            "threshold_value": 5,
            "for_time": "60s",
            "severity": "critical",
            "labels": {
                "severity": "critical"
            },
            "name": "request 请求时间过高",
            "quota_type": 0,
            "status": 1,
            "service": "service",
            "forbidden": 1
        }
    ]
    rule = [
        {
            "name": "exporter异常",
            "description": '主机 {{ $labels.instance }} 中的 {{ $labels.app }}_exporter 已经down掉超过一分钟',
            "expr": 'exporter_status{env="$env$"}',
            "service": "node",
        },
        {
            "name": "服务状态",
            "description": '主机 {{ $labels.instance }} 中的 服务 {{ $labels.app }} been down for more than a minute',
            "expr": 'probe_success{env="$env$"}',
            "service": "service",
        },
        {
            "name": "CPU使用率",
            "description": '主机 {{ $labels.instance }} CPU 使用率为 {{ $value | '
                           'humanize }}%, $compare_str$ 阈值 $threshold_value$%',
            "expr": '(100 - sum(avg without (cpu)(irate('
                    'node_cpu_seconds_total{mode="idle", env="$env$"}['
                    '2m])))by (instance,job,env) * 100)',
            "service": "node",
        },
        {
            "name": "内存使用率",
            "description": '主机 {{ $labels.instance }} 内存使用率为 {{ $value | '
                           'humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": '(1 - (node_memory_MemAvailable_bytes{env="$env$"} / (node_memory_MemTotal_bytes{env="$env$"})))* 100',
            "service": "node",
        },
        {
            "name": "根分区使用率",
            "description": '主机 {{ $labels.instance }} 根分区使用率为 {{ $value | '
                           'humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": 'max((node_filesystem_size_bytes{env="$env$",'
                    'mountpoint="/"}-node_filesystem_free_bytes{'
                    'env="$env$",mountpoint="/"})*100/('
                    'node_filesystem_avail_bytes{env="$env$",'
                    'mountpoint="/"}+(node_filesystem_size_bytes{'
                    'env="$env$",'
                    'mountpoint="/"}-node_filesystem_free_bytes{'
                    'env="$env$",mountpoint="/"})))by(instance,job,env)',
            "service": "node",
        },
        {
            "name": "消费组堆积消息",
            "description": 'Kafka 消费组{{ $labels.consumergroup }}消息堆积数过多  {{ '
                           'humanize $value}} $compare_str$阈值 $threshold_value$',
            "expr": 'sum(kafka_consumergroup_lag{env="$env$"}) by ('
                    'consumergroup,instance,job,env)',
            "service": "kafka",
        },
        {
            "name": "数据分区使用率",
            "description": '主机 {{ $labels.instance }} 数据分区使用率为 {{ $value | humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": 'max((node_filesystem_size_bytes{env="$env$",mountpoint="$data_dir$"}-node_filesystem_free_bytes{env="$env$",mountpoint="$data_dir$"})*100/(node_filesystem_avail_bytes{env="$env$",mountpoint="$data_dir$"}+(node_filesystem_size_bytes{env="$env$",mountpoint="$data_dir$"}-node_filesystem_free_bytes{env="$env$",mountpoint="$data_dir$"}))) by (instance,job,env)',
            "service": "node",
        },
        {
            "name": "jvm 文件句柄使用率",
            "description": '主机 {{ $labels.instance }} jvm 文件句柄使用率为 {{ $value | humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": '(process_files_open_files)*100/process_files_max_files',
            "service": "service",
        },
        {
            "name": "heap使用率",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,heap内存使用率为 {{ $value | '
                           'humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": 'sum(jvm_memory_used_bytes{area=~"heap"}) by (env, instance, job, instance_name)/sum(jvm_memory_max_bytes{area=~"heap"}) by (env, instance, job, instance_name) * 100',
            "service": "service",
        },
        {
            "name": "gc后老年代所占内存率",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,gc后老年代所占内存比例为 {{ $value | '
                           'humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": 'sum(jvm_gc_live_data_size_bytes) by (env, instance, job, instance_name)/sum(jvm_gc_max_data_size_bytes) by (env, instance, job, instance_name) * 100',
            "service": "service",
        },
        {
            "name": "mysql连接使用率太高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,mysql连接使用率为 {{ $value | '
                           'humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": 'max_over_time(mysql_global_status_threads_connected[1m]) / mysql_global_variables_max_connections * 100',
            "service": "service",
        },
        {
            "name": "mysql线程使用率太高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,mysql线程使用率为 {{ $value | '
                           'humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": 'max_over_time(mysql_global_status_threads_running[1m]) / mysql_global_variables_max_connections * 100',
            "service": "service",
        },
        {
            "name": "mysql新增过多慢查询",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,2m新增慢查询数量为 {{ $value | '
                           'humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": 'increase(mysql_global_status_slow_queries[2m])',
            "service": "service",
        },
        {
            "name": "mysql连接错误数过多",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,2m连接错误增长为 {{ $value | '
                           'humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": 'rate(mysql_global_status_connection_errors_total[2m])',
            "service": "service",
        },
        {
            "name": "mysql死锁数量增长过多",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,1m死锁数量增长为 {{ $value | '
                           'humanize }}%, $compare_str$阈值 $threshold_value$%',
            "expr": 'increase(mysql_global_variables_innodb_print_all_deadlocks[1m])',
            "service": "service",
        },
        {
            "name": "mysql集群从节点线程io未运行",
            "description": '主机 {{ $labels.instance }}中的mysql集群{{ $labels.instance_name }} {{ $labels.instance_name }} ,从节点线程io未运行为 {{ $value | '
                           'humanize }}%, 等于阈值 0',
            "expr": '( mysql_slave_status_slave_io_running and ON (instance) mysql_slave_status_master_server_id > 0 )',
            "service": "service",
        },
        {
            "name": "mysql从节点sql未运行",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,从节点sql未运行为 {{ $value | '
                           'humanize }}, 等于阈值 0',
            "expr": '( mysql_slave_status_slave_sql_running and ON (instance) mysql_slave_status_master_server_id > 0)',
            "service": "service",
        },
        {
            "name": "redis集群缺少master",
            "description": 'redis集群 {{ $labels.cluster }} ,缺少master为 {{ $value | '
                           'humanize }}, 小于阈值 1',
            "expr": 'sum(redis_instance_info{role="master"}) by (env, cluster) ',
            "service": "service",
        },
        {
            "name": "redis连接率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,redis连接率为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": 'redis_connected_clients / redis_config_maxclients * 100',
            "service": "service",
        },
        {
            "name": "redis连接拒绝数过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,redis连接拒绝数为 {{ $value | '
                           'humanize }}, 大于阈值 5',
            "expr": 'rate(redis_rejected_connections_total[1m])',
            "service": "service",
        },
        {
            "name": "redis实例36小时内未备份",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,redis实例未备份时间为 {{ $value | '
                           'humanize }}%, 大于阈值 36小时',
            "expr": 'time() - redis_rdb_last_save_timestamp_seconds',
            "service": "service",
        },
        {
            "name": "redis从节点与主节点1min内重新连接",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,redis集群{{ $labels.cluster }}  1min内从节点失去与主节点重新连接 {{ $value | '
                           'humanize }}, 大于阈值 1',
            "expr": 'changes(redis_connected_slaves[1m])',
            "service": "service",
        },
        {
            "name": "redis集群从节点丢失",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,redis集群 {{ $labels.cluster }}从节点丢失 {{ $value | '
                           'humanize }}, 小于阈值 0',
            "expr": 'delta(redis_connected_slaves[1m])',
            "service": "service",
        },
        {
            "name": "服务内存使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,内存使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": 'service_process_memory_percent',
            "service": "service",
        },
        {
            "name": "服务cpu使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,cpu使用率为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": 'service_process_cpu_percent',
            "service": "service",
        },
        {
            "name": "clickhouse local线程占比过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,clickhouse local线程占比为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": 'ceil(clickhouse_local_thread_active/clickhouse_global_thread_active *100)',
            "service": "service",
        },
        {
            "name": "clickhouse 并发query数量过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,clickhouse 并发query数量过高为 {{ $value | '
                           'humanize }}, 大于阈值 30',
            "expr": 'rate(clickhouse_query_thread[2m])',
            "service": "service",
        },
        {
            "name": "服务文件打开描述符过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,服务文件打开描述符过高为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": 'process_open_fds /process_max_fds *100',
            "service": "service",
        },
        {
            "name": "tengine 4xx requests 占比过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,tengine 4xx requests 占比过高为 {{ $value | '
                           'humanize }}%, 大于阈值 10%',
            "expr": 'sum(rate(nginx_server_requests{code=~"^4.."}[2m]))  by (env, instance, job, instance_name)/sum(rate(nginx_server_requests[2m]))  by (env, instance, job, instance_name) *100 ',
            "service": "service",
        },
        {
            "name": "tengine 5xx requests 占比过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,tengine 5xx requests 占比过高为 {{ $value | '
                           'humanize }}%, 大于阈值 10%',
            "expr": 'sum(rate(nginx_server_requests{code=~"^5.."}[2m])) by (env, instance,instance_name, job) /sum(rate(nginx_server_requests[2m])) by (env, instance,instance_name, job) *100',
            "service": "service",
        },
        {
            "name": "victoriaMetrics 磁盘使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,victoriaMetrics 磁盘使用率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": 'sum(vm_data_size_bytes) by (env,instance,instance_name, job)/(sum(vm_free_disk_space_bytes) by (env,instance,instance_name, job) + sum(vm_data_size_bytes) by (env,instance,instance_name, job) )*100',
            "service": "service",
        },
        {
            "name": "服务gc时间过多",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,服务gc时间过多 为 {{ $value | '
                           'humanize }}%, 大于阈值 1',
            "expr": 'go_gc_duration_seconds{quantile="0.75"}',
            "service": "service",
        },
        {
            "name": "victoriaMetrics慢写入比例过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,victoriaMetrics慢写入过高为 {{ $value | '
                           'humanize }}%, 大于阈值 10%',
            "expr": 'sum (rate(vm_slow_row_inserts_total[5m])) by (env, job, instance, instance_name) / sum (rate(vm_rows_added_to_storage_total[5m])) by (env, job, instance, instance_name)*100',
            "service": "service",
        },
        {
            "name": "victoriaMetrics存在TSID丢失",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,victoriaMetrics存在TSID丢失为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'sum(rate(vm_missing_tsids_for_metric_id_total[5m])) by (env, instance,instance_name, job)',
            "service": "service",
        },
        {
            "name": "postgreSql处理的事务过少",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,postgreSql处理的事务过少为 {{ $value | '
                           'humanize }}, 小于阈值 10',
            "expr": 'rate(pg_db_xact_commit[1m])',
            "service": "service",
        },
        {
            "name": "postgreSql锁获取率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,postgreSql锁获取率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 20%',
            "expr": 'sum (pg_lock_count) by (env, instance,instance_name, job)/ (sum(pg_setting_max_locks_per_transaction) by (env, instance,instance_name, job) * sum(pg_setting_max_connections) by (env, instance,instance_name, job))*100',
            "service": "service",
        },
        {
            "name": "postgreSql连接率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,postgreSql连接率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": 'sum by (env, instance, job, server, instance_name) (pg_activity_count)/(min by (env, instance, job, server, instance_name) (pg_setting_max_connections))*100',
            "service": "service",
        },
        {
            "name": "postgreSql存在慢查询",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,postgreSql存在慢查询为 {{ $value | '
                           'humanize }}%, 大于阈值 10s',
            "expr": 'increase(pg_exporter_query_scrape_duration[1m])/ increase(pg_exporter_query_scrape_total_count[1m])',
            "service": "service",
        },
        {
            "name": "zookeepr集群中存在太多leader",
            "description": 'zookeepr集群{{ $labels.cluster }}存在太多leader为 {{ $value | '
                           'humanize }}, 大于阈值 1',
            "expr": 'sum(zk_server_leader) by (env, cluster, job)',
            "service": "service",
        },
        {
            "name": "zookeepr存在太多znode",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,zookeepr存在太多znode为 {{ $value | '
                           'humanize }}, 大于阈值 1000000',
            "expr": 'zk_znode_count',
            "service": "service",
        },
        {
            "name": "elasticsearch处于红色状态",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,elasticsearch处于红色状态为 {{ $value | '
                           'humanize }}, 等于阈值 1',
            "expr": 'elasticsearch_cluster_health_status{color="red"}',
            "service": "service",
        },
        {
            "name": "elasticsearch heap使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,elasticsearch heap使用率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": '(elasticsearch_jvm_memory_used_bytes{area="heap"} / elasticsearch_jvm_memory_max_bytes{area="heap"}) * 100',
            "service": "service",
        },
        {
            "name": "elasticsearch 磁盘使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,elasticsearch 磁盘使用率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 90%',
            "expr": '(1 - elasticsearch_filesystem_data_available_bytes / elasticsearch_filesystem_data_size_bytes) * 100',
            "service": "service",
        },
        {
            "name": "elasticsearch 有未分配的shard",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,elasticsearch 有未分配的shard为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'elasticsearch_cluster_health_unassigned_shards',
            "service": "service",
        },
        {
            "name": "Prometheus TSDB检查点创建失败",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Prometheus TSDB检查点创建失败为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'increase(prometheus_tsdb_checkpoint_creations_failed_total[1m])',
            "service": "service",
        },
        {
            "name": "Prometheus TSDB检查点删除失败",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Prometheus TSDB检查点删除失败为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'increase(prometheus_tsdb_checkpoint_deletions_failed_total[1m])',
            "service": "service",
        },
        {
            "name": "Prometheus TSDB重新加载失败",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Prometheus TSDB重新加载失败为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'increase(prometheus_tsdb_reloads_failures_total[1m])',
            "service": "service",
        },
        {
            "name": "Prometheus TSDB WAL截断失败",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Prometheus TSDB WAL截断失败为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'increase(prometheus_tsdb_wal_truncations_failed_total[1m])',
            "service": "service",
        },
        {
            "name": "Minio 存在下线node",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Minio 存在下线node为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'minio_cluster_nodes_offline_total',
            "service": "service",
        },
        {
            "name": "Minio 存在下线drives",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,Minio 存在下线drives为 {{ $value | '
                           'humanize }}, 大于阈值 0',
            "expr": 'minio_cluster_disk_offline_total',
            "service": "service",
        },
        {
            "name": "rocketmq 磁盘使用率过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,rocketmq 磁盘使用率过高为 {{ $value | '
                           'humanize }}%, 大于阈值 80%',
            "expr": 'max by (env, instance,instance_name, job) (rocketmq_brokeruntime_commitlog_disk_ratio)  * 100',
            "service": "service",
        },
        {
            "name": "rocketmq 消费消息TPS过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,rocketmq 消费消息TPS过高为 {{ $value | '
                           'humanize }}, 大于阈值 1000',
            "expr": 'sum by (env, instance,instance_name, job) (rocketmq_consumer_tps)',
            "service": "service",
        },
        {
            "name": "rocketmq 消息积压数量过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,rocketmq 消息积压数量过高为 {{ $value | '
                           'humanize }}, 大于阈值 100000',
            "expr": 'sum by (env, group,topic,instance_name, instance, job) (sum(rocketmq_producer_offset) by (env, topic,instance_name, instance, job) - on(topic,instance_name)  group_right  sum(rocketmq_consumer_offset) by (env, group,topic,instance_name, instance, job))',
            "service": "service",
        },
        {
            "name": "request 请求时间过高",
            "description": '主机 {{ $labels.instance }}中的服务 {{ $labels.instance_name }} ,request 请求时间过高为 {{ $value | '
                           'humanize }}, 大于阈值 5s',
            "expr": 'increase(http_server_requests_seconds_sum[1m])/increase(http_server_requests_seconds_count[1m])',
            "service": "service",
        }
    ]
    try:
        for info in builtins_rules:
            hash_value = get_hash_value(info.get("expr"), info.get("severity"))
            alert = AlertRule.objects.filter(expr=info.get("expr"), severity=info.get("severity"),
                                             service=info.get("service"))
            info.update(hash_data=hash_value)
            if alert:
                alert.update(**info)
            else:
                AlertRule(**info).save()
    except Exception as e:
        print(f"初始化规则数据失败{e}")
    # 指标规则更新数据 bug 修复，更改内置指标规则中特定指标的name名称
    rule_update = [
        {
            "old": "heap 使用率过高，可能导致oom",
            "new": "heap使用率",
        },
        {
            "old": "gc后老年代所占内存比例过高，可能导致oom",
            "new": "gc后老年代所占内存率",
        }
    ]
    try:
        for rule_update_recard in rule_update:
            recard = Rule.objects.filter(name=rule_update_recard["old"])
            if recard:
                recard.update(name=rule_update_recard["new"])
    except Exception as e:
        print(f"指标规则历史问题数据更新失败{e}")
    for rule_info in rule:
        if Rule.objects.filter(name=rule_info.get("name")).exists():
            continue
        Rule(**rule_info).save()


def create_self_healing_setting():
    """添加默认自愈策略"""
    self_obj = SelfHealingSetting.objects.all().first()
    if self_obj and not self_obj.repair_instance:
        self_obj.repair_instance = ["host"]
        self_obj.save()


def create_back_settings():
    init_db = [
        {"field_k": "db_name",
         "field_v": "cw_apim,cw_automation,cw_cmdb,cw_dcim,"
                    "cw_docc,cw_dodi,cw_dodp,cw_dohd_middleware,"
                    "cw_dohd_servicedesk,cw_doia,cw_dola_v5,cw_doop,"
                    "cw_douc,cw_lcap,cw_metric,cw_monitor,cw_portal,cw_xxljob,nacos",
         "notes": "数据库名称,不填全库,适用mysql,pg"},
        {"field_k": "db_name",
         "field_v": "postgres,cw_apm_alert,db_toushibao_main,db_docp_mobile,cw_dohd_middleware,"
                    "cw_dohd_servicedesk,cw_dokb,cw_wisebot_taskrobot,cw_dohd_im,dosm_activiti,"
                    "cw_wisebot",
         "notes": "数据库名称,不填全库,pg,来源SELECT * FROM pg_database"},
        {"field_k": "no_pass",
         "field_v": "true",
         "notes": "无需认证,非必填,适用mysql"},
        {
            "field_k": "need_push",
            "field_v": "true",
            "notes": "异地备份,非必填,适用除es全部"
        },
        {
            "field_k": "need_app",
            "field_v": "true",
            "notes": "安装路径备份,非必填,适用pg"
        },
        {
            "field_k": "operation",
            "field_v": "backup",
            "notes": "恢复，适用es，redis"
        },
        {
            "field_k": "backup_dir",
            "field_v": "/xxx1/xxx1/xxx1",
            "notes": "备份路径，适用es,层级大于2"
        },
        {
            "field_k": "backup_dir",
            "field_v": "/xxx2/xxx2/xxx2",
            "notes": "备份路径，适用redis,层级大于2"
        }
    ]

    his_obj = BackupHistory.objects.all()

    for i in his_obj:
        if "," in i.content:
            i.delete()

    for v in init_db:
        notes = v.pop("notes")
        obj = BackupCustom.objects.filter(**v).first()
        if obj:
            obj.notes = notes
            obj.save()
        else:
            v.update({"notes": notes})
            BackupCustom.objects.create(**v)


def create_alert_settings():
    init_db = [
        {"alert_type": 0,
         "alert_setting": {"accountId": "110",
                           "userId": "3",
                           "appId": "1",
                           "url": "http://127.0.0.1:18241/message/api/v1/app/sendMessage",
                           "token": ""}},
        {"alert_type": 1,
         "alert_setting": {"url": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"}},
        {"alert_type": 2,
         "alert_setting": {"url": "http://127.0.0.1:18080/gateway/event/v1/artemis/message/rest",
                           "token": ""}}
    ]

    his_obj = AlertSettings.objects.all().first()
    if not his_obj:
        for v in init_db:
            AlertSettings.objects.get_or_create(**v)


def repair_dirty_data():
    detail_objs = DetailInstallHistory.objects.all()
    for obj in detail_objs:
        run_user = Host.objects.filter(ip=obj.service.ip).first().username
        if run_user != 'root':
            obj.install_detail_args['run_user'] = run_user
            for i in obj.install_detail_args.get('install_args', []):
                if i.get('key', '') == 'run_user':
                    i['default'] = run_user
            obj.save()
        else:
            continue
    service_obj = Service.split_objects.all()
    for ser in service_obj:
        if ser.service.app_name == "hadoop":
            ser.service_status = Service.SERVICE_STATUS_NORMAL
            ser.save()


class ClearDb:

    def alert(self):
        return

    def health(self):
        return

    def __call__(self, *args, **kwargs):
        for k, v in CLEAR_DB.items():
            obj = getattr(self, k)
            if not obj:
                print("改函数未定义")
        # ToDo 暂时无其他逻辑以后补充
        data = {
            "is_on": True,
            'task_func': 'services.tasks.clear_db',
            'task_name': 'self_clear_cron_db',
            'crontab_detail': dict(
                day_of_month='*', day_of_week='*',
                hour="00", minute="00",
                month_of_year='*')
        }
        change_task(1, data)


def no_ssh_init():
    package_path = os.path.join(PROJECT_DIR, "package_hub")
    modules_path = os.path.join(package_path, "_modules")
    tmp_path = os.path.join(PROJECT_DIR, "tmp")
    link_ls = [
        [os.path.join(tmp_path, "omp_salt_agent.tar.gz"), os.path.join(package_path, "omp_salt_agent.tar.gz")],
        [os.path.join(tmp_path, "init_host.py"), os.path.join(modules_path, "init_host.py")],
        [os.path.join(tmp_path, "install_or_update_agent.sh"),
         os.path.join(modules_path, "install_or_update_agent.sh")],
    ]
    try:
        for i in link_ls:
            if not os.path.exists(i[0]):
                os.symlink(i[1], i[0])
    except Exception as e:
        print(f"数据包可能丢失或位置不对:{e}")


def main():
    """
    基础数据创建流程
    :return:
    """
    # 创建默认用户
    create_default_user()
    # 创建监控配置项
    create_default_monitor_url()
    # 创建默认环境
    create_default_env()
    # 添加默认告警阈值规则
    create_threshold()
    # 添加默认自愈策略
    create_self_healing_setting()
    # 添加告警策略
    create_back_settings()
    # 添加告警渠道
    create_alert_settings()
    # 升级是清洗以前问题数据
    repair_dirty_data()
    # 创建清理任务
    ClearDb()()
    no_ssh_init()
    synch_grafana_info()


if __name__ == '__main__':
    main()
