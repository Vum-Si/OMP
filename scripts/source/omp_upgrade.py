#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import subprocess
import yaml
import time
import shutil
import sys
import logging
import re
from abc import abstractmethod, ABCMeta
from update_conf import update_nginx
from update_grafana import Grafana as GrafanaUpdate

CURRENT_FILE_PATH = os.path.dirname(os.path.abspath(__file__))
# 升级包路径
PROJECT_FOLDER = os.path.dirname(os.path.dirname(CURRENT_FILE_PATH))


class Logging:

    @staticmethod
    def log_new(app_name, path_log):
        logger = logging.getLogger(app_name)
        formatter = logging.Formatter(
            '[%(asctime)s-%(levelname)s]: %(message)s')
        logger.setLevel(level=logging.INFO)
        file_handler = logging.FileHandler(path_log)
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        return logger


log_path = os.path.join(PROJECT_FOLDER, f"logs/upgrade.log")
upgrade_log = Logging.log_new("upgrade", log_path)


# 流程 检查状态 关闭进程前准备 关闭进程 备份 升级 升级整体恢复
class Common(metaclass=ABCMeta):

    def __init__(self, target_dir):
        """
        target_dir 目标跟路径
        base_dir 目标安装路径
        backup_dir 升级备份路径
        """
        self.base_dir = None
        self.bin = None
        self.target_dir = target_dir
        self.check_target_dir()
        self.target_data = os.path.join(self.target_dir, "data")
        self.target_log = os.path.join(self.target_dir, "logs")
        self.omp_conf = os.path.join(self.target_dir, "config/omp.yaml")
        self.backup_dir = os.path.join(
            PROJECT_FOLDER, 'backup', self.get_class_name())
        if os.path.exists(self.backup_dir):
            upgrade_log.info(f"请确保该路径:{self.backup_dir}为空")
            sys.exit(1)
        _name = f"omp_upgrade_{self.get_class_name()}"
        self.logger = Logging.log_new(_name,
                                      os.path.join(PROJECT_FOLDER, f"logs/{_name}.log"))

    @abstractmethod
    def get_class_name(self):
        raise NotImplementedError("Must override get_class_name")

    def sys_cmd(self, cmd, ignore=True):
        """
        shell脚本输出
        :param cmd: linux命令
        :param ignore 异常不退出
        :return:
        """
        shell = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        stdout, stderr = shell.communicate()
        stdout, stderr = bytes.decode(stdout), bytes.decode(stderr)
        exit_code = shell.poll()
        self.logger.info("执行cmd命令:{0},结果退出码:{1},执行详情:{2}".format(
            cmd, shell.poll(), stdout))
        if str(exit_code) != "0":
            if ignore:
                upgrade_log.info(
                    f"执行cmd{cmd},异常输出:{stdout}:{stderr},退出码:{exit_code}")
                sys.exit(1)
            else:
                upgrade_log.info(
                    f"waring:执行cmd{cmd},异常输出:{stdout}:{stderr},退出码:{exit_code}")
                return int(exit_code)
        return stdout

    def get_config_dic(self, conf_dir=None):
        """
        获取配置文件详细信息
        :return:
        """
        conf_dir = conf_dir if conf_dir else self.omp_conf
        with open(conf_dir, "r", encoding="utf8") as fp:
            return yaml.load(fp, Loader=yaml.FullLoader)

    @staticmethod
    def replace_placeholder(file_path, data):
        """
        替换占位符
        :param file_path: 文件路径
        :param data: 占位符映射关系
        :type data: dict
        :return:
        """
        if not os.path.exists(file_path):
            upgrade_log.info(f"无法找到文件{file_path}")
            sys.exit(1)
        with open(file_path, "r", encoding="utf8") as fp:
            content = fp.read()
        for key, value in data.items():
            content = content.replace(key, str(value))
        with open(file_path, "w", encoding="utf8") as fp:
            fp.write(content)

    def get_run_user(self):
        """
        获取程序运行用户
        :return:
        """
        global_user = self.get_config_dic().get("global_user")
        db_name = self.get_config_dic().get("use_db")
        if global_user != "root" or (db_name not in ["mysql", "CloudPanguDB"] and db_name is not None):
            return global_user
        default_user = "omp"
        self.sys_cmd(
            f"id {default_user} || useradd -s /bin/bash {default_user}")
        return default_user

    def check_target_dir(self):
        try:
            dirs = os.listdir(self.target_dir)
            if 'omp_server' not in dirs or 'omp_web' not in dirs:
                upgrade_log.info("此目标路径非标准安装路径")
                sys.exit(1)
        except Exception as e:
            upgrade_log.info(f"路径异常，请检查路径，标准路径如/data/omp/ :{e}")

    def refresh(self):
        return

    def run(self):
        upgrade_log.info(f"开始升级{self.get_class_name()}，请不要手动中断\n")
        self.backup()
        self.refresh()
        self.install()

    def pre_backup(self):
        return

    def backup(self):
        return

    def install(self):
        return


