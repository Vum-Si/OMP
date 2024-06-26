# -*- coding: utf-8 -*-
# Project: __init__.py
# Author: jerry.zhang@yunzhihui.com
# Create time: 2021-12-15 15:46
# IDE: PyCharm
# Version: 1.0
# Introduction:

from app_store.deploy_role_utils.hadoop import Hadoop
from app_store.deploy_role_utils.redis import Redis
from app_store.deploy_role_utils.mysql import Mysql
from app_store.deploy_role_utils.arangodb import Arangodb
from app_store.deploy_role_utils.flink import Flink
from app_store.deploy_role_utils.minio import Minio

DEPLOY_ROLE_UTILS = {
    "hadoop": Hadoop,
    "redis": Redis,
    "mysql": Mysql,
    "arangodb": Arangodb,
    "flink": Flink,
    "minio": Minio,
    "redisgraph": Redis,
}
