"""
服务相关异步任务
"""

import logging
import os

from celery import shared_task
from celery.utils.log import get_task_logger
from db_models.models import (
    Service, ServiceHistory,
    ClearLogRule
)
from utils.plugin.salt_client import SaltClient
import time
import json
from promemonitor.prometheus_utils import PrometheusUtils
from utils.plugin.crontab_utils import maintain
from db_models.models import (
    Host, HostOperateLog, ClusterInfo,
    ApplicationHub, CollectLogRuleHistory,
    SelfHealingHistory, Alert
)
from django.db import transaction
from concurrent.futures import (
    ThreadPoolExecutor, as_completed
)
from utils.parse_config import THREAD_POOL_MAX_WORKERS
from utils.parse_config import BASIC_ORDER, CLEAR_DB
from django.utils import timezone

# 屏蔽celery任务日志中的paramiko日志
logging.getLogger("paramiko").setLevel(logging.WARNING)
logger = get_task_logger("celery_log")


def delete_action(service_obj):
    """
    查询删除目录
    """
    install_detail = service_obj.detailinstallhistory_set.first()
    if install_detail:
        install_detail = install_detail.install_detail_args
    else:
        return None
    dir_list = ["base_dir", "log_dir", "data_dir"]
    valida_rm = []
    for args in install_detail.get("install_args"):
        if args.get("key") in dir_list:
            dir_name = args.get("default")
            if dir_name and len(dir_name) >= 5:
                valida_rm.append(dir_name)
    result = " ".join(valida_rm)
    return result


def get_app_dir(service_obj):
    """获取服务app_dir"""
    install_detail_args = service_obj.detailinstallhistory_set.first()
    if not install_detail_args:
        return
    install_detail_args = install_detail_args.install_detail_args
    base_dir_dict = {
        "base_dir":
            args.get("default") for args in install_detail_args.get("install_args")
        if args.get("key") == "base_dir"
    }
    base_dir = base_dir_dict.get("base_dir", "")
    if base_dir and len(base_dir) >= 5:
        return base_dir


def delete_file(service_controllers, service_obj):
    """
    删除文件操作
    """
    salt_obj = SaltClient()
    exe_action = service_controllers.get("stop", "")
    # 存在stop脚本先执行stop脚本后执行删除
    if exe_action:
        scripts_param = exe_action.split()
        if "hadoop" in exe_action:
            exe_action = f"{scripts_param[0]} stop all"
        if "doim" in exe_action:
            exe_action = f"{scripts_param[0]} all stop"
            # if len(scripts_param) > 3:
            #    return True
            # scripts_param.append("all")
            # exe_action = " ".join(scripts_param)
        for count in range(2):
            is_success, info = salt_obj.cmd(service_obj.ip, exe_action, 600)
            time.sleep(count + 1)
            if is_success is True or "No such file" in info:
                break
            logger.info(f"执行 [delete] 操作 {is_success}，原因: {info}")
    base_dir = delete_action(service_obj)
    app_dir = get_app_dir(service_obj)
    if not base_dir or not app_dir:
        logger.info(f"执行 [delete] 操作 {service_obj.service_instance_name}安装详情包不存在")
    # TODO 删除定时任务
    cron_del_str = f"crontab -l |grep -v {app_dir} 2>/dev/null | crontab -"
    cmd_res, msg = salt_obj.cmd(
        service_obj.ip, cron_del_str, 600
    )
    logger.info(f"执行 [delete] crontab操作 {cmd_res}, 原因: {msg}")

    # 删除安装路径
    if base_dir:
        is_success, info = salt_obj.cmd(
            service_obj.ip, f"/bin/rm -rf {base_dir}", 600)
        logger.info(f"执行 [delete] 操作 {is_success}，原因: {info}")
        return cmd_res and is_success
    return cmd_res