class PreUpdate(Common):
    """
    检查前置条件
    """

    def __init__(self, target_dir):
        super().__init__(target_dir)
        self.target_dir = self.target_dir + \
            "/" if self.target_dir[-1] != '/' else self.target_dir
        self.check_user()

    def check_user(self):
        """
        防止配置用户与实际启动用户不一致
        """
        user = self.get_run_user()
        cmd_str = self.sys_cmd(
            "ps -o ruser=userForLongName -e -o cmd |grep omp/ |awk '{print $1}'|sort|uniq")
        user_ls = cmd_str.strip().split()
        compare_set = {"omp", "root"} if user == "omp" else {user}
        if compare_set != set(user_ls):
            upgrade_log.info(f"配置用户{compare_set}与实际启动用户{user_ls}不符,请排查后重试")
            sys.exit(1)

    def get_class_name(self):
        return self.__class__.__name__

    def check_process(self):
        """
        检查进程是否存在，存在返回false 不存在返回true
        """
        cmd_str = f'ps -ef | grep {self.target_dir}|grep -v grep|wc -l'
        stdout = self.sys_cmd(cmd_str)
        if str(stdout).strip() == "0":
            return True
        return False

    def crontab_stop(self):
        cmd_str = f'crontab -l | grep -v "{self.target_dir}scripts/omp all start" 2>/dev/null | crontab -;'
        self.sys_cmd(cmd_str, ignore=False)

    def process_stop(self):
        cmd_str = f'bash {self.target_dir}scripts/omp all stop'
        self.sys_cmd(cmd_str)
        # ToDo 需要各个停止脚本完全输出停止时不存在延迟停止进程
        time.sleep(5)
        if self.check_process():
            return
        time.sleep(5)
        if self.check_process():
            return
        # 强制杀死进程
        kill_cmd = f"ps -ef |grep {self.target_dir}|grep -v grep|grep -v omp_upgrade|awk '{{print $2}}'|xargs -r kill -9"
        self.sys_cmd(kill_cmd)
        # upgrade_log.info("服务未停止成功，请检查服务并尝试手动停止进程")
        # sys.exit(1)

    def update_local_ip_run_user(self):
        new_omp = self.get_config_dic(f'{PROJECT_FOLDER}/config/omp.yaml')
        old_omp = self.get_config_dic()

        new_omp['global_user'] = old_omp.get('global_user')
        new_omp['local_ip'] = old_omp.get('local_ip')

        with open(f'{PROJECT_FOLDER}/config/omp.yaml', "w", encoding="utf8") as fp:
            yaml.dump(new_omp, fp)

    def run(self):
        self.crontab_stop()
        self.process_stop()
        self.update_local_ip_run_user()


class PostUpdate(Common):

    def get_class_name(self):
        return self.__class__.__name__

    def crontab_start(self):
        tmp_dir = f'{PROJECT_FOLDER}/crontab.txt'
        cmd_str = f'crontab -l > {tmp_dir} && echo "*/5 * * * * bash ' \
                  f'{self.target_dir}/scripts/omp all start &>/dev/null" >> {tmp_dir}'
        self.sys_cmd(cmd_str, ignore=False)
        self.sys_cmd(f'crontab {tmp_dir}', ignore=False)

    def compare_conf(self):
        self.sys_cmd(f"cp {self.omp_conf} {PROJECT_FOLDER}")
        new_omp = self.get_config_dic(f'{PROJECT_FOLDER}/config/omp.yaml')
        old_omp = self.get_config_dic()
        for key, values in new_omp.items():
            if key not in old_omp.keys():
                old_omp[key] = values
        old_omp['basic_order'] = new_omp.get('basic_order')
        old_omp['test_product_list'] = new_omp.get('test_product_list')
        old_omp['ignore_upgrade_app'] = new_omp.get('ignore_upgrade_app')
        old_omp['monitor_port'] = new_omp.get('monitor_port')
        old_omp['mysql']['port'] = new_omp['mysql']['port']
        old_omp['redis']['port'] = new_omp['redis']['port']
        old_omp['backup_service'] = new_omp['backup_service']
        old_omp['support_dpcp_yaml_version'] = new_omp['support_dpcp_yaml_version']

        with open(self.omp_conf, "w", encoding="utf8") as fp:
            yaml.dump(old_omp, fp)

    def run(self):
        self.crontab_start()
        self.sys_cmd(f"bash {self.target_dir}/scripts/omp all restart")
        # upgrade_log.info(f"1.7.1版本之前的版本升级需要执行，普通用户安装需要执行，其余忽略。,"
        #      f"jh含纳管版本需更新覆盖omp_salt_agent.tar.gz并界面重装主机")
        export_cmd = "export LD_LIBRARY_PATH=:{0}".format(
            os.path.join(self.target_dir, 'component/env/lib/'))
        if self.get_config_dic().get("use_db", "mysql") == "CloudPanguDB":
            export_cmd = "{0}:{1}/component/CloudPanguDB/lib".format(
                export_cmd, self.target_dir)
        self.sys_cmd("{0} && {1} {2}".format(
            export_cmd,
            os.path.join(self.target_dir, 'component/env/bin/python3.8'),
            os.path.join(self.target_dir, 'scripts/source/update_data.py')
        ))
        upgrade_log.info(
            "\033[1;31m" + "1.  使用当前版本需界面上（有ssh时） 资源管理-》主机管理-》勾选全部主机-》更多-》重装主机agent" + "\033[0m")
        upgrade_log.info(
            "\033[1;31m" + "2.  重装完主机agent后 资源管理-》主机管理-》勾选全部主机-》更多-》重装监控agent" + "\033[0m")

    def pre_backup(self):
        self.compare_conf()


