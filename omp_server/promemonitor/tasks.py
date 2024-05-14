# -*- coding: utf-8 -*-
# Project: tasks
# Author: jon.liu@yunzhihui.com
# Create time: 2021-10-09 09:17
# IDE: PyCharm
# Version: 1.0
# Introduction:

"""
监控端异步任务
"""

import os
import logging
import traceback
import re
import requests
import json

from celery import shared_task
from celery.utils.log import get_task_logger

from db_models.models import Host, Service, ServiceLogLevel
from utils.plugin.salt_client import SaltClient
from utils.parse_config import THREAD_POOL_MAX_WORKERS, MONITOR_PORT, RESET_LOG_INTERVAL
from concurrent.futures import (ThreadPoolExecutor, as_completed)
from utils.plugin.crontab_utils import CrontabUtils
from django_celery_beat.models import PeriodicTask
from django.core.exceptions import ObjectDoesNotExist
from promemonitor.prometheus_utils import CW_TOKEN

# 屏蔽celery任务日志中的paramiko日志
logging.getLogger("paramiko").setLevel(logging.WARNING)
logger = get_task_logger("celery_log")
logger2 = logging.getLogger('server')


def real_monitor_agent_restart(host_obj):
    """
    重启监控Agent
    :param host_obj: 主机对象
    :type host_obj Host
    :return:
    """
    logger.info(
        f"Restart Monitor Agent for {host_obj.ip}, Params: "
        f"username: {host_obj.username}; "
        f"port: {host_obj.port}; "
        f"install_dir: {host_obj.agent_dir}!")
    salt_obj = SaltClient()
    _script_path = os.path.join(
        host_obj.agent_dir, "omp_monitor_agent/monitor_agent.sh")
    flag, message = salt_obj.cmd(
        target=host_obj.ip,
        command=f"bash {_script_path} restart",
        timeout=60
    )
    logger.info(
        f"Restart monitor agent for {host_obj.ip}: "
        f"get flag: {flag}; get res: {message}")
    if flag:
        Host.objects.filter(ip=host_obj.ip).update(monitor_agent=0)
    else:
        Host.objects.filter(ip=host_obj.ip).update(
            monitor_agent=2,
            monitor_agent_error=str(message)[:200] if len(
                str(message)) > 200 else str(message)
        )


@shared_task
def monitor_agent_restart(host_id):
    """
    主机Agent的重启操作
    :param host_id: 主机的id
    :return:
    """
    try:
        host_obj = Host.objects.get(id=host_id)
        real_monitor_agent_restart(host_obj=host_obj)
    except Exception as e:
        logger.error(
            f"Restart Monitor Agent For {host_id} Failed with error: "
            f"{str(e)};\ndetail: {traceback.format_exc()}"
        )
        Host.objects.filter(id=host_id).update(
            monitor_agent=2, monitor_agent_error=str(e))


def exec_salt_cmds(target_ip, cmd_str):
    """执行salt cmd 命令，返回字符串结果"""
    salt_obj = SaltClient()
    flag, message = salt_obj.cmd(
        target=target_ip,
        command=cmd_str,
        timeout=300
    )
    logger2.info(
        f"get flag: {flag}; get res: {message}"
    )
    return flag, message


@shared_task
def log_level_reset_interval(service_instance_name, log_conf_path, target_ip):
    s_log_level_obj = None
    s_log_level_obj = ServiceLogLevel.objects.filter(service__service_instance_name=service_instance_name).first()
    old_level_str = s_log_level_obj.raw_log_level_str
    new_level_str = s_log_level_obj.new_log_level_str
    cmd_str1 = f"""sed -i 's#{new_level_str}#{old_level_str}#g' {log_conf_path}"""
    task_name = f"log_level_reset_{service_instance_name}"
    res_flag, res_msg = exec_salt_cmds(target_ip=target_ip, cmd_str=cmd_str1)
    if not res_flag:
        return
    try:
        PeriodicTask.objects.get(name=task_name).delete()
    except ObjectDoesNotExist:
        logger2.error(f"log_level_reset_interval task_name: {task_name} not exists!")
    ServiceLogLevel.objects.filter(service__service_instance_name=service_instance_name).update(used=False)
    logger2.info(f"log_level_reset_interval task_name: {task_name} is deleted !")