class DeleteMain:

    def __init__(self, service_obj, del_file, operation_user):
        self.service_obj = service_obj
        self.del_file = del_file
        self.operation_user = operation_user
        self.is_success = True
        if service_obj:
            self.ip = service_obj.ip

    def del_prometheus(self, service_obj, ser_name):
        service_port = None
        if service_obj.service_port is not None:
            service_port_ls = json.loads(service_obj.service_port)
            if len(service_port_ls) > 0:
                service_port = service_port_ls[0].get("default", "")
        if service_port is not None:
            # 端口存在则删除prometheus监控的

            service_data = {
                "service_name": ser_name,
                "instance_name": service_obj.service_instance_name,
                "data_path": None,
                "log_path": None,
                "env": service_obj.env.name,
                "ip": self.ip,
                "listen_port": service_port
            }
            PrometheusUtils().delete_service(service_data)

    def del_database(self, service_obj):
        host_instances = Host.objects.filter(ip=self.ip)
        del_str = "卸载服务实体" if self.del_file else "仅数据库卸载"
        for instance in host_instances:
            HostOperateLog.objects.create(username=self.operation_user,
                                          description=f"卸载服务 [{service_obj.service.app_name}] {del_str}",
                                          result="success" if self.is_success else "failed",
                                          host=instance)
        with transaction.atomic():
            service_obj.delete()
            # 看看是否需要打提前打污点
            # count = Service.objects.filter(ip=service_obj.ip).count()
            # Host.objects.filter(ip=service_obj.ip).update(
            #    service_num=count)
            # 当服务被删除时，应该将其所在的集群都连带删除
            # if service_obj.cluster and Service.objects.filter(
            #        cluster=service_obj.cluster
            # ).count() == 0:
            #    ClusterInfo.objects.filter(
            #        id=service_obj.cluster.id
            #    ).delete()
            # 当服务被删除时，如果他所属的产品下已没有其他服务，那么应该删除产品实例
            # if Service.objects.filter(
            #        service__product=service_obj.service.product
            # ).count() == 0:
            #    Product.objects.filter(
            #        product=service_obj.service.product
            #    ).delete()

    def del_main(self):
        split_not_del = True
        ser_name = self.service_obj.service.app_name
        service_controllers = self.service_obj.service_controllers
        delete_objs = []
        if ser_name == "hadoop":
            delete_objs = Service.objects.filter(ip=self.ip, service__app_name="hadoop")
            if not self.service_obj == delete_objs.first():
                split_not_del = False

        if split_not_del:
            if self.del_file:
                self.is_success = delete_file(service_controllers, self.service_obj)
            if delete_objs:
                for delete_obj in delete_objs:
                    ser_name = delete_obj.service_instance_name.split("_", 1)[0]
                    try:
                        self.del_prometheus(delete_obj, ser_name)
                    except Exception as e:
                        logger.error(f"卸载监控存在异常:详情{e}")
                    self.del_database(delete_obj)
                    #  Todo hadoop
                    if Service.objects.filter(service__app_name="hadoop").count() == 0:
                        ClusterInfo.objects.filter(
                            cluster_service_name='hadoop'
                        ).delete()
            else:
                try:
                    self.del_prometheus(self.service_obj, ser_name)
                except Exception as e:
                    logger.error(f"卸载监控存在异常:详情{e}")
                self.del_database(self.service_obj)
                # 日志清理策略删除，（批量减少资源消耗) 20231514
                clear_objs = ClearLogRule.objects.filter(
                    service_instance_name=self.service_obj.service_instance_name
                )
                if clear_objs:
                    res = LogRuleExec(
                        clear_objs.values_list("id", "host__ip", "host__data_folder"), 0
                    ).change_clear_action()
                    if res:
                        clear_objs.delete()
            return True


def order(service_obj, actions, need_reverse_restart=False):
    """
    执行顺序排序
    """
    basic_lists = []
    for m in range(10):
        if m not in BASIC_ORDER:
            break
        basic_list = [
            item for item in service_obj
            if item.service.app_name in BASIC_ORDER[m]
        ]
        if len(basic_list) != 0:
            basic_lists.append(basic_list)
    self_service = [
        item for item in service_obj
        if item.service.app_type == ApplicationHub.APP_TYPE_SERVICE
    ]
    # 0803
    self_ser_dc = {}
    for el in self_service:
        level = int(el.service.extend_fields.get("level", 0))
        self_ser_dc.setdefault(level, []).append(el)
    for _ in sorted(self_ser_dc.items(), key=lambda x: x[0]):
        basic_lists.append(_[1])
    # if len(self_service) != 0:
    #    basic_lists.append(self_service)
    if actions == "stop":
        basic_lists.reverse()
    if need_reverse_restart and actions == "restart":
        basic_copy = basic_lists[:]
        basic_lists.reverse()
        basic_lists.extend(basic_copy)
    return basic_lists