class Mysql(Common):
    def __init__(self, target_dir):
        super().__init__(target_dir)
        self.use_db = self.get_config_dic().get("use_db", "mysql")
        self.target_data = os.path.join(self.target_data, self.use_db)
        self.target_log = os.path.join(self.target_log, self.use_db)
        self.mysql_config = None
        self._dic = None
        self.refresh()
        self.bin = os.path.join(
            self.target_dir, "component", self.use_db, "bin")
        self.base_dir = os.path.join(self.target_dir, "component", self.use_db)
        self.python_django_dir = os.path.join(self.target_dir,
                                              "component/env/lib/python3.8/site-packages/django/db/backends/base")

    def get_class_name(self):
        if self.get_config_dic().get("use_db", "mysql") == "mysql":
            return self.__class__.__name__
        return "CloudPanguDB"

    def refresh(self):
        if self.use_db == "mysql":
            self.mysql_config = self.get_config_dic().get("mysql")
            self._dic = {
                "CW_MYSQL_USERNAME": self.mysql_config.get("username"),
                "CW_MYSQL_PASSWORD": self.mysql_config.get("password"),
                "CW_MYSQL_PORT": self.mysql_config.get("port"),
                "CW_MYSQL_RUN_USER": self.get_run_user(),
                "CW_MYSQL_DATA_DIR": self.target_data,
                "CW_MYSQL_ERROR_LOG_DIR": self.target_log,
                "CW_MYSQL_BASE_DIR": os.path.join(self.target_dir, "component/mysql")
            }
        else:
            self._dic = self.get_config_dic().get("CloudPanguDB")

    def install(self):
        """
        """
        if self.use_db == "mysql":
            return self.install_mysql()
        local_ip = self.get_config_dic().get("local_ip", "127.0.0.1")
        self.sys_cmd(
            "mv {0}/component/CloudPanguDB {1}/component".format(PROJECT_FOLDER, self.target_dir))
        app_path = os.path.join(self.target_dir, "component/CloudPanguDB")
        data_dir = os.path.join(self.target_dir, "data/CloudPanguDB")
        log_dir = os.path.join(self.target_dir, "logs/CloudPanguDB")
        run_user = self.get_run_user()
        pg_hba_conf = os.path.join(app_path, "pg_hba.conf.template")

        # 服务相关路径
        conf_path = os.path.join(app_path, 'cloudwisesql.conf')
        # 创建脚本启动软链接
        for d in [app_path, data_dir, log_dir]:
            if not os.path.exists(d):
                self.sys_cmd(f"mkdir -p {d}")
            self.sys_cmd(f"chown -R {run_user} {d}")

        # script
        script_file = os.path.join(app_path, "scripts/CloudPanguDB")
        placeholder = {
            "${CW_CLOUDWISE_SQL_PORT}": str(self._dic.get("port")),
            "${SERVICE_NAME}": "CloudPanguDB",
            "${CW_INSTALL_APP_DIR}": os.path.dirname(app_path),
            "${CW_INSTALL_DATA_DIR}": os.path.dirname(data_dir),
            "${CW_INSTALL_LOGS_DIR}": os.path.dirname(log_dir),
            "${CW_RUN_USER}": run_user}

        self.replace_placeholder(conf_path, placeholder)
        self.replace_placeholder(script_file, placeholder)
        self.replace_placeholder(pg_hba_conf, {"${run_user}": run_user})

        # wal_log
        wal_log_src_file = os.path.join(
            app_path, "scripts", "bash", "CloudPanguDB_clear_wal_log.sh")
        wal_log_destination_file = os.path.join(
            app_path, "scripts", "CloudPanguDB_clear_wal_log.sh")
        shutil.copy(wal_log_src_file, wal_log_destination_file)
        self.replace_placeholder(wal_log_destination_file, placeholder)

        job_crontab = '0 0 * * * /bin/bash {0}/scripts/CloudPanguDB_clear_wal_log.sh\n'.format(
            app_path)
        job_tmp = os.path.join(PROJECT_FOLDER, "logs/job.txt")
        self.sys_cmd(
            'crontab -l >{} 2>/dev/null;echo 1>/dev/null'.format(job_tmp), ignore=False)
        with open(job_tmp, 'r') as f:
            res = re.findall('CloudPanguDB_clear_wal_log', f.read())
        if not res:
            with open(job_tmp, 'a') as f:
                f.write(job_crontab)
            self.sys_cmd('crontab {}'.format(job_tmp), ignore=False)
            os.remove(job_tmp)
        # init
        init_dir = os.path.join(app_path, "scripts", "bash", "init.sh")
        self.sys_cmd("chmod +x {0}".format(init_dir))
        init_cmd = "{7} {0} {1} {2} {3} {4} {5} {6}".format(
            os.path.dirname(app_path), os.path.dirname(data_dir),
            os.path.dirname(log_dir), run_user,
            str(self._dic.get("port")), "douc",
            local_ip, init_dir)
        if self.get_config_dic().get("global_user") == "root":
            init_cmd = 'su {0} -c "{1}"'.format(run_user, init_cmd)
        self.sys_cmd(init_cmd)
        # 数据恢复
        self.sys_cmd('export PGPASSWORD="{1}" &&'
                     ' export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:{6}/lib &&'
                     ' {0}/psql -U {2} -h{3} -p{4} -d cloudwises -f {5}/omp.sql'.format(
                         self.bin, self._dic.get(
                             "password"), self._dic.get("username"),
                         self._dic.get("host"), self._dic.get("port"),
                         self.backup_dir, app_path))

        upgrade_log.info("CloudPanguDB安装完成")

    def install_mysql(self):
        """
        安装 mysql 逻辑
        :return:
        """
        # 修改pymysql源码
        self.sys_cmd(
            "mv {1}/features.py {0}".format(self.python_django_dir, CURRENT_FILE_PATH))
        self.sys_cmd(
            "mv {0}/component/mysql {1}".format(PROJECT_FOLDER, os.path.dirname(self.base_dir)))
        # 创建日志目录
        if not os.path.exists(self._dic["CW_MYSQL_ERROR_LOG_DIR"]):
            self.sys_cmd(f"mkdir -p {self._dic['CW_MYSQL_ERROR_LOG_DIR']}")
        # 复制数据到目标目录
        shutil.copytree(
            os.path.join(self.base_dir, "data"),
            os.path.join(self.target_data)
        )
        # my.cnf
        self.replace_placeholder(
            os.path.join(self.base_dir, "my.cnf"), self._dic)
        # scripts/mysql
        _mysql_path = os.path.join(self.base_dir, "scripts/mysql")
        self.replace_placeholder(_mysql_path, self._dic)
        # 启动服务
        out = self.sys_cmd(f"bash {_mysql_path} start")
        if "mysql  [running]" not in out:
            upgrade_log.info(f"mysql启动失败: {out}")
            sys.exit(1)
        time.sleep(30)
        # 确保mysql启动成功并可用
        _mysql_cli = os.path.join(self.bin, "mysql")
        _mysql_cli = f"{_mysql_cli} -S {os.path.join(self._dic['CW_MYSQL_DATA_DIR'], 'mysql.sock')} -uroot"
        try_times = 0
        while try_times < 10:
            out = self.sys_cmd(f"{_mysql_cli} -e 'SHOW DATABASES;'")
            if "information_schema" in out:
                break
            try_times += 1
            time.sleep(10)
        else:
            upgrade_log.info("mysql启动失败")
            sys.exit(1)
        # 创建数据库
        create = "create database omp default charset utf8 collate utf8_general_ci;"
        self.sys_cmd(f"{_mysql_cli} -e '{create}'")
        _u = self._dic["CW_MYSQL_USERNAME"]
        _p = self._dic["CW_MYSQL_PASSWORD"]
        self.sys_cmd(
            f""" {_mysql_cli} -e 'flush privileges; grant all privileges on `omp`.* to "{_u}"@"%"
            identified by "{_p}" with grant option;' """)
        self.sys_cmd(f"bash {_mysql_path} restart")
        self.sys_cmd(
            "{0}/mysql  -S{3}/mysql.sock -u{1} -p{2} -Domp< {4}/omp.sql".format(
                self.bin,
                self._dic.get(
                    "CW_MYSQL_USERNAME",
                    "common"), self._dic.get(
                    "CW_MYSQL_PASSWORD", "Common@123"),
                self._dic.get(
                    "CW_MYSQL_DATA_DIR",
                    "/data/omp/data/mysql"),
                self.backup_dir))
        self.sys_cmd(f"touch {os.path.join(self.base_dir, 'init.ok')}")

    def pre_backup_mysql(self):
        """
        进程关闭前进行的操作
        创建备份路径。备份数据等。
        样例：$MySQLDump --single-transaction -P3307
        - ucommon - h'127.0.0.1'  -pCommon@123
        -a --default-character-set=utf8 --skip-comments omp
        """
        self.sys_cmd("{0}/mysqldump --single-transaction -P{1} "
                     "-u{2} -h'127.0.0.1'  -p{3} -a "
                     "--default-character-set=utf8 --skip-comments omp 2>/dev/null > {4}/omp.sql".format(
                         self.bin, self._dic.get("CW_MYSQL_PORT", "3307"),
                         self._dic.get("CW_MYSQL_USERNAME", "common"),
                         self._dic.get("CW_MYSQL_PASSWORD", "Common@123"),
                         self.backup_dir
                     ))

    def pre_backup(self):
        self.sys_cmd(f'mkdir -p {self.backup_dir}')
        if self.use_db == "mysql":
            self.pre_backup_mysql()
        else:
            self.sys_cmd(
                'export PGPASSWORD="{1}" && '
                'export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:{6}/lib && '
                '{0}/pg_dump -U {2} -h{3} -p{4} cloudwises > {5}/omp.sql'.format(
                    self.bin, self._dic.get(
                        "password"), self._dic.get("username"),
                    self._dic.get("host"), self._dic.get("port"),
                    self.backup_dir, self.base_dir
                )
            )
        # 增加备份 防误删
        self.sys_cmd("cp {0}/omp.sql {1}/{2}.sql".format(
            self.backup_dir, os.path.dirname(self.backup_dir), str(time.time())))

    def backup(self):
        self.sys_cmd(
            "mv {0} {3}/{4}data && mv {1} {3}/{4}logs && mv {2} {3}/{4}base".format(
                self.target_data, self.target_log, self.base_dir, self.backup_dir, self.use_db))