class ManageJavaLogLevel(object):
    """自研服务java程序日志等级管理类"""

    @staticmethod
    def multi_threaded_executor(func, many_data):
        """
        多线程执行器
        many_data: 字典列表[{}]
        """
        with ThreadPoolExecutor(THREAD_POOL_MAX_WORKERS) as executor:
            future_list = list()
            result_list = list()
            for data in many_data:
                future_obj = executor.submit(
                    func, **data
                )
                future_list.append(future_obj)
            for future_obj in as_completed(future_list):
                result_list.append(future_obj.result())
                logger2.info(f"future_obj.result()=={future_obj.result()}")
            logger2.info(f"result_list== {result_list}")
        return result_list

    @staticmethod
    def get_one_service_log_level(service_obj):
        """获取单个自研java服务的日志等级"""
        log_level_tuple = ("trace", "debug", "info", "warn", "error", "fatal")
        log_level = "unknow"
        target_ip = service_obj.ip
        service_controllers = service_obj.service_controllers
        service_id = service_obj.id
        service_app_name = service_obj.service.app_name
        service_instance_name = service_obj.service_instance_name
        install_path = service_controllers.get('install', '')
        install_path = os.path.realpath(install_path)
        if not install_path:
            return {
                "id": service_id,
                "app_name": service_app_name,
                "service_instance_name": service_instance_name,
                "ip": target_ip,
                "log_level": log_level
            }
        app_path = os.path.join(install_path.split(service_app_name)[0], service_app_name)
        log_conf_path = os.path.join(app_path, "conf/log4j2.xml")
        cmd_str = f"""cat {log_conf_path} | grep -iE '^\s+<property name="(LOG_)?LEVEL".*?>$' | sed -e 's/^[ ]*//g' -e 's/[ ]*$//g' """
        res_flag, message = exec_salt_cmds(target_ip=target_ip, cmd_str=cmd_str)
        if not res_flag:
            return {
                "id": service_id,
                "app_name": service_app_name,
                "service_instance_name": service_instance_name,
                "ip": target_ip,
                "log_level": log_level
            }
        message = message.lower() if isinstance(message, str) else ""
        if "value=" in message:
            res_list = re.findall(r'<property name="(log_)?level" value=(.*?)/>', message)
        else:
            res_list = re.findall(r'<property name="(log_)?level">(.*?)</property>', message)
        if len(res_list) < 1 or res_list[0][1] == "":
            return {
                "id": service_id,
                "app_name": service_app_name,
                "service_instance_name": service_instance_name,
                "ip": target_ip,
                "log_level": log_level
            }
        log_level = res_list[0][1].lower()
        logger2.info(f"获取服务{service_instance_name}日志等级为：{log_level}")
        # todo 从节点内存或者中获取服务日志等级，暂时不做
        log_level = re.sub('"', "", re.sub(r'[{}$-]', '', log_level))
        log_level = log_level.split(":")[-1]
        if log_level not in log_level_tuple:
            return {
                "id": service_id,
                "app_name": service_app_name,
                "service_instance_name": service_instance_name,
                "ip": target_ip,
                "log_level": log_level
            }
        return {
            "id": service_id,
            "app_name": service_app_name,
            "service_instance_name": service_instance_name,
            "ip": target_ip,
            "log_level": log_level
        }

    @classmethod
    def get_services_log_level(cls, many_data):
        """获取多个自研java服务的日志等级"""
        return cls.multi_threaded_executor(cls.get_one_service_log_level, many_data=many_data)

    @staticmethod
    def update_one_service_log_level(id, service_instance_name, log_level):
        """更新单个自研java服务的日志等级"""
        log_level_tuple = ("trace", "debug", "info", "warn", "error", "fatal")
        flag = False
        msg = raw_log_raw_log_level_str = raw_log_raw_log_level_str = old_level_str = new_level_str = ""
        if not isinstance(log_level, str):
            logger2.error(f"传入的log_level：{log_level}不是字符串类型")
            msg = f"传入的log_level：{log_level}不是字符串类型"
            return flag, msg
        log_level = log_level.lower()
        if log_level not in log_level_tuple:
            logger2.error(f"传入的log_level：{log_level}不属于日志等级集")
            msg = f"传入的log_level：{log_level}不属于日志等级集"
            return flag, msg
        try:
            service_obj = Service.objects.get(id=id)
        except Exception as e:
            logger2.error(f"service的实例id {id}，不存在: {e}")
            msg = f"service的实例id {id}，不存在: {e}"
            return flag, msg
        if service_obj.service_instance_name != service_instance_name:
            logger2.error(f"service的实例id :{id}与 service_instance_name：{service_instance_name}不匹配")
            msg = f"service的实例id :{id}与 service_instance_name：{service_instance_name}不匹配"
            return flag, msg
        if service_obj.service.app_monitor.get("type", "").lower() != "javaspringboot":
            logger2.info(f"服务实例{service_instance_name}不属于java服务")
            msg = f"服务实例{service_instance_name}不属于java服务"
            return flag, msg
        target_ip = service_obj.ip
        service_controllers = service_obj.service_controllers
        service_app_name = service_obj.service.app_name
        install_path = service_controllers.get('install', '')
        install_path = os.path.realpath(install_path)
        if not install_path:
            return flag, "install path is null"
        app_path = os.path.join(install_path.split(service_app_name)[0], service_app_name)
        log_conf_path = os.path.join(app_path, "conf/log4j2.xml")
        cmd_str = f"""cat {log_conf_path} | grep -iE '^\s+<property name="(LOG_)?LEVEL".*?>$' | sed -e 's/^[ ]*//g' -e 's/[ ]*$//g' """
        res_flag, raw_log_raw_log_level_str = exec_salt_cmds(target_ip=target_ip, cmd_str=cmd_str)
        if not res_flag:
            return res_flag, raw_log_raw_log_level_str
        new_log_level_str = f'<property name="LEVEL">{log_level}</property>'
        cmd_str1 = f"""sed -i 's#{raw_log_raw_log_level_str}#{new_log_level_str}#g' {log_conf_path}"""
        res_flag, res_msg = exec_salt_cmds(target_ip=target_ip, cmd_str=cmd_str1)
        if not res_flag:
            return res_flag, res_msg
        # 更新日志等级成功触发周期性任务
        _dict = {
            "service": service_obj,
            "time_interval": RESET_LOG_INTERVAL,
            "raw_log_level_str": raw_log_raw_log_level_str,
            "new_log_level_str": new_log_level_str,
        }
        s_log_level_obj = ServiceLogLevel.objects.filter(service__id=service_obj.id).first()
        if not s_log_level_obj:
            ServiceLogLevel.objects.create(**_dict)
        else:
            _dict.pop("raw_log_level_str")
            ServiceLogLevel.objects.filter(service__id=service_obj.id).update(
                **_dict)
        s_log_level_obj = ServiceLogLevel.objects.filter(service__id=service_obj.id).first()
        _task_name = f"log_level_reset_{service_instance_name}"
        task_args = [service_instance_name, log_conf_path, target_ip]
        if not s_log_level_obj.is_used:
            cron_obj = CrontabUtils(task_name=_task_name,
                                    task_func='promemonitor.tasks.log_level_reset_interval',
                                    task_args=task_args)
            cron_obj.create_internal_job(num=s_log_level_obj.time_interval, unit_type="minutes")
            s_log_level_obj.used = True
            s_log_level_obj.save()

        # 更新采集日志配置
        port = MONITOR_PORT.get('monitorAgent', 19031)
        detail_obj = service_obj.detailinstallhistory_set.first()
        app_install_args = detail_obj.install_detail_args.get(
            "install_args", [])
        log_path = ""
        for info in app_install_args:
            if info.get("key", "") == "log_dir":
                log_path = info.get("default", "")
        agent_dir = Host.objects.filter(ip=target_ip).values_list("agent_dir", flat=True)[0]
        url = f"http://{target_ip}:{port}/update/promtail/json"
        headers = CW_TOKEN
        data = {
            "data": {
                "agent_dir": agent_dir,
                "service_instance_name": service_instance_name,
                "log_path": log_path,
                "log_level": log_level
            }}
        logger2.info(f"发送update/promtail/json接口的data=={data}")
        target_json_result = requests.post(url=url, headers=headers, data=json.dumps(data)).json()
        if target_json_result.get("return_code") == 0:
            logger2.info('向{}更新服务{}日志监控json配置成功！'.format(
                target_ip, service_instance_name))
            msg = '向{}更新服务{}日志监控json配置成功！'.format(
                target_ip, service_instance_name)
            flag = True
            return flag, msg
        else:
            logger2.error('向{}更新服务{}日志监控json配置失败！'.format(
                target_ip, service_instance_name))
            msg = '向{}更新服务{}日志监控json配置失败！'.format(
                target_ip, service_instance_name)
            flag = False
            return flag, msg

    @classmethod
    def update_services_log_level(cls, many_data):
        """批量修改日志等级"""
        cls.multi_threaded_executor(cls.update_one_service_log_level, many_data)