def check_result(future_list):
    """
    查看线程结果
    """
    for future in as_completed(future_list):
        future.result()
    time.sleep(5)


@shared_task
def create_job(many_data, ids, need_sleep=True):
    # 开启线程池子
    service_obj = Service.objects.filter(id__in=ids)
    status_dc = {"1": "start", "2": "stop"}
    action_str = status_dc.get(str(many_data[0].get("action", "")))
    if action_str:
        service_ls = order(service_obj, action_str)
    else:
        service_ls = [service_obj]
    # ToDo 暂时不考虑重启
    for index, service_ids in enumerate(service_ls):
        with ThreadPoolExecutor(THREAD_POOL_MAX_WORKERS) as executor:
            future_list = []
            for i in service_ids:
                future_obj = executor.submit(
                    exec_action, many_data[0].get("action"),
                    i.id, many_data[0].get("operation_user"),
                    many_data[0].get("del_file"),
                    need_sleep=need_sleep
                )
                future_list.append(future_obj)
            check_result(future_list)


@shared_task
def exec_action(action, id, operation_user="admin", del_file=False, need_sleep=True):
    # edit by vum: 增加服务的目标成功状态、失败状态
    action_json = {
        "1": ["start", 1, 0, 4],
        "2": ["stop", 2, 4, 0],
        "3": ["restart", 3, 0, 4],
        "4": ["delete", 4]
    }
    result_json = {
        True: "success",
        False: "failure"
    }
    try:
        service_obj = Service.objects.get(id=id)
    except Exception as e:
        logger.error(f"service实例id，不存在{id}:{e}")
        return None
    ip = service_obj.ip
    # service_controllers 字段为json字段类型
    service_controllers = service_obj.service_controllers
    action = action_json.get(str(action))
    if not action:
        logger.error("action动作不合法")
        raise ValueError("action动作不合法")

    if action[0] == 'delete':
        service_obj.service_status = Service.SERVICE_STATUS_DELETING
        service_obj.save()
        return DeleteMain(service_obj, del_file, operation_user).del_main()

    # 适配有的没写restart尝试重启
    exe_action = service_controllers.get(action[0])
    if action[0] == 'restart' and not exe_action:
        exe_action = f"{service_controllers.get('stop', '')} && {service_controllers.get('start', '')}"

    if exe_action:
        salt_obj = SaltClient()
        service_obj.service_status = action[1]
        service_obj.save()
        time_array = time.localtime(int(time.time()))
        time_style = time.strftime("%Y-%m-%d %H:%M:%S", time_array)
        is_success, info = salt_obj.cmd(ip, exe_action, 600)
        # TODO 服务状态维护问题，临时解决方案，休眠保持中间态
        if need_sleep:
            time.sleep(35)
        service_obj.service_status = action[2] if is_success else action[3]
        service_obj.save()
        logger.info(f"执行 [{action[0]}] 操作 {is_success}，原因: {info}")
        ServiceHistory.objects.create(
            username=operation_user,
            description=f"执行 [{action[0]}] 操作",
            result=result_json.get(is_success),
            created=time_style,
            service=service_obj
        )
        return ip, info
    else:
        logger.error(f"数据库无{action[0]}动作")
        raise ValueError(f"数据库无{action[0]}动作")