class Grafana(Common):
    def __init__(self, target_dir):
        """
        param: target_dir 目标项目路径
        PROJECT_FOLDER 升级包跟路径
        base_dir 目标安装路径
        backup_dir 升级备份路径
        """
        super().__init__(target_dir)
        self.base_dir = os.path.join(self.target_dir, 'component/grafana')
        self.cw_grafana_admin_user = self.cw_grafana_admin_password = ""
        self.is_strong_password = False

    def get_class_name(self):
        return self.__class__.__name__

    def update_grafana(self):
        """
        更新当前服务需要更改的配置
        :return:
        """
        omp_grafana_log_path = os.path.join(self.target_log, "grafana")

        # 修改 conf/defaults.ini
        cdi_file = os.path.join(self.base_dir, 'conf', 'defaults.ini')
        cw_grafana_port = self.get_config_dic(). \
            get('monitor_port', {}).get('grafana', '19014')
        grafana_auth = self.get_config_dic(os.path.join(
            PROJECT_FOLDER, "config/omp.yaml")).get("grafana_auth", None)
        if grafana_auth:
            self.is_strong_password = True
            self.cw_grafana_admin_user = grafana_auth.get("grafana_admin_auth").get("username",
                                                                                    "admin")
            self.cw_grafana_admin_password = grafana_auth.get("grafana_admin_auth").get(
                "plaintext_password",
                "Yunweiguanli@OMP_123")
            cdi_placeholder_script = {'${CW-HTTP-PORT}': cw_grafana_port,
                                      '${OMP_GRAFANA_LOG_PATH}': omp_grafana_log_path,
                                      '${CW_GRAFANA_ADMIN_USER}': self.cw_grafana_admin_user,
                                      '${CW_GRAFANA_ADMIN_PASSWORD}': self.cw_grafana_admin_password,
                                      }
        else:
            cdi_placeholder_script = {'${CW-HTTP-PORT}': cw_grafana_port,
                                      '${OMP_GRAFANA_LOG_PATH}': omp_grafana_log_path,
                                      }
        self.replace_placeholder(cdi_file, cdi_placeholder_script)

        # 修改 scripts/grafana
        sa_placeholder_script = {
            '${OMP_GRAFANA_LOG_PATH}': omp_grafana_log_path}
        if not os.path.exists(omp_grafana_log_path):
            os.makedirs(omp_grafana_log_path)
        sa_file = os.path.join(self.base_dir, 'scripts', 'grafana')
        self.replace_placeholder(sa_file, sa_placeholder_script)

        # 修改 conf/provisioning/datasources/sample.yaml
        cw_loki_port = self.get_config_dic(). \
            get('monitor_port', {}).get('loki', '19012')
        cw_prometheus_port = self.get_config_dic(). \
            get('monitor_port', {}).get('prometheus', '19011')
        prometheus_auth = self.get_config_dic(os.path.join(PROJECT_FOLDER, "config/omp.yaml")).get("prometheus_auth",
                                                                                                   None)
        cw_prometheus_username = prometheus_auth.get("username")
        cw_prometheus_password = prometheus_auth.get("plaintext_password")
        source_placeholder_script = {
            '${CW_LOKI_PORT}': cw_loki_port,
            '${CW_PROMETHEUS_PORT}': cw_prometheus_port,
            '${CW_PROMETHEUS_USERNAME}': cw_prometheus_username,
            '${CW_PROMETHEUS_PASSWORD}': cw_prometheus_password,
        }
        grafana_datasource_yaml = os.path.join(
            self.base_dir, 'conf/provisioning/datasources/sample.yaml')
        self.replace_placeholder(
            grafana_datasource_yaml, source_placeholder_script)

        # 修改 conf/provisioning/dashboards/sample.yaml
        grafana_dashboard_yaml = os.path.join(
            self.base_dir, 'conf/provisioning/dashboards/sample.yaml')
        cw_grafana_dashboard = os.path.join(
            self.target_dir, "package_hub/grafana_dashboard_json")
        dashboard_placeholder_script = {
            '${CW_GRAFANA_DASHBOARD}': cw_grafana_dashboard
        }
        self.replace_placeholder(
            grafana_dashboard_yaml, dashboard_placeholder_script)

    def backup(self):
        self.sys_cmd(f"mkdir -p {self.backup_dir}")
        self.sys_cmd(f"mv {self.base_dir} {self.backup_dir}/grafanabase")
        self.sys_cmd(
            f"mv {self.target_dir}/package_hub/grafana_dashboard_json  {self.backup_dir}/grafanadashboard")

    def install(self):
        self.sys_cmd(
            f"cp -a {PROJECT_FOLDER}/component/grafana  {self.target_dir}/component")
        self.sys_cmd(
            f"cp -a {PROJECT_FOLDER}/package_hub/grafana_dashboard_json  {self.target_dir}/package_hub")
        self.sys_cmd(f"mkdir -p {self.base_dir}/data")
        self.sys_cmd(
            f"cp -a {self.backup_dir}/grafanabase/data/* {self.base_dir}/data/")
        self.update_grafana()
        # 同步不同版本grafana数据,如dashboard
        self.sys_cmd(f"bash {self.base_dir}/scripts/grafana restart")
        time.sleep(20)
        if self.is_strong_password:
            self.sys_cmd(
                f"{self.base_dir}/sbin/grafana-cli --homepath {self.base_dir} {self.cw_grafana_admin_user} reset-admin-password  {self.cw_grafana_admin_password}")
        GrafanaUpdate().run()
        time.sleep(30)
        # synch_grafana_info()


