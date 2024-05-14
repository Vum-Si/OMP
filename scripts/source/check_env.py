import os
import subprocess
import sys
import time
import logging
import json
import re
import argparse

CURRENT_FILE_PATH = os.path.dirname(os.path.abspath(__file__))
check_path = os.path.join(os.path.dirname(os.path.dirname(CURRENT_FILE_PATH)), "app")

LOG_PATH = os.path.join(os.path.dirname(CURRENT_FILE_PATH), "logs/check_env.log")
TO_MODIFY_HOST_NAME = [
    "localhost",
    "localhost.localhost",
    "localhost.domain",
]
KERNEL_PARAM = """# Disable IPv6
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
# ARP
net.ipv4.conf.default.rp_filter = 0
net.ipv4.conf.all.rp_filter = 0
net.ipv4.neigh.default.gc_stale_time = 120
net.ipv4.conf.default.arp_announce = 2
net.ipv4.conf.all.arp_announce = 2
net.ipv4.conf.lo.arp_announce = 2
# TCP Memory
net.core.rmem_default = 2097152
net.core.wmem_default = 2097152
net.core.rmem_max = 4194304
net.core.wmem_max = 4194304
net.ipv4.tcp_rmem = 4096 8192 4194304
net.ipv4.tcp_wmem = 4096 8192 4194304
net.ipv4.tcp_mem = 524288 699050 1048576
# TCP SYN
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_synack_retries = 1
net.ipv4.tcp_syn_retries = 1
net.ipv4.tcp_max_syn_backlog = 16384
net.core.netdev_max_backlog = 16384
# TIME_WAIT
net.ipv4.route.gc_timeout = 100
net.ipv4.tcp_max_tw_buckets = 5000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_timestamps = 0
net.ipv4.tcp_fin_timeout = 2
net.ipv4.ip_local_port_range = 20000 50000
# TCP keepalive
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
# Other TCP
net.ipv4.tcp_max_orphans = 65535
net.core.somaxconn = 16384
net.ipv4.tcp_sack = 1
net.ipv4.tcp_window_scaling = 1
vm.max_map_count=262144
vm.min_free_kbytes=512000
vm.swappiness = 0"""


def generate_log_filepath(log_path):
    """生成日志名称"""
    time_str = time.strftime('%Y-%m-%d-%H-%M-%S', time.localtime(time.time()))
    dirname = os.path.dirname(log_path)
    name_split = os.path.basename(log_path).split('.')
    if len(name_split) == 1:
        name = "{0}_{1}".format(name_split[0], time_str)
        file_path = os.path.join(dirname, name)
    else:
        name_split.insert(-1, time_str)
        file_path = os.path.join(dirname, '.'.join(name_split))
    return file_path


# 日志配置
log_path = generate_log_filepath(LOG_PATH)
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(filename)s[line:%(lineno)d] %(levelname)s %(message)s',
    datefmt='%a, %d %b %Y %H:%M:%S',
    filename=log_path,
    filemode='a')
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter(
    '%(asctime)s %(filename)s[line:%(lineno)d] %(levelname)s %(message)s')
console.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(console)


