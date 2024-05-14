# -*- coding: utf-8 -*-
# Project: parse_config
# Author: jon.liu@yunzhihui.com
# Create time: 2021-09-15 09:26
# IDE: PyCharm
# Version: 1.0
# Introduction:

"""
解析配置文件
"""

import os

from ruamel import yaml

project_path = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
config_file_path = os.path.join(project_path, "config/omp.yaml")
gateway_file_path = os.path.join(project_path, "config/gateway.yaml")

private_key_path = os.path.join(project_path, "config/private_key.pem")

# openssl genrsa -out private_key.pem 2048
# openssl rsa -in private_key.pem -out public_key.pem -pubout
with open(private_key_path, "r") as key_f:
    PRIVATE_KEY = key_f.read()

with open(gateway_file_path, "r") as fp:
    GATEWAY_DIC = yaml.load(fp, Loader=yaml.SafeLoader)

with open(config_file_path, "r") as fp:
    CONFIG_DIC = yaml.load(fp, Loader=yaml.SafeLoader)

GLOBAL_RUNUSER = CONFIG_DIC.get("global_runuser")
LOCAL_IP = CONFIG_DIC.get("local_ip")
TENGINE_PORT = CONFIG_DIC.get("tengine")
SSH_CMD_TIMEOUT = CONFIG_DIC.get("ssh_cmd_timeout", 60)
SSH_CHECK_TIMEOUT = CONFIG_DIC.get("ssh_check_timeout", 10)
THREAD_POOL_MAX_WORKERS = CONFIG_DIC.get("thread_pool_max_workers", 20)
SALT_RET_PORT = CONFIG_DIC.get("salt_master", {}).get("ret_port", 19005)
TOKEN_EXPIRATION = CONFIG_DIC.get("token_expiration", 1)
MONITOR_PORT = CONFIG_DIC.get("monitor_port")
GRAFANA_API_KEY = CONFIG_DIC.get("grafana_api_key")
RESET_LOG_INTERVAL = CONFIG_DIC.get("reset_log_level_interval", 30)
UPDATE_MONITOR_AGENT_STATUS_INTERVAL = CONFIG_DIC.get("update_monitor_agent_status_interval", 2)
PROMETHEUS_AUTH = CONFIG_DIC.get("prometheus_auth", {})
GRAFANA_AUTH = CONFIG_DIC.get("grafana_auth", {})
LOKI_CONFIG = CONFIG_DIC.get("loki_config", {})
OMP_REDIS_HOST = os.getenv(
    "OMP_REDIS_HOST",
    CONFIG_DIC.get("redis", {}).get("host")
)
OMP_REDIS_PORT = os.getenv(
    "OMP_REDIS_PORT",
    CONFIG_DIC.get("redis", {}).get("port")
)
OMP_REDIS_PASSWORD = os.getenv(
    "OMP_REDIS_PASSWORD",
    CONFIG_DIC.get("redis", {}).get("password")
)
USE_DB = CONFIG_DIC.get("use_db", "mysql")
OMP_MYSQL_HOST = os.getenv(
    "OMP_MYSQL_HOST",
    CONFIG_DIC.get(USE_DB, {}).get("host")
)
OMP_MYSQL_PORT = os.getenv(
    "OMP_MYSQL_PORT",
    CONFIG_DIC.get(USE_DB, {}).get("port")
)
OMP_MYSQL_USERNAME = os.getenv(
    "OMP_MYSQL_USERNAME",
    CONFIG_DIC.get(USE_DB, {}).get("username")
)
OMP_MYSQL_PASSWORD = os.getenv(
    "OMP_MYSQL_PASSWORD",
    CONFIG_DIC.get(USE_DB, {}).get("password")
)