class OmpWeb(Common):
    """
    omp_web升级
    """

    def __init__(self, target_dir):
        super().__init__(target_dir)
        self.base_dir = os.path.join(self.target_dir, 'omp_web')
        self.python_django_dir = os.path.join(
            self.target_dir,
            "/component/env/lib/python3.8/site-packages/django/db/backends/base")

    def get_class_name(self):
        return self.__class__.__name__

    def backup(self):
        self.sys_cmd(f"mkdir -p {self.backup_dir}")
        self.sys_cmd(f"mv {self.base_dir} {self.backup_dir}/omp_web_base")

    def install(self):
        self.sys_cmd(f"cp -a {PROJECT_FOLDER}/omp_web  {self.target_dir}")


class Tengine(Common):
    """
    tengine升级
    """

    def __init__(self, target_dir):
        super().__init__(target_dir)
        self.base_dir = os.path.join(self.target_dir, 'component/tengine')

    @staticmethod
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

    def get_class_name(self):
        return self.__class__.__name__

    def backup(self):
        self.sys_cmd(f"mkdir -p {self.backup_dir}")
        self.sys_cmd(f"cp -r {self.base_dir} {self.backup_dir}/tengine_base")
        self.sys_cmd(f"mv {self.base_dir}/sbin/nginx  {self.backup_dir}")

    def install(self):
        self.sys_cmd(f"\cp -a {PROJECT_FOLDER}/component/tengine/conf/vhost/omp.conf "
                     f"{self.base_dir}/conf/vhost/omp.conf"
                     )
        self.sys_cmd(
            f"cp -a {PROJECT_FOLDER}/component/tengine/sbin/nginx {self.base_dir}/sbin")

        update_nginx(project_path=self.target_dir)
        # conf_dir = os.path.join(f"{self.base_dir}/conf/nginx.conf")
        #
        # self.replace_str("worker_processes  10;",
        #                 "",
        #                 conf_dir)
        # self.replace_str("worker_rlimit_nofile 102400;",
        #                 "worker_processes  10;\nworker_rlimit_nofile 102400;",
        #                 conf_dir)
        # self.replace_str("limit_req_zone",
        #                 "#limit_req_zone",
        #                 conf_dir)