class BaseInit(object):
    """ Base class 检查权限 / 执行命令方法 """

    @staticmethod
    def parameters():
        """
        传递参数
        :return: 脚本接收到的参数
        """
        parser = argparse.ArgumentParser()
        parser.add_argument("--data_json", "-data_json", required=True,
                            help="Json文件位置")
        parser.add_argument("--local_ip", "-local_ip", help="指定IP地址")
        parser.add_argument("--check", "-check", required=False, help="是否检测")
        param = parser.parse_args()
        return param

    def format_para(self, paras):
        """
        读取json文件中的数据并进行解析
        :param paras: 脚本接收到的参数
        :param local_ip 专属nacos慎填写此变量
        """
        with open(paras.data_json) as f:
            data_json = f.read()
        data_json = json.loads(data_json)
        host_set_all = set()
        for data in data_json:
            host_set_all.add(data.get("ip"))
        return host_set_all

    @staticmethod
    def read_file(path, mode='r', res='str'):
        """
        :param path 路径
        :param mode 模式
        :param res 返回数据类型 str/list
        """
        if not os.path.exists(path):
            logger.error('读取文件失败，文件路径错误:{}'.format(path))
            exit(1)
        with open(path, mode) as f:
            data = f.read() if res == 'str' else f.readlines()
        return data

    def cmd(self, command):
        """ 执行shell 命令 """
        if hasattr(self, 'is_sudo'):
            if command.lstrip().startswith("echo"):
                command = "sudo sh -c '{0}'".format(command)
            else:
                command = "sudo {0}".format(command)
        logger.debug("Exec command: {0}".format(command))
        p = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
        )
        stdout, stderr = p.communicate()
        _out, _err, _code = stdout, stderr, p.returncode
        logger.debug(
            "Get command({0}) stdout: {1}; stderr: {2}; ret_code: {3}".format(
                command, _out, _err, _code
            )
        )
        return _out, _err, _code

    def __get_os_version(self):
        logging.debug('开始获取系统版本信息')

        import platform
        try:
            self.os_name, self.os_version, _ = platform.linux_distribution()
        except AttributeError:
            # python 3.8以上 完全删除 linux_distribution 函数，用 distro 包取代
            if sys.version_info >= (3, 8):
                import distro
                self.os_name, self.os_version, _ = distro.linux_distribution()
            else:
                self.os_name = platform.system()
                self.os_version = platform.release()
        # 增加
        self.localization = False
        os_name = self.os_name.replace(" ", "").lower()
        for i in ["centos", "redhat", "ubuntu"]:
            if i in os_name:
                self.localization = True

        logger.info('获取系统版本信息完成: {} - {}'.format(self.os_name, self.os_version))

    def run_methods(self):

        if os.path.exists(check_path) and not self.para.check:
            logger.info("环境已经被检查，已跳过")
            sys.exit(0)

        self.__get_os_version()
        try:
            assert isinstance(self.m_list, list), "m_list 类型错误 方法错误，请检查脚本"
            assert len(self.m_list) > 0, "m_list 为空，请检查脚本"
            for func_info in self.m_list:
                assert isinstance(func_info, tuple) and len(
                    func_info) == 2, "todo_list 方法错误，请检查脚本:{}".format(func_info)
                method_name, method_note = func_info
                if hasattr(self, method_name):
                    f = getattr(self, method_name)
                    logger.info("开始 执行: {}".format(method_note))
                    f()
                    logger.info("执行 完成: {}".format(method_note))
                else:
                    logger.warning("安装方法列表错误，{} 方法不存在".format(method_note))
            else:
                logging.info("执行结束, 完整日志保存在 {}".format(log_path))
        except TypeError:
            logger.error("脚本配置错误，TypeError:")
        except Exception as e:
            logger.error(e)
            logging.info("执行结束, 完整日志保存在 {}".format(log_path))
            exit(1)