class LogRuleScan:
    def __init__(self, ip, service_dir_dc, host_dir):
        self.ip = ip
        self.service_dir_dc = service_dir_dc
        self.host_dir = host_dir

    def get_rule(self):
        salt_obj = SaltClient()
        collect_args = json.dumps(json.dumps(self.service_dir_dc))
        scripts_dir = os.path.join(self.host_dir[self.ip], "omp_salt_agent/scripts/log_handle.py")
        python_dir = os.path.join(self.host_dir[self.ip], "omp_salt_agent/env/bin/python3.8")
        return salt_obj.cmd(
            self.ip, f"{python_dir} {scripts_dir} {collect_args}", 600
        )

    def compare_diff(self, collect_objs, msg):
        """
        处理md5,获取需要入库的规则
        采集失败 - 失败
        规则存在且相同 - 失败
        规则存在且不同 - 失败
        规则不存在但校验失败 - 失败
        规则不存在但校验成功了 - 成功
        """
        # 找到service_instance_name 与 obj的对应关系 不再进行额外查询
        ser_name = {}
        for collect_obj in collect_objs:
            ser_name[collect_obj.service_instance_name] = collect_obj
        # 获取现有规则
        md5_compare = dict(ClearLogRule.objects.filter(
            service_instance_name__in=list(self.service_dir_dc)
        ).values_list("service_instance_name", "md5"))
        ser_dc = json.loads(msg)
        write_rule = {}
        for service, msg in ser_dc.items():
            his_obj = ser_name[service]
            if msg.get("status") != 0:
                if msg.get("msg") == "No such file":
                    status = CollectLogRuleHistory.IS_NO_FILE
                    result = "规则文件不存在或无需配置规则"
                else:
                    status = CollectLogRuleHistory.IS_FAILED
                    result = msg.get("msg")
            else:
                md5_str = md5_compare.get(service)
                if md5_str is None:
                    status = CollectLogRuleHistory.IS_SUCCESS
                    result = ""
                    write_rule[service] = msg
                else:
                    if md5_str == msg.get("md5"):
                        status = CollectLogRuleHistory.IS_REPEAT
                        result = "该服务的清理规则已存在，请忽略"
                    else:
                        status = CollectLogRuleHistory.IS_DIFF
                        result = "该服务的清理规则已存在，md5与之前不一致，请人工比对规则"
            his_obj.status = status
            his_obj.result = result
            his_obj.save()
        return write_rule

    def write_db(self, write_rules):
        host_obj = Host.objects.filter(ip=self.ip).first()
        clear_rule_ls = []
        for ser, msg in write_rules.items():
            rule_dc = {
                "service_instance_name": ser,
                "switch": ClearLogRule.IS_OFF,
                "md5": msg["md5"],
                "host": host_obj
            }
            for one_rule in msg["out"]:
                one_rule.update(rule_dc)
                clear_rule_ls.append(ClearLogRule(
                    **one_rule
                ))
        ClearLogRule.objects.bulk_create(clear_rule_ls)

    def run(self, uuid):
        collect_objs = CollectLogRuleHistory.objects.filter(
            operation_uuid=uuid, service_instance_name__in=list(self.service_dir_dc))
        # 获取
        res, msg = self.get_rule()
        if not res:
            collect_objs.update(
                status=CollectLogRuleHistory.IS_FAILED, result=msg
            )
            return False
        # 校验
        write_rules = self.compare_diff(collect_objs, msg)
        # 写库
        self.write_db(write_rules)
        return True


def log_write_shell_scripts(ip, host_dir, clear_id, write_dc):
    salt_obj = SaltClient()
    scripts_path = os.path.join(host_dir, "omp_salt_agent/scripts/clear_log.sh")
    compare_id = '\|'.join(clear_id)
    cmd_str = f"sed -i '/^echo \({compare_id}\) &&/'d {scripts_path}"
    logger.info(f"执行替换脚本 {cmd_str}")
    status, msg = salt_obj.cmd(
        ip, cmd_str, 600
    )
    if not status or not write_dc:
        return status, msg
    salt_obj.cmd(
        ip, f"sed -i '/^$/d' {scripts_path}", 600
    )
    write_cmd = f'echo -e "{"".join(write_dc)}" >> {scripts_path}'
    return salt_obj.cmd(
        ip, write_cmd, 600
    )


class LogRuleExec:
    def __init__(self, values, switch):
        self.values = values
        self.switch = switch

    @staticmethod
    def get_cmd_str(exec_dir, exec_type, exec_value, exec_rule):
        enumerate_type = {
            "byFileDay": f"-mtime +{int(exec_value) - 1}",
            "byFileSize": f"-size +{exec_value}M",
        }
        arg_type = enumerate_type.get(exec_type, "")
        if not arg_type:
            logger.info(f"无匹配的类型{exec_type}")
            return False
        if len(exec_dir) <= 10:
            logger.info(f"无匹配的类型{exec_dir}")
            return False
        cmd_str = f'find {exec_dir} -type f {arg_type} -name "{exec_rule}" -exec rm -rf {{}} \;'
        return cmd_str

    def change_clear_action(self):
        """必填项id host switch
           选填项 exec_dir exec_type exec_value exec_rule
           日志文件 clear_log.sh"""
        if len(self.values[0]) == 3 and self.switch:
            logger.info("缺少关键参数参数")
            return False
        clear_dc = {}
        write_dc = {}
        host_dc = {}
        for i in self.values:
            clear_dc.setdefault(i[1], []).append(str(i[0]))
            host_dc[i[1]] = i[2]
            if self.switch:
                cmd_str = self.get_cmd_str(*i[3:])
                if not cmd_str:
                    return False
                write_dc.setdefault(i[1], []).append(f"echo {i[0]} && {cmd_str}\n")
        future_list = []
        with ThreadPoolExecutor(THREAD_POOL_MAX_WORKERS) as executor:
            for ip, clear_id in clear_dc.items():
                future_obj = executor.submit(
                    log_write_shell_scripts,
                    ip, host_dc.get(ip), clear_id, write_dc.get(ip)
                )
                future_list.append(future_obj)
        for future in as_completed(future_list):
            status, msg = future.result()
            if not status:
                return False
        return True


@shared_task
@maintain
def log_clear_exec(task_id):
    host_obj = Host.objects.filter(id=task_id).first()
    scripts_path = os.path.join(host_obj.data_folder, "omp_salt_agent/scripts/clear_log.sh")
    log_dir = os.path.join(host_obj.data_folder, "omp_packages/logs/clear_log.log")
    salt_obj = SaltClient()
    cmd_str = f"bash {scripts_path} >> {log_dir}"
    status, msg = salt_obj.cmd(
        host_obj.ip, cmd_str, 600
    )
    status = "success" if status else "failed"
    HostOperateLog.objects.create(
        username="admin",
        description=f"执行清理计划任务,返回:{msg}",
        result=status,
        host=host_obj)
    logger.info(f"执行清理计划任务,状态:{status},返回:{msg}")


@shared_task
def log_rule_collect(uuid, task_args):
    """
    {"10.0.9.33":{
    "doucapi-9-33":["/data/app/doucApi/conf/auto_log_clean.json","/data/logs/doucApi"],
    "mysql-9-33":["/data/app/mysql/conf/auto_log_clean.json","/data/logs/mysql"]
    }
    ,
    "10.0.9.34":{
    "doucapi-9-34":["/data/app/doucApi/conf/auto_log_clean.json"."/data/logs/doucApi"]
    }
    }
    """
    host_dir = dict(
        Host.objects.filter(ip__in=list(task_args)).values_list("ip", "data_folder")
    )

    with ThreadPoolExecutor(THREAD_POOL_MAX_WORKERS) as executor:
        future_list = []
        for ip, service_dir_dc in task_args.items():
            future_obj = executor.submit(
                LogRuleScan(ip, service_dir_dc, host_dir).run,
                uuid,
            )
            future_list.append(future_obj)


@shared_task
def clear_db(task_id):
    """
    # ToDo 考虑优化
    """
    days_ago = timezone.now() - timezone.timedelta(
        days=CLEAR_DB.get('health').get("day", 7)
    )
    SelfHealingHistory.objects.filter(end_time__lt=days_ago).delete()
    days_ago = timezone.now() - timezone.timedelta(
        days=CLEAR_DB.get('alert').get("day", 7)
    )
    Alert.objects.filter(create_time__lt=days_ago).delete()