class OmpServer(Common):
    """
    omp_server升级
    """

    def __init__(self, target_dir):
        super().__init__(target_dir)
        self.base_dir = os.path.join(self.target_dir, 'omp_server')
        self.bin = os.path.join(self.base_dir, "manage.py")
        self.python_django_dir = os.path.join(
            PROJECT_FOLDER,
            "component/env/bin/python3.8")

    def get_class_name(self):
        return self.__class__.__name__

    def backup(self):
        self.sys_cmd(f"mkdir -p {self.backup_dir}")
        self.sys_cmd(f"mv {self.base_dir} {self.backup_dir}/omp_server_base")
        monitor_bak = os.path.join(
            self.target_dir, 'package_hub/omp_monitor_agent-*.tar.gz')
        self.sys_cmd(f"mv {monitor_bak} {self.backup_dir}/omp_server_base")

    def explain_one(self, dirs, ignore=None):
        out_ls = self.sys_cmd(f'find {dirs} -name \"*\"').split()
        compare_set = set()
        dirs = dirs if dirs.endswith("/") else f'{dirs}/'
        for i in out_ls[1:]:
            if not i.startswith(dirs):
                continue
            if len(i.split(dirs)) < 2:
                continue
            if i.split(dirs)[1].split("/")[0] in ignore:
                continue
            compare_set.add(i.split(dirs)[1])
        return compare_set

    def compare_dir(self, source_dir, target_dir, is_exec=True):
        """
        文件比对模块
        需要注意文件格式 带/都带 不带斜杠都不带
        """
        # 计算出旧版本的文件目录与目标版本目录的不同
        ignore = ["back_end_verified",
                  "front_end_verified", "verified", "python"]
        force_override = {"_modules": "dir",
                          "omp_salt_agent.tar.gz": "file",
                          }
        ignore.extend(list(force_override))

        need_change = self.explain_one(
            source_dir, ignore) - self.explain_one(target_dir, ignore)
        # 排序
        dir_ls = []
        file_ls = []
        for i in need_change:
            if os.path.isdir(os.path.join(source_dir, i)):
                dir_ls.append(i)
            file_ls.append(i)
        # 执行迁移
        if is_exec:
            for d in dir_ls:
                self.sys_cmd(f"mkdir -p {os.path.join(target_dir, d)}")
            for f in file_ls:
                self.sys_cmd(
                    f"cp -a {os.path.join(source_dir, f)} {os.path.join(target_dir, f)}")
        # 部分路径强制覆盖
        for force, f_type in force_override.items():
            s_dir = os.path.join(source_dir, force)
            if f_type == "dir":
                s_dir = f"{s_dir}/*"
            self.sys_cmd(f"\cp -a {s_dir} {os.path.join(target_dir, force)}")
        # self.sys_cmd(f"\cp -a {os.path.join(source_dir, 'omp_monitor_agent-*.tar.gz')} {target_dir}")

    def install(self):
        # 启动redis
        self.sys_cmd(
            f"bash {os.path.join(self.target_dir, 'scripts/omp')} redis start")
        time.sleep(1)
        self.sys_cmd(
            f"cp -a {PROJECT_FOLDER}/config/private_key.pem {self.target_dir}/config/")
        self.sys_cmd(
            f"cp -a {PROJECT_FOLDER}/config/public.pem {self.target_dir}/config/")
        self.sys_cmd(
            f"cp -a {PROJECT_FOLDER}/config/private.pem {self.target_dir}/config/")
        self.sys_cmd(
            f"cp -a {PROJECT_FOLDER}/config/git_commit {self.target_dir}/config/")
        self.sys_cmd(f"cp -a {PROJECT_FOLDER}/omp_server  {self.target_dir}")
        self.sys_cmd(
            f"\cp -a {PROJECT_FOLDER}/config/docp_yaml {self.target_dir}/config/")
        if not os.path.exists(f"{self.target_dir}/config/gateway.yaml"):
            self.sys_cmd(
                f"\cp -a {PROJECT_FOLDER}/config/gateway.yaml {self.target_dir}/config/")
        # 对比文件
        self.compare_dir(os.path.join(PROJECT_FOLDER, "package_hub"),
                         os.path.join(self.target_dir, "package_hub"))
        export_cmd = f"export LD_LIBRARY_PATH={self.target_dir}/component/env/lib"
        if self.get_config_dic().get("use_db", "mysql") == "CloudPanguDB":
            export_cmd = "{0}:{1}/component/CloudPanguDB/lib".format(
                export_cmd, self.target_dir)
        self.sys_cmd(
            f"{export_cmd} && {self.python_django_dir} {self.bin} migrate")
        # upgrade_log.info(f"1. 请手动执行 {self.python_django_dir} {self.bin} migrations\n")
        self.sys_cmd(
            f"mv {self.target_dir}/scripts {os.path.dirname(self.backup_dir)}/omp_scripts_bak")
        self.sys_cmd(
            f"\cp -a {PROJECT_FOLDER}/scripts {self.target_dir}/scripts")