class ValidInit(BaseInit):
    def __init__(self):
        self.para = self.parameters()
        self.host_all = list(self.format_para(self.para))
        self.m_list = [
            ('valid_env_timezone', '校验时区'),
            ('valid_env_firewall', '校验防火墙'),
            ('valid_env_file_limit', '校验文件具柄数'),
            ('valid_env_kernel', '校验内核参数'),
            ('valid_env_disable_selinux', '校验selinux'),
            ('valid_host_name', '校验host_name'),
            ('valid_io', '校验磁盘性能'),
            ('valid_inode', '校验inode数'),
            ('valid_lang', '校验编码格式'),
            ('valid_host_name', '校验host回环地址'),

        ]

    def valid_env_timezone(self):
        """ 校验时区 """
        assert os.readlink(
            '/etc/localtime') == "/usr/share/zoneinfo/PRC", "时区校验失败"

    def valid_env_firewall(self):
        """ 校验防火墙 """
        _, _, _code = self.cmd(
            "systemctl status firewalld.service | egrep -q 'Active: .*(dead)'"
        )
        assert _code == 0, "防火墙校验失败"

    def valid_env_language(self):
        """ 校验语言 """
        assert self.cmd(
            "localectl status |grep LANG=en_US.UTF-8")[2] == 0, "语言环境校验失败"

    def valid_env_file_limit(self):
        """ 校验文件具柄数 """
        _err = ""
        _file_max_out, _, _ = self.cmd("cat /proc/sys/fs/file-max")
        file_max = int(_file_max_out)
        _nr_open_out, _, _ = self.cmd("cat /proc/sys/fs/nr_open")
        nr_open = int(_nr_open_out)
        if file_max < 655350:
            _err = "文件句柄数校验失败"
        else:
            if "CentOS" not in self.os_name:
                file_max = 655350
            else:
                file_max = nr_open - 5000

        if self.cmd(
                'grep "*               -       nofile          {0}" /etc/security/limits.conf'.format(
                    file_max
                )
        )[2] != 0:
            _err = "文件 /etc/security/limits.conf 校验失败"

        if os.path.exists("/etc/security/limits.d/20-nproc.conf"):
            if self.cmd(
                    "grep unlimited /etc/security/limits.d/20-nproc.conf"
            )[2] != 0:
                _err = "文件 /etc/security/limits.d/20-nproc.conf 校验失败"
        if self.cmd('grep "DefaultLimitCORE=infinity" /etc/systemd/system.conf')[2] != 0:
            _err = "文件 /etc/systemd/system.conf DefaultLimitCORE 校验失败"
        if self.cmd('grep DefaultLimitNOFILE={0} /etc/systemd/system.conf'.format(file_max))[2] != 0:
            _err = "文件 /etc/systemd/system.conf DefaultLimitNOFILE 校验失败"
        if self.cmd('grep DefaultLimitNPROC={0} /etc/systemd/system.conf'.format(file_max))[2] != 0:
            _err = "文件 /etc/systemd/system.conf DefaultLimitNPROC 校验失败"

        assert _err == '', _err

    def valid_env_kernel(self):
        """ 校验内核参数 """
        if "CentOS" not in self.os_name:
            return
        _list = [i.strip() for i in self.read_file(
            '/etc/sysctl.conf', res='list') if not i.strip().startswith('#')]
        for i in KERNEL_PARAM.split('\n'):
            if i.startswith('#'):
                continue
            assert i.strip() in _list, "内核参数校验失败: {}".format(i)

    def valid_env_disable_selinux(self):
        """ 校验selinux """
        assert "SELINUX=disabled" in [
            i.strip() for i in self.read_file('/etc/selinux/config', res='list') if
            not i.strip().startswith('#')
        ], "selinux 校验失败"

    def valid_host_name(self):
        """校验host_name不含localhost"""
        _out, _err, _code = self.cmd("echo $(hostname)")
        assert _out.strip().lower() not in TO_MODIFY_HOST_NAME and not _out.strip().isdigit(), "校验主机名失败"
        for host in self.host_all:
            _out, _err, _code = self.cmd(f"cat /etc/hosts |grep {host}")
            assert _code == 0, "主机映射存在缺失"

    def valid_io(self):
        data_folder = self.para.data_json.split("/omp_packages")[0]
        io_cmd = f'speed=$(dd if=/dev/zero of={data_folder}/text.txt bs=10k count=10000 oflag=direct 2>&1) && ' \
                 f'echo $speed|awk "{{print \\$(NF-1),\\$NF}}" && echo "" > {data_folder}/text.txt'
        msg, err, code = self.cmd(io_cmd)
        if code != 0:
            logger.info(f"磁盘性能检测异常,{err}")
            sys.exit(1)
        else:
            msg = msg.decode('utf-8').strip()
            matches = re.findall(r'\d+.\d+', msg)
            if float(matches[0]) <= 25.0:
                logger.warning(f"磁盘性能可能存在低于25m/s,实际:{msg}")

    def valid_inode(self):
        data_folder = self.para.data_json.split("/omp_packages")[0]
        inode_cmd = f'df -Ti {data_folder}|tail -n 1|awk "{{print \\$2,\\$5}}"'
        msg, err, code = self.cmd(inode_cmd)
        if msg:
            msg = msg.decode('utf-8').strip().split()
            if int(msg[1]) < 10000000:
                logger.warning(f"{data_folder}inode剩余数建议大于10000000,实际：{msg[1]}")
            if msg[0] != "ext4":
                logger.warning(f"{data_folder}文件系统类型建议ext4,实际：{msg[0]}")
        else:
            logger.error(f"该目录找不到与之匹配的磁盘")
            sys.exit(1)

    def valid_lang(self):
        lang_cmd = "locale|grep LC_ALL"
        msg, err, code = self.cmd(lang_cmd)
        if code != 0:
            logger.error(f"语言类型检测异常{err.decode('utf-8').strip()}")
            sys.exit(1)
        values = msg.decode('utf-8').strip().split("=")[1]
        if "UTF-8" not in values:
            logger.warning(f"编码格式期望:zh_CN.UTF-8 实际:{values}")

    def _check_host(self):
        hosts_cmd = "cat /etc/hosts |grep 127.0.0.1 |grep -v localhost"
        msg, err, code = self.cmd(hosts_cmd)
        if code != 0 or msg:
            logger.warning(f"检测异常主机映射{msg.decode('utf-8').strip()},code:{code},error:{err}")


if __name__ == '__main__':
    v_init = ValidInit()
    v_init.run_methods()