# -*- coding: utf-8 -*-
# Project: install_mysql_redis
# Author: jon.liu@yunzhihui.com
# Create time: 2021-12-04 18:42
# IDE: PyCharm
# Version: 1.0
# Introduction:

import os
import sys
import yaml
import time
import shutil
import subprocess
import dmPython
import pymysql
import re

CURRENT_FILE_PATH = os.path.dirname(os.path.abspath(__file__))
PROJECT_FOLDER = os.path.dirname(os.path.dirname(CURRENT_FILE_PATH))

config_path = os.path.join(PROJECT_FOLDER, "config/omp.yaml")
PROJECT_DATA_PATH = os.path.join(PROJECT_FOLDER, "data")
PROJECT_LOG_PATH = os.path.join(PROJECT_FOLDER, "logs")


def cmd(command):
    """执行shell 命令"""
    p = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
    )
    stdout, stderr = p.communicate()
    _out, _err, _code = stdout, stderr, p.returncode
    return _out.decode(), _err.decode(), _code


def get_config_dic():
    """
    获取配置文件详细信息
    :return:
    """
    with open(config_path, "r", encoding="utf8") as fp:
        return yaml.load(fp, Loader=yaml.FullLoader)


def replace_placeholder(file_path, data):
    """
    替换占位符
    :param file_path: 文件路径
    :param data: 占位符映射关系
    :type data: dict
    :return:
    """
    if not os.path.exists(file_path):
        print(f"无法找到文件{file_path}")
        sys.exit(1)
    with open(file_path, "r", encoding="utf8") as fp:
        content = fp.read()
    for key, value in data.items():
        content = content.replace(key, str(value))
    with open(file_path, "w", encoding="utf8") as fp:
        fp.write(content)


def replace_str(re_pattern, new_str, file_name):
    """
    # 字符跨行替换，支持正则
    # sed -i "s#^user .*##g" ${CW_INSTALL_APP_DIR}/app/conf/app.conf
    """
    content = ''
    with open(file_name, 'r') as fp:
        conf_server = fp.readlines()
        for i in conf_server:
            conf_server = re.sub(re_pattern, new_str, i)
            content = content + conf_server
    with open(file_name, 'w') as fp:
        fp.write(content)


def get_run_user():
    """
    获取程序运行用户
    :return:
    """
    global_user = get_config_dic().get("global_user")
    if global_user != "root":
        return global_user
    default_user = "omp"
    cmd(f"id {default_user} || useradd -s /bin/bash {default_user}")
    return default_user


def install_redis():
    """
    安装 redis 逻辑
    :return:
    """
    redis_config = get_config_dic().get("redis")
    _dic = {
        "CW_REDIS_PORT": redis_config.get("port"),
        "CW_REDIS_PASSWORD": redis_config.get("password"),
        "CW_REDIS_BASE_DIR": os.path.join(PROJECT_FOLDER, "component/redis"),
        "CW_REDIS_LOG_DIR": os.path.join(PROJECT_LOG_PATH, "redis"),
        "CW_REDIS_DATA_DIR": os.path.join(PROJECT_DATA_PATH, "redis"),
        "CW_LOCAL_IP": get_config_dic().get("local_ip"),
        "CW_REDIS_RUN_USER": get_config_dic().get("global_user")
    }
    cmd(f"mkdir -p {_dic['CW_REDIS_LOG_DIR']}")
    cmd(f"mkdir -p {_dic['CW_REDIS_DATA_DIR']}")
    _redis_path = os.path.join(_dic["CW_REDIS_BASE_DIR"], "scripts/redis")
    _redis_conf = os.path.join(_dic["CW_REDIS_BASE_DIR"], "redis.conf")
    replace_placeholder(_redis_path, _dic)
    replace_placeholder(_redis_conf, _dic)
    cmd(f"bash {_redis_path} start")