class Python(Common):
    def __init__(self, target_dir):
        super().__init__(target_dir)
        self.base_dir = os.path.join(self.target_dir, 'component/env')

    def get_class_name(self):
        return self.__class__.__name__

    def backup(self):
        self.sys_cmd(f"mkdir -p {self.backup_dir}")
        self.sys_cmd(f"mv {self.base_dir} {self.backup_dir}/python_base")

    def install(self):
        self.sys_cmd(
            f"cp -ra {PROJECT_FOLDER}/component/env  {os.path.dirname(self.base_dir)}")


class Redis(Common):
    def __init__(self, target_dir):
        super().__init__(target_dir)
        self.base_dir = os.path.join(self.target_dir, 'component/redis')

    def get_class_name(self):
        return self.__class__.__name__

    def backup(self):
        self.sys_cmd(f"mkdir -p {self.backup_dir}")
        self.sys_cmd(f"cp -r {self.base_dir} {self.backup_dir}/redis_base")
        self.sys_cmd(f"mkdir -p {self.backup_dir}/redis_base/bin_bak")
        self.sys_cmd(
            f"mv {self.base_dir}/bin/redis* {self.backup_dir}/redis_base/bin_bak")

    def install(self):
        self.sys_cmd(
            f"cp -a {PROJECT_FOLDER}/component/redis/bin/redis* {self.base_dir}/bin")
        self.sys_cmd(
            f"\cp -a {PROJECT_FOLDER}/component/redis/scripts/redis {self.base_dir}/scripts/redis")
        self.sys_cmd(
            f"\cp -a {PROJECT_FOLDER}/component/redis/redis.conf {self.base_dir}/redis.conf")
        redis_config = self.get_config_dic().get("redis")
        _dic = {
            "CW_REDIS_PORT": redis_config.get("port"),
            "CW_REDIS_PASSWORD": redis_config.get("password"),
            "CW_REDIS_BASE_DIR": self.base_dir,
            "CW_REDIS_LOG_DIR": os.path.join(self.target_dir, "logs/redis"),
            "CW_REDIS_DATA_DIR": os.path.join(self.target_dir, "data/redis"),
            "CW_LOCAL_IP": self.get_config_dic().get("local_ip"),
            "CW_REDIS_RUN_USER": self.get_config_dic().get("global_user")
        }
        self.replace_placeholder(
            f"{self.base_dir}/scripts/redis", _dic)
        self.replace_placeholder(
            f"{self.base_dir}/redis.conf", _dic)


