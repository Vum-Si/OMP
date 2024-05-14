"""
服务相关异步任务
"""

import logging
import os
import time
import datetime
import json

from concurrent.futures import ThreadPoolExecutor, as_completed, wait, \
    ALL_COMPLETED
from django.utils import timezone

from celery import shared_task
from celery.utils.log import get_task_logger
from db_models.models import ToolExecuteMainHistory, ToolExecuteDetailHistory, Host
from omp_server.settings import PROJECT_DIR
from utils.plugin.salt_client import SaltClient
from utils.plugin import public_utils
from utils.parse_config import LOCAL_IP, TENGINE_PORT, python_cmd_env

THREAD_POOL_MAX_WORKERS = 20
# 屏蔽celery任务日志中的paramiko日志
logging.getLogger("paramiko").setLevel(logging.WARNING)
logger = get_task_logger("celery_log")


class ThreadUtils:
    def __init__(self):
        self.timeout = 10
        self.salt = SaltClient()
        self.salt_data = self.salt.client.opts.get("root_dir")
        self.count = 0

    @staticmethod
    def send_message(tool_detail_obj, index=None, message=None):
        """
        标准打印日志
        """
        message_info = ["占位", "开始执行工具包", "开始获取输出文件", "工具执行成功", "开始发送工具包"]
        if index:
            message = message_info[index]
        tool_detail_obj.execute_log += "{1} {0}\n".format(
            message, datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        tool_detail_obj.save()

    def receive_file(self, tool_detail_obj, receive_files, ip):
        """
        接收文件
        """
        self.send_message(tool_detail_obj, 2)
        pull_dc = receive_files.get("output_files", [])
        receive_to = receive_files.get("receive_to", "/tmp")
        upload_real_paths = []
        for file in pull_dc:
            status, message = self.salt.cp_push(
                target=ip,
                source_path=file,
                upload_path=file.rsplit("/", 1)[1])
            upload_real_paths.append(
                os.path.join(self.salt_data,
                             f"var/cache/salt/master/minions/{ip}/files/{file.rsplit('/', 1)[1]}"))
            if not status:
                tool_detail_obj.status = ToolExecuteDetailHistory.STATUS_FAILED
                self.send_message(tool_detail_obj, message=message)
                return False
        if upload_real_paths:
            _out, _err, _code = public_utils.local_cmd(
                f'mv {" ".join(upload_real_paths)} {receive_to}')
            if _code != 0:
                tool_detail_obj.status = ToolExecuteDetailHistory.STATUS_FAILED
                self.send_message(tool_detail_obj, message=_out)
                return False
        return True

    def __call__(self, tool_detail_obj, *args, **kwargs):
        """
        执行单个工具任务函数
        """
        tool_detail_obj.status = ToolExecuteDetailHistory.STATUS_RUNNING
        # 发送文件
        ip = tool_detail_obj.target_ip
        self.send_message(tool_detail_obj, 4)
        send_dc = tool_detail_obj.get_send_files()
        for file in send_dc:
            status, message = self.salt.cp_file(
                target=ip,
                source_path=file.get("local_file"),
                target_path=file.get("remote_file")
            )
            if not status:
                tool_detail_obj.status = ToolExecuteDetailHistory.STATUS_FAILED
                self.send_message(tool_detail_obj, message=message)
                return status, message
        # 执行脚本
        self.send_message(tool_detail_obj, 1)
        cmd_str = tool_detail_obj.get_cmd_str()
        if tool_detail_obj.run_user:
            cmd_str = 'su -s /bin/bash {1} -c "{0}"'.format(
                cmd_str, tool_detail_obj.run_user
            )
        self.send_message(tool_detail_obj, message=f"执行脚本的命令: {cmd_str}")
        status, message = self.salt.cmd(
            target=ip,
            command=cmd_str,
            timeout=self.timeout,
            real_timeout=tool_detail_obj.time_out
        )
        if not status:
            if 'Timed out' in message:
                tool_detail_obj.status = ToolExecuteDetailHistory.STATUS_TIMEOUT
            else:
                tool_detail_obj.status = ToolExecuteDetailHistory.STATUS_FAILED
            self.send_message(tool_detail_obj, message=message)
            return status, message
        self.send_message(tool_detail_obj, message=f"脚本输出如下: {message}")
        # 获取目标输出文件
        receive_files = tool_detail_obj.get_receive_files()
        if receive_files:
            status = self.receive_file(tool_detail_obj, receive_files, ip)
        if not status:
            return False, "执行失败"
        self.send_message(tool_detail_obj, 3)
        tool_detail_obj.status = ToolExecuteDetailHistory.STATUS_SUCCESS
        tool_detail_obj.save()
        return True, "执行成功"


def change_main_tool_status(tool_main_id):
    tool_main_obj = ToolExecuteMainHistory.objects.select_related().filter(id=tool_main_id)
    exec_ing_dc = {
        "status": ToolExecuteMainHistory.STATUS_RUNNING,
        "start_time": timezone.now()
    }
    if tool_main_obj.exists():
        tool_main_obj.update(**exec_ing_dc)
    else:
        logger.error(f"主工具执行id不存在{tool_main_id}")
        raise ValueError(f"主工具执行id不存在{tool_main_id}")
    # 开始下发各个目标节点任务
    return tool_main_obj, tool_main_obj.first().toolexecutedetailhistory_set.all()


class TaskUtils(ThreadUtils):
    def __init__(self, obj, local_ip):
        super(TaskUtils, self).__init__()
        self.tool_detail_obj = obj
        self.ip = obj.target_ip
        self.local_ip = local_ip
        self.count = 30
        self.tar_dir = None

    def send_json(self, values):
        detail_id = self.tool_detail_obj.id
        data_folder = Host.objects.filter(ip=self.ip).first().data_folder
        self.tar_dir = os.path.join(data_folder, "omp_packages", f"test-{self.ip}-{detail_id}.json")
        _path = os.path.join(
            PROJECT_DIR,
            "package_hub/data_files",
            f"{self.ip}-{detail_id}.json"
        )
        if not os.path.exists(os.path.dirname(_path)):
            os.makedirs(os.path.dirname(_path))
        with open(_path, "w", encoding="utf8") as fp:
            fp.write(json.dumps(values, indent=2, ensure_ascii=False))
        is_success, message = self.salt.cp_file(
            target=self.ip,
            source_path=f"data_files/{self.ip}-{detail_id}.json",
            target_path=self.tar_dir)
        return is_success, message

    def produce_test_report(self, values):
        detail_id = self.tool_detail_obj.id
        omp_url = f"{LOCAL_IP}:{TENGINE_PORT.get('access_port', '19001')}" \
                  f"/api/tool/test-result/{detail_id}/"
        script_dir = ""
        for ser in values:
            if ser.get("ip") == self.ip:
                base_dir = ser.get("install_args").get('base_dir')
                script_dir = os.path.join(base_dir, "scripts", "run_task.py")

        cmd_str = f"{python_cmd_env(self.tar_dir)} {script_dir} --local_ip {self.ip} " \
                  f"--data_json {self.tar_dir} --omp_url {omp_url}"
        status, message = self.salt.cmd(
            target=self.ip,
            command=cmd_str,
            timeout=self.timeout,
            real_timeout=self.tool_detail_obj.time_out,
            ignore_exit_code=[129]
        )

        return status, message

    def __call__(self, values, *args, **kwargs):
        self.tool_detail_obj.status = ToolExecuteDetailHistory.STATUS_RUNNING
        func_ls = [
            self.send_json,
            self.produce_test_report
        ]
        message_type = ["替换配置", "执行测试"]
        for index, func in enumerate(func_ls):
            self.send_message(self.tool_detail_obj, message=f"开始{message_type[index]}")
            status, message = func(values)
            self.send_message(self.tool_detail_obj, message=f"完成{message_type[index]},执行结果:{message}")
            if not status:
                self.tool_detail_obj.status = ToolExecuteDetailHistory.STATUS_FAILED
                self.tool_detail_obj.save()
                return False
        return True


@shared_task
def exec_tools_main(tool_main_id, values=None):
    """
    工具执行类
    """
    # 当磁盘写入较慢时需稍等
    time.sleep(2)
    tool_main_obj, tool_detail_objs = change_main_tool_status(tool_main_id)
    with ThreadPoolExecutor(THREAD_POOL_MAX_WORKERS) as executor:
        future_list = []
        for obj in tool_detail_objs:
            if values:
                future_obj = executor.submit(TaskUtils(obj, LOCAL_IP), values)
            else:
                future_obj = executor.submit(ThreadUtils(), obj)
            future_list.append(future_obj)
        wait(future_list, return_when=ALL_COMPLETED)
        success = True
        for future in as_completed(future_list):
            if not future.result():
                success = False
                break
    if values and success:
        # 成功判定不再由omp决定
        return
        # 查看各个任务执行状态，修改主状态页。
    exec_ed_status = ToolExecuteMainHistory.STATUS_FAILED if not success \
        else ToolExecuteMainHistory.STATUS_SUCCESS
    exec_ed_dc = {
        "status": exec_ed_status,
        "end_time": timezone.now()
    }
    tool_main_obj.update(**exec_ed_dc)


@shared_task
def get_task(ip, exec_dir):
    salt_client = SaltClient()
    exec_dir = os.path.join(exec_dir, "AutoTest_QA/AllAutoReport.sh")
    salt_client.cmd(
        target=ip,
        command=f"bash {exec_dir}",
        timeout=10,
        real_timeout=600
    )