class Database:
    @staticmethod
    def install_mysql():
        """
        安装 mysql 逻辑
        :return:
        """
        if not USE_SELF_DB:
            return
        mysql_config = get_config_dic().get("mysql")
        _dic = {
            "CW_MYSQL_USERNAME": mysql_config.get("username"),
            "CW_MYSQL_PASSWORD": mysql_config.get("password"),
            "CW_MYSQL_PORT": mysql_config.get("port"),
            "CW_MYSQL_RUN_USER": get_run_user(),
            "CW_MYSQL_DATA_DIR": os.path.join(PROJECT_DATA_PATH, "mysql"),
            "CW_MYSQL_ERROR_LOG_DIR": os.path.join(PROJECT_LOG_PATH, "mysql"),
            "CW_MYSQL_BASE_DIR": os.path.join(PROJECT_FOLDER, "component/mysql")
        }
        # 创建日志目录
        if not os.path.exists(_dic["CW_MYSQL_ERROR_LOG_DIR"]):
            cmd(f"mkdir -p {_dic['CW_MYSQL_ERROR_LOG_DIR']}")
        # 复制数据到目标目录
        shutil.copytree(
            os.path.join(_dic["CW_MYSQL_BASE_DIR"], "data"),
            os.path.join(PROJECT_DATA_PATH, "mysql")
        )
        # 替换占位符
        # my.cnf
        replace_placeholder(
            os.path.join(_dic["CW_MYSQL_BASE_DIR"], "my.cnf"), _dic)
        # scripts/mysql
        _mysql_path = os.path.join(_dic["CW_MYSQL_BASE_DIR"], "scripts/mysql")
        replace_placeholder(_mysql_path, _dic)
        # 启动服务
        out, _, code = cmd(f"bash {_mysql_path} start")
        if "mysql  [running]" not in out:
            print(f"mysql启动失败: {out}")
            sys.exit(1)
        time.sleep(30)
        # 确保mysql启动成功并可用
        _mysql_cli = os.path.join(_dic["CW_MYSQL_BASE_DIR"], "bin/mysql")
        _mysql_cli = f"{_mysql_cli} -S {os.path.join(_dic['CW_MYSQL_DATA_DIR'], 'mysql.sock')} -uroot"
        try_times = 0
        while try_times < 10:
            out, _, _ = cmd(f"{_mysql_cli} -e 'SHOW DATABASES;'")
            if "information_schema" in out:
                break
            try_times += 1
            time.sleep(10)
        else:
            print("mysql启动失败")
            sys.exit(1)
        # 创建数据库
        create = "create database omp default charset utf8 collate utf8_general_ci;"
        cmd(f"{_mysql_cli} -e '{create}'")
        _u = _dic["CW_MYSQL_USERNAME"]
        _p = _dic["CW_MYSQL_PASSWORD"]
        cmd(
            f""" {_mysql_cli} -e 'flush privileges; grant all privileges on `omp`.* to "{_u}"@"%" identified by "{_p}" with grant option;' """)
        # ToDo 临时修改
        # cmd(f'sed -i "s#skip-grant-tables##g"  {_dic["CW_MYSQL_BASE_DIR"]}/my.cnf')
        cmd(f"bash {_mysql_path} restart")
        max_connections = "set GLOBAL max_connections=2048;"
        cmd(f"{_mysql_cli} -e '{max_connections}'")
        cmd(f"touch {os.path.join(_dic['CW_MYSQL_BASE_DIR'], 'init.ok')}")

    @staticmethod
    def install_dm():
        migrate_path = os.path.join(PROJECT_FOLDER, "omp_server/db_models")
        mysql_migrate_path = os.path.join(migrate_path, "migrations")
        dm_migrate_path = os.path.join(migrate_path, "dm")
        cmd(f"\cp -r {dm_migrate_path}/* {mysql_migrate_path}")
        if USE_SELF_DB:
            print("暂不支持达梦安装，等待后续支持")
        dm_conf = get_config_dic().get("dm", {})

        conn = dmPython.connect(
            user=dm_conf.get('username'),
            password=dm_conf.get('password'),
            server=dm_conf.get('host'),
            port=dm_conf.get('port')
        )
        cursor = conn.cursor()
        print('python: conn success!')
        # 删除 DROP SCHEMA IF EXISTS "OMP" CASCADE;
        q2 = f"create schema {dm_conf.get('db_name')};"
        cursor.execute(q2)
        conn.close()

    @staticmethod
    def install_oceanbase():
        migrate_path = os.path.join(PROJECT_FOLDER, "omp_server/db_models")
        mysql_migrate_path = os.path.join(migrate_path, "migrations")
        dm_migrate_path = os.path.join(migrate_path, "dm")
        cmd(f"\cp -r {dm_migrate_path}/* {mysql_migrate_path}")
        schema = os.path.join(PROJECT_FOLDER,
                              "component/env/lib/python3.8/site-packages/django/db/backends/base/schema.py")
        cmd(f"\cp -r {os.path.join(PROJECT_FOLDER, 'scripts/source/schema.py')} {schema}")
        operations = os.path.join(PROJECT_FOLDER,
                                  "component/env/lib/python3.8/site-packages/django/db/backends/mysql/operations.py")
        cmd(f"\cp -r {os.path.join(PROJECT_FOLDER, 'scripts/source/operations.py')} {operations}")
        if USE_SELF_DB:
            print("暂不支持oceanbase安装，等待后续支持")
            sys.exit(1)
        o_conf = get_config_dic().get("oceanbase", {})
        conn = pymysql.connect(
            host=o_conf.get('host'),
            user=o_conf.get('username'),
            password=o_conf.get('password'),
            port=o_conf.get('port')
        )
        cursor = conn.cursor()
        print('python: conn success!')
        cursor.execute("create database omp default charset utf8 collate utf8_general_ci;")
        # 关闭游标和数据库连接
        cursor.close()
        conn.close()

    @staticmethod
    def install_postgreSql():
        cloud_conf = get_config_dic().get("postgreSql")
        local_ip = get_config_dic().get("local_ip")
        app_path = os.path.join(PROJECT_FOLDER, "component/postgreSql")
        data_dir = os.path.join(PROJECT_FOLDER, "data/postgreSql")
        log_dir = os.path.join(PROJECT_FOLDER, "logs/postgreSql")
        run_user = get_run_user()

        # 服务相关路径
        conf_path = os.path.join(app_path, 'postgresql.conf')
        # 创建脚本启动软链接
        for d in [app_path, data_dir, log_dir]:
            if not os.path.exists(d):
                cmd(f"mkdir -p {d}")
            cmd(f"chown -R {run_user} {d}")

        pg_ha_conf = os.path.join(data_dir, "pg_hba.conf")

        # script
        script_file = os.path.join(app_path, "scripts/postgreSql")
        placeholder = {
            "${CW_POSTGRESQL_PORT}": str(cloud_conf.get("port")),
            "${SERVICE_NAME}": "CloudPanguDB",
            "${CW_INSTALL_APP_DIR}": os.path.dirname(app_path),
            "${CW_INSTALL_DATA_DIR}": os.path.dirname(data_dir),
            "${CW_INSTALL_LOGS_DIR}": os.path.dirname(log_dir),
            "${CW_RUN_USER}": run_user}

        replace_placeholder(conf_path, placeholder)
        replace_placeholder(script_file, placeholder)

        # wal_log
        wal_log_src_file = os.path.join(app_path, "scripts", "bash", "postgresql_clear_wal_log.sh")
        wal_log_destination_file = os.path.join(app_path, "scripts", "postgresql_clear_wal_log.sh")
        shutil.copy(wal_log_src_file, wal_log_destination_file)
        replace_placeholder(wal_log_destination_file, placeholder)

        job_crontab = '0 0 * * * /bin/bash {0}/scripts/postgresql_clear_wal_log.sh\n'.format(app_path)
        job_tmp = os.path.join(PROJECT_FOLDER, "logs/job.txt")
        cmd('crontab -l >{} 2>/dev/null;echo 1>/dev/null'.format(job_tmp))
        with open(job_tmp, 'r') as f:
            res = re.findall('postgresql_clear_wal_log', f.read())
        if not res:
            with open(job_tmp, 'a') as f:
                f.write(job_crontab)
            cmd('crontab {}'.format(job_tmp))
            os.remove(job_tmp)
        # init
        init_dir = os.path.join(app_path, "scripts", "bash", "init.sh")
        cmd("chmod +x {0}".format(init_dir))
        init_cmd = "{7} {0} {1} {2} {3} {4} {5} {6}".format(
            os.path.dirname(app_path), os.path.dirname(data_dir), os.path.dirname(log_dir), run_user,
            str(cloud_conf.get("port")),
            "douc", local_ip, init_dir)
        if get_config_dic().get("global_user") == "root":
            init_cmd = 'su {0} -c "{1}"'.format(run_user, init_cmd)
        _out, _err, _code = cmd(init_cmd)
        if int(_code) != 0:
            print(f"安装异常:{_out},{_err}")
            sys.exit(1)
        time.sleep(5)

        replace_str('host    all             all             0.0.0.0/0               trust',
                    'host    all             all             0.0.0.0/0               md5', pg_ha_conf)
        cmd("bash {0} restart".format(script_file))
        print("postgreSql安装完成")

    @staticmethod
    def install_CloudPanguDB():
        cloud_conf = get_config_dic().get("CloudPanguDB")
        local_ip = get_config_dic().get("local_ip")
        app_path = os.path.join(PROJECT_FOLDER, "component/CloudPanguDB")
        data_dir = os.path.join(PROJECT_FOLDER, "data/CloudPanguDB")
        log_dir = os.path.join(PROJECT_FOLDER, "logs/CloudPanguDB")
        run_user = get_run_user()
        pg_hba_conf = os.path.join(app_path, "pg_hba.conf.template")

        # 服务相关路径
        conf_path = os.path.join(app_path, 'cloudwisesql.conf')
        # 创建脚本启动软链接
        for d in [app_path, data_dir, log_dir]:
            if not os.path.exists(d):
                cmd(f"mkdir -p {d}")
            cmd(f"chown -R {run_user} {d}")

        # script
        script_file = os.path.join(app_path, "scripts/CloudPanguDB")
        placeholder = {
            "${CW_CLOUDWISE_SQL_PORT}": str(cloud_conf.get("port")),
            "${SERVICE_NAME}": "CloudPanguDB",
            "${CW_INSTALL_APP_DIR}": os.path.dirname(app_path),
            "${CW_INSTALL_DATA_DIR}": os.path.dirname(data_dir),
            "${CW_INSTALL_LOGS_DIR}": os.path.dirname(log_dir),
            "${CW_RUN_USER}": run_user}

        replace_placeholder(conf_path, placeholder)
        replace_placeholder(script_file, placeholder)
        replace_placeholder(pg_hba_conf, {"${run_user}": run_user})

        # wal_log
        wal_log_src_file = os.path.join(app_path, "scripts", "bash", "CloudPanguDB_clear_wal_log.sh")
        wal_log_destination_file = os.path.join(app_path, "scripts", "CloudPanguDB_clear_wal_log.sh")
        shutil.copy(wal_log_src_file, wal_log_destination_file)
        replace_placeholder(wal_log_destination_file, placeholder)

        job_crontab = '0 0 * * * /bin/bash {0}/scripts/CloudPanguDB_clear_wal_log.sh\n'.format(app_path)
        job_tmp = os.path.join(PROJECT_FOLDER, "logs/job.txt")
        cmd('crontab -l >{} 2>/dev/null;echo 1>/dev/null'.format(job_tmp))
        with open(job_tmp, 'r') as f:
            res = re.findall('CloudPanguDB_clear_wal_log', f.read())
        if not res:
            with open(job_tmp, 'a') as f:
                f.write(job_crontab)
            cmd('crontab {}'.format(job_tmp))
            os.remove(job_tmp)
        # init
        init_dir = os.path.join(app_path, "scripts", "bash", "init.sh")
        cmd("chmod +x {0}".format(init_dir))

        init_cmd = "{7} {0} {1} {2} {3} {4} {5} {6}".format(
            os.path.dirname(app_path), os.path.dirname(data_dir),
            os.path.dirname(log_dir), run_user,
            str(cloud_conf.get("port")), "douc",
            local_ip, init_dir)
        if get_config_dic().get("global_user") == "root":
            init_cmd = 'su {0} -c "{1}"'.format(run_user, init_cmd)
        _out, _err, _code = cmd(init_cmd)
        if int(_code) != 0:
            print(f"安装异常:{_out},{_err}")
            sys.exit(1)
        print("CloudPanguDB安装完成")


if __name__ == '__main__':
    USE_DB = get_config_dic().get("use_db", "mysql")
    USE_SELF_DB = get_config_dic().get("use_self_db", True)
    if hasattr(Database, f"install_{USE_DB}"):
        getattr(Database, f"install_{USE_DB}")()
    else:
        print("无法识别安装数据库类型，请确认use_db配置")
        sys.exit(1)
    install_redis()