class Prometheus(Common):
    def __init__(self, target_dir):
        """
        param:
            target_dir 目标项目路径，例如/data/omp
            PROJECT_FOLDER 升级包跟路径
            base_dir 目标安装路径
            backup_dir 升级备份路径
        """
        super().__init__(target_dir)
        self.base_dir = os.path.join(self.target_dir, 'component/prometheus')

    def get_class_name(self):
        return self.__class__.__name__

    def backup(self):
        self.sys_cmd(f"mkdir -p {self.backup_dir}")
        self.sys_cmd(
            f"cp -ra {self.base_dir} {self.backup_dir}/prometheus_base")

    def install(self):
        self.sys_cmd(
            f"\cp -a {PROJECT_FOLDER}/component/prometheus/sbin/* {self.base_dir}/sbin")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        upgrade_log.info("参数异常，请提供正确的安装路径")
        sys.exit(1)
    t_dir = sys.argv[1]
    position = 0
    if len(sys.argv) >= 3:
        try:
            position = int(sys.argv[2])
        except Exception as e:
            upgrade_log.info(f"请输入正确下标:{e}")
    exec_cls = [PreUpdate, Redis, Prometheus, Grafana,
                Tengine, OmpWeb, OmpServer, Python, PostUpdate]
    res = PreUpdate(t_dir).sys_cmd(
        f"cat {os.path.join(t_dir, 'config/omp.yaml')} |grep 'use_db'|grep 'oceanbase'||echo local")
    if str(res).strip() == "local":
        exec_cls.insert(1, Mysql)
    exec_cls = exec_cls[position:]
    upgrade_log.info("开始升级前置操作，请不要手动中断")
    obj_ls = [cls(t_dir) for cls in exec_cls]
    upgrade_log.info("-" * 50)
    upgrade_log.info("开始执行备份")
    [obj.pre_backup() for obj in obj_ls]
    upgrade_log.info("-" * 50)
    upgrade_log.info("开始执行run")
    [obj.run() for obj in obj_ls]
    upgrade_log.info("请手动退出，查询omp状态无异常后，并在界面执行上述操作后，则升级完成")