OMP_CLOUD_HOST = os.getenv(
    "OMP_CLOUD_HOST",
    CONFIG_DIC.get(USE_DB, {}).get("host")
)
OMP_CLOUD_PORT = os.getenv(
    "OMP_CLOUD_PORT",
    CONFIG_DIC.get(USE_DB, {}).get("port")
)
OMP_CLOUD_USERNAME = os.getenv(
    "OMP_CLOUD_USERNAME",
    CONFIG_DIC.get(USE_DB, {}).get("username")
)
OMP_CLOUD_PASSWORD = os.getenv(
    "OMP_CLOUD_PASSWORD",
    CONFIG_DIC.get(USE_DB, {}).get("password")
)







OMP_DM_HOST = os.getenv(
    "OMP_DM_HOST",
    CONFIG_DIC.get("dm", {}).get("host")
)

OMP_DM_HOST = LOCAL_IP if OMP_DM_HOST == "127.0.0.1" else OMP_DM_HOST

OMP_DM_PORT = str(os.getenv(
    "OMP_DM_PORT",
    CONFIG_DIC.get("dm", {}).get("port", 5236)
))
OMP_DM_USERNAME = os.getenv(
    "OMP_DM_USERNAME",
    CONFIG_DIC.get("dm", {}).get("username")
)
OMP_DM_PASSWORD = os.getenv(
    "OMP_DM_PASSWORD",
    CONFIG_DIC.get("dm", {}).get("password")
)
OMP_DM_DB_NAME = os.getenv(
    "OMP_DM_DB_NAME",
    CONFIG_DIC.get("dm", {}).get("db_name")
)
USE_SELF_DB = CONFIG_DIC.get("use_self_db", True)
BASIC_ORDER = CONFIG_DIC.get("basic_order", {})
AFFINITY_FIELD = CONFIG_DIC.get("affinity", {})
HADOOP_ROLE = CONFIG_DIC.get("hadoop_role", {})
HOSTNAME_PREFIX = CONFIG_DIC.get("hostname_prefix", {})
IS_NO_SSH = CONFIG_DIC.get("is_no_ssh", False)
TEMPLATE_CLUSTER_CHECK = CONFIG_DIC.get("template_cluster_check", False)
SERVICE_DISCOVERY = CONFIG_DIC.get("service_discovery", [])
TEST_PRODUCT_LIST = CONFIG_DIC.get("test_product_list", [])
TEST_TASK_NAME = CONFIG_DIC.get("test_task_name", [])
ALERT_LOG = CONFIG_DIC.get("alert_log", False)
IGNORE_UPGRADE_APP = CONFIG_DIC.get("ignore_upgrade_app", [])
IGNORE_ROLLBACK_APP = CONFIG_DIC.get("ignore_rollback_app", [])
BACKUP_SERVICE = CONFIG_DIC.get("backup_service", [])
CLEAR_LOG = CONFIG_DIC.get("clear_log", {})
CLEAR_LOG_TYPE = CLEAR_LOG.get("type", [])
PYTHON_ENV = CONFIG_DIC.get("python_env", "")
HEALTH_REDIS_TIMEOUT = int(CONFIG_DIC.get("health_redis_timeout", 60)) * 60
HEALTH_REQUEST_COUNT = int(CONFIG_DIC.get("health_request_count", 6))
HEALTH_REQUEST_SLEEP = int(CONFIG_DIC.get("health_request_sleep", 5))
CLEAR_DB = CONFIG_DIC.get("clear_table", {})
DISK_ERROR_LINE = int(CONFIG_DIC.get("disk_error_line", 95))
DISK_AVAILABLE_SIZE = int(CONFIG_DIC.get("disk_available_size", 2))
# 私有
SUPPORT_DOCP_YAML_VERSION = CONFIG_DIC.get("support_dpcp_yaml_version", [])

DEFAULT_STOP_TIME = CONFIG_DIC.get("default_stop_time", {})

def python_cmd_env(data_json, sudo=False):
    python_env = f"sudo env PATH=$PATH  {PYTHON_ENV}" if sudo else PYTHON_ENV
    return f". {os.path.join(os.path.dirname(data_json), 'bash_env.sh')} && {python_env}"
