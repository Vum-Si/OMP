import json
import logging
import os
import time
import datetime

from django.conf import settings
from django.http import Http404, HttpResponse
from django_filters.rest_framework.backends import DjangoFilterBackend
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import (
    ListModelMixin, RetrieveModelMixin,
    CreateModelMixin, UpdateModelMixin
)
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter, SearchFilter
from utils.parse_config import GATEWAY_DIC
from db_models.models import Service, ApplicationHub, \
    MainInstallHistory, Host, \
    CollectLogRuleHistory, ClearLogRule
from rest_framework_bulk import BulkDestroyAPIView, BulkUpdateAPIView
from service_upgrade.update_data_json import DataJsonUpdate
from services.permission import GetDataJsonAuthenticated
from services.tasks import create_job, exec_action, \
    log_rule_collect, LogRuleExec
from services.services_filters import ServiceFilter
from services.services_serializers import (
    ServiceSerializer, ServiceDetailSerializer,
    ServiceActionSerializer,
    ServiceStatusSerializer, AppListSerializer,
    LogCollectSerializer, LogClearRuleSerializer,
    HostCronRuleSerializer, GetSerUrlSerializer
)
from promemonitor.prometheus import Prometheus
from promemonitor.grafana_url import explain_url
from utils.common.exceptions import OperateError
from utils.common.paginations import PageNumberPager
from utils.common.filters import BulkDeleteFilter
from utils.plugin.public_utils import check_env_cmd
from services.utils import get_all_apps, check_repeat

from operator import itemgetter
from services.app_check import (
    ConfCheck, ManagerService
)

logger = logging.getLogger('server')


class ServiceListView(GenericViewSet, ListModelMixin):
    """
        list:
        查询服务列表
    """
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    pagination_class = PageNumberPager
    # 过滤，排序字段
    filter_backends = (DjangoFilterBackend, OrderingFilter)
    filter_class = ServiceFilter
    ordering_fields = ("ip", "service_instance_name")
    # 动态排序字段
    dynamic_fields = ("cpu_usage", "mem_usage")
    # 操作描述信息
    get_description = "查询服务列表"

    def list(self, request, *args, **kwargs):
        # 获取序列化数据列表
        queryset = self.filter_queryset(self.get_queryset())
        real_query = queryset

        # 实时获取服务动态git
        prometheus_obj = Prometheus()
        is_success, prometheus_dict = prometheus_obj.get_all_service_status()

        # 当未指定排序字段且查询成功时
        query_field = request.query_params.get("ordering", "")
        if is_success and query_field == "":
            stop_ls = []
            natural_ls = []
            no_monitor_ls = []
            ing_ls = []
            for service in queryset:
                # 当服务状态为 '正常' 和 '异常' 时
                if service.service_status in (Service.SERVICE_STATUS_NORMAL, Service.SERVICE_STATUS_STOP):
                    key_name = f"{service.ip}_{service.service_instance_name}"
                    status = prometheus_dict.get(key_name, None)
                    if status is None:
                        no_monitor_ls.append(service)
                    elif not status:
                        stop_ls.append(service)
                    else:
                        natural_ls.append(service)
                else:
                    ing_ls.append(service)
            real_query = stop_ls + ing_ls + natural_ls + no_monitor_ls

        serializer = self.get_serializer(
            self.paginate_queryset(real_query), many=True)
        serializer_data = serializer.data

        # 若获取成功，则动态覆盖服务状态
        if is_success:
            status_dict = {
                True: "正常",
                False: "停止",
                None: "未监控",
            }
            for service_obj in serializer_data:
                # 如果服务状态为 '正常' 和 '停止' 的服务，通过 Prometheus 动态更新
                if service_obj.get("service_status") in ("正常", "停止"):
                    # 如果是 web 服务，则状态直接置为正常
                    if service_obj.get("is_web"):
                        service_obj["service_status"] = "正常"
                        continue
                    key_name = f"{service_obj.get('ip')}_{service_obj.get('service_instance_name')}"
                    status = prometheus_dict.get(key_name, None)
                    service_obj["service_status"] = status_dict.get(status)
        else:
            for service_obj in serializer_data:
                service_obj["service_status"] = "未监控"
        # 获取监控及日志的url
        serializer_data = explain_url(
            serializer_data, is_service=True)

        serializer_data = prometheus_obj.get_service_info(serializer_data)
        reverse_flag = False
        if query_field.startswith("-"):
            reverse_flag = True
            query_field = query_field[1:]
        # 若排序字段在类视图 dynamic_fields 中，则对根据动态数据进行排序
        none_ls = list(filter(
            lambda x: x.get(query_field) is None,
            serializer_data))
        exists_ls = list(filter(
            lambda x: x.get(query_field) is not None,
            serializer_data))
        if query_field in self.dynamic_fields:
            exists_ls = sorted(
                exists_ls,
                key=lambda x: x.get(query_field),
                reverse=reverse_flag)
        exists_ls.extend(none_ls)
        return self.get_paginated_response(exists_ls)


class ServiceDetailView(GenericViewSet, RetrieveModelMixin):
    """
        read:
        查询服务详情
    """
    queryset = Service.objects.all()
    serializer_class = ServiceDetailSerializer
    # 操作描述信息
    get_description = "查询服务详情"


class ServiceActionView(GenericViewSet, CreateModelMixin):
    """
        create:
        服务启停删除
    """
    queryset = Service.objects.all()
    serializer_class = ServiceActionSerializer
    post_description = "执行启动停止或卸载操作"

    def check_param(self, many_data, service_objs, ids, action_ls):
        service_status_map = {"4": Service.SERVICE_STATUS_DELETING,
                              "2": Service.SERVICE_STATUS_STOPPING,
                              "1": Service.SERVICE_STATUS_STARTING,
                              "3": Service.SERVICE_STATUS_RESTARTING
                              }
        # action_ls = [str(actions.get("action", "5")) for actions in many_data]
        if len(set(action_ls)) != 1 or action_ls[0] == "5":
            raise OperateError("action动作不合法，或者不可同时执行多种类型")
        service_objs.update(
            service_status=service_status_map.get(action_ls[0]))
        # 兼容原始代码，当启停数量小于5时直接使用异步任务
        if len(service_objs) <= 5:
            for i in many_data:
                exec_action.delay(**i)
        else:
            create_job.delay(many_data, ids)

    def create(self, request, *args, **kwargs):
        many_data = self.request.data.get('data')
        ids = [data.get("id", "-1") for data in many_data]
        service_objs = Service.objects.filter(id__in=ids)
        action_ls = [str(actions.get("action", "5")) for actions in many_data]
        for status in service_objs.values_list("service_status", flat=True):
            if status > 4 and "4" not in action_ls:
                raise OperateError("服务状态异常，需解决异常后才可进行操作")
        ip_list = list(set(service_objs.values_list("ip", flat=True)))
        if many_data[0]["action"] != 4 or many_data[0].get("del_file"):
            res = check_env_cmd(ip=ip_list, need_check_agent=True)
            if isinstance(res, tuple):
                raise OperateError(res[1])
        if len(service_objs) != len(ids):
            raise OperateError("未找到对应的service_id")
        logger.info(f"调用服务操作接口参数:{many_data}")
        self.check_param(many_data, service_objs, ids, action_ls)
        return Response("执行成功")


class ServiceDeleteView(GenericViewSet, CreateModelMixin):
    """
        create:
        服务删除校验
    """
    queryset = Service.objects.all()
    serializer_class = ServiceActionSerializer
    post_description = "查看服务删除校验依赖"

    def create(self, request, *args, **kwargs):
        """
        检查被依赖关系，包含多服务匹配
        例如 jdk-1.8和 test-app被同时标记删除
        test-app依赖jdk-1.8，同时标记则不显示依赖。单选jdk1.8则会显示。
        """
        many_data = self.request.data.get('data')
        service_objs = Service.objects.all()
        app_objs = ApplicationHub.objects.all()
        service_json = {}
        dependence_dict = []
        # 存在的service key
        for i in service_objs:
            service_key = f"{i.service.app_name}-{i.service.app_version}"
            service_json[i.id] = service_key
        # 全量app的dependence反向
        for app in app_objs:
            if app.app_dependence:
                for i in json.loads(app.app_dependence):
                    dependence_dict.append(
                        {f"{i.get('name')}-{i.get('version')}": f"{app.app_name}-{app.app_version}"}
                    )
        exist_service = set()
        # 过滤存在的实例所属app的key
        for data in many_data:
            instance = int(data.get("id"))
            filter_list = service_json.get(instance)
            exist_service.add(filter_list)
        # 查看存在的服务有没有被依赖的，做set去重
        res = set()
        for i in exist_service:
            for j in dependence_dict:
                if j.get(i):
                    res.add(j.get(i))
        res = res - exist_service
        # 查看是否需要被依赖的是否已不存在
        res = res & set(service_json.values())
        res = "存在依赖信息:" + ",".join(res) if res else "无依赖信息"
        return Response(res)


class ServiceStatusView(GenericViewSet, ListModelMixin):
    """
        list:
        查询服务列表
    """
    queryset = Service.objects.filter(
        service__is_base_env=False)
    serializer_class = ServiceStatusSerializer
    authentication_classes = ()
    permission_classes = ()
    # 操作描述信息
    get_description = "查询服务状态"

    def list(self, request, *args, **kwargs):
        # 获取序列化数据列表
        queryset = self.get_queryset()
        real_query = queryset
        # 实时获取服务动态git
        prometheus_obj = Prometheus()
        is_success, prometheus_dict = prometheus_obj.get_all_service_status()
        if is_success:
            stop_ls = []
            natural_ls = []
            no_monitor_ls = []
            ing_ls = []
            for service in queryset:
                # 当服务状态为 '正常' 和 '异常' 时
                if service.service_status in (Service.SERVICE_STATUS_NORMAL, Service.SERVICE_STATUS_STOP):
                    key_name = f"{service.ip}_{service.service_instance_name}"
                    status = prometheus_dict.get(key_name, None)
                    if status is None:
                        no_monitor_ls.append(service)
                    elif not status:
                        stop_ls.append(service)
                    else:
                        natural_ls.append(service)
                else:
                    ing_ls.append(service)
            real_query = stop_ls + ing_ls + natural_ls + no_monitor_ls

        serializer = self.get_serializer(real_query, many=True)
        serializer_data = serializer.data

        # 若获取成功，则动态覆盖服务状态
        if is_success:
            for service_obj in serializer_data:
                # 如果服务状态为 '正常' 和 '停止' 的服务，通过 Prometheus 动态更新
                if service_obj.get("service_status") in ("正常", "停止"):
                    # 如果是 web 服务，则状态直接置为正常
                    if service_obj.get("is_web"):
                        service_obj["service_status"] = True
                        continue
                    key_name = f"{service_obj.get('ip')}_{service_obj.get('service_instance_name')}"
                    status = prometheus_dict.get(key_name, None)
                    service_obj["service_status"] = status
        return Response(serializer_data)


class ServiceDataJsonView(APIView):
    # for automated testing
    permission_classes = (GetDataJsonAuthenticated,)

    def get(self, request):
        """
        获取服务数据(自动化测试接口)
        """
        main_install = MainInstallHistory.objects.order_by("-id").first()
        if not main_install:
            raise Http404('No install history matches the given query.')
        json_path = os.path.join(
            settings.PROJECT_DIR,
            f"package_hub/data_files/{main_install.operation_uuid}.json"
        )
        if not os.path.exists(json_path):
            DataJsonUpdate(main_install.operation_uuid).create_json_file()
        try:
            def read_file(filename, buf_size=8192):
                with open(filename, "rb") as f:
                    while True:
                        content = f.read(buf_size)
                        if content:
                            yield content
                        else:
                            break

            response = HttpResponse(read_file(json_path))
            response["Content-Disposition"] = \
                f"attachment;filename={main_install.operation_uuid}.json"
        except FileNotFoundError:
            logger.error(f"{json_path} not found")
            raise OperateError("组件模板文件缺失")
        return response


class AppListView(GenericViewSet, ListModelMixin, CreateModelMixin):
    """
        list:
        应用列表查询

        create:
        列表合法性校验
    """
    queryset = ApplicationHub.objects.all().exclude(
        app_name__in=["hadoop", "doim"])
    serializer_class = AppListSerializer
    get_description = "应用列表查询"
    post_description = "列表合法性校验"
    need_key = ['base_dir', 'run_user', 'service_port', 'data_dir', 'log_dir']

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        app_ls = get_all_apps(queryset)
        return Response(app_ls)

    @staticmethod
    def check_dependence_one(dependence_dc, installed_ser_all):
        """
        检查单个服务依赖是否存在
        """
        # ToDo 考虑正则情况
        lost_ser = []
        for dependence in dependence_dc:
            dependence_ser = f'{dependence.get("name")}:{dependence.get("version")}'
            if dependence_ser not in installed_ser_all:
                lost_ser.append(dependence_ser)
        return lost_ser

    def check_dependence(self, dependence_dc, app_dc, app_data):
        """
        查询依赖初次筛选。仅对照应用商店实例，不对照具体实例依赖,并追加参数
        """
        if self.error:
            return
        # 查询当前所有服务的name:version,过滤状态异常的服务
        ser_name_version = Service.objects.filter(service_status__in=range(0, 5)).values_list(
            "service__app_name", "service__app_version")
        installed_ser = []
        for ser in ser_name_version:
            installed_ser.append(f"{ser[0]}:{ser[1].split('.')[0]}")

        for info in app_data:
            lost_ser_set = set()
            if info.get("child") and list(info["child"].values())[0]:
                for app in list(info["child"].values())[0]:
                    app_key = f"{app['name']}:{app['version']}"
                    lost_ser = self.check_dependence_one(
                        dependence_dc.get(app_key), installed_ser)
                    lost_ser_set.update(set(lost_ser))
                    has_install_app_args = dict(zip(self.need_key, app_dc.get(app_key))) if app_dc.get(
                        app_key) else dict(zip(self.need_key, [""] * len(self.need_key)))
                    app.update(has_install_app_args)
            else:
                app_key = f'{info.get("name", "")}:{info.get("version", ["0"])[0]}'
                lost_ser = self.check_dependence_one(
                    dependence_dc.get(app_key), installed_ser)
                lost_ser_set.update(set(lost_ser))
                has_install_app_args = dict(zip(self.need_key, app_dc.get(app_key))) if app_dc.get(
                    app_key) else dict(zip(self.need_key, [""] * len(self.need_key)))
                info.update(has_install_app_args)
            if lost_ser_set:
                info.update({"error": f'缺失依赖:{",".join(list(lost_ser_set))}'})
                self.error = True

    @staticmethod
    def explain_json(text):
        if text:
            return json.loads(text)
        return []

    @classmethod
    def gets_app_list(cls):
        """
        获取app列表信息
        """
        app_ls = ApplicationHub.objects.all(). \
            values_list("app_name", "app_version", "app_install_args",
                        "app_port", "app_dependence")
        app_dc = {}
        dependence_dc = {}
        for app in app_ls:
            app_install_port = {}
            for install in cls.explain_json(app[2]):
                app_install_port[install.get('key')] = install.get('default')
            for port in cls.explain_json(app[3]):
                app_install_port[port.get('key')] = port.get('default')
            for key in cls.need_key:
                app_install_port.setdefault(key, "")
            app_dc[f"{app[0]}:{app[1]}"] = itemgetter(
                *cls.need_key)(app_install_port)
            dependence_dc[f"{app[0]}:{app[1]}"] = cls.explain_json(app[4])
        return app_dc, dependence_dc

    def create(self, request, *args, **kwargs):
        if not hasattr(self, "error"):
            setattr(self, "error", False)
        app_data = self.request.data.get("data", [])
        # 查询是否勾选想通服务多版本情况
        self.error = check_repeat(app_data)
        # 查询安装参数及依赖
        app_dc, dependence_dc = self.gets_app_list()
        # 检查依赖是否存在
        self.check_dependence(dependence_dc, app_dc, app_data)
        res_dc = {"service": app_data,
                  "is_continue": False if self.error else True}
        hosts_info = Host.objects.filter(
            host_agent=Host.AGENT_RUNNING).values_list("ip", "agent_dir")
        res_dc["ips"] = dict(hosts_info)
        return Response(res_dc)


class AppConfCheckView(GenericViewSet, CreateModelMixin):
    queryset = ApplicationHub.objects.all()
    serializer_class = AppListSerializer
    post_description = "校验列表问题"

    def create(self, request, *args, **kwargs):
        """
        传uuid和不传uuid
        """
        app_data = self.request.data.get("data")
        if not app_data.get("uuid"):
            if not app_data.pop("is_continue"):
                raise OperateError("存在不允许继续纳管的服务")
            app_data = ConfCheck(app_data).run()
        else:
            app_data = ManagerService(app_data).run()
        return Response(app_data)


class LogRuleCollectView(GenericViewSet, ListModelMixin, CreateModelMixin):
    """
        list:
        日志清理规则扫描结果

        create:
        扫描日志清理规则
    """
    serializer_class = LogCollectSerializer

    def get_queryset(self):
        operation_uuid = self.request.query_params.get('operation_uuid')
        if operation_uuid:
            return CollectLogRuleHistory.objects.filter(operation_uuid=operation_uuid).order_by("status")
        else:
            raise OperateError(f"需要填写id")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        status_ls = [i.get("status") for i in serializer.data]
        result_flag = "complete"
        if 2 in status_ls:
            result_flag = "running"
        return Response({"data": serializer.data,
                         "result_flag": result_flag}
                        )

    def create(self, request, *args, **kwargs):
        time_now = datetime.datetime.now()
        time_str = time_now.strftime("%Y-%m-%d %H:%M:%S")
        expire_time = (time_now + datetime.timedelta(hours=-1)).strftime("%Y-%m-%d %H:%M:%S")

        if CollectLogRuleHistory.objects.filter(
                status=CollectLogRuleHistory.IS_RUNNING,
                created__gt=expire_time).count() != 0:
            return Response(data={"code": 1, "message": "存在正在采集的任务"})
        uuid = str(round(time.time() * 1000))
        ip_ls = Host.objects.filter(
            host_agent=Host.AGENT_RUNNING
        ).values_list("ip", flat=True)
        service_objs = Service.objects.filter(
            ip__in=ip_ls, service__is_base_env=False)
        if not service_objs:
            return Response(data={"code": 1, "message": "无可扫描的服务，或当前服务所在的主机均不可用"})
        task_args = {}
        his_ls = []
        for ser_obj in service_objs:
            install_args = ser_obj.get_install_args
            conf_dir = os.path.join(install_args["base_dir"], "conf/auto_log_clean.json")
            task_args.setdefault(ser_obj.ip, dict()).update(
                {ser_obj.service_instance_name: [conf_dir, install_args.get("log_dir", "")]}
            )
            his_ls.append(
                CollectLogRuleHistory(
                    service_instance_name=ser_obj.service_instance_name,
                    operation_uuid=uuid,
                    created=time_str
                )
            )
        for host_obj in Host.objects.all():
            conf_dir = os.path.join(host_obj.data_folder, "omp_salt_agent/conf/auto_log_clean.json")
            task_args.setdefault(host_obj.ip, dict()).update(
                {host_obj.instance_name: [conf_dir, os.path.join(host_obj.data_folder, "omp_packages")]}
            )
            his_ls.append(
                CollectLogRuleHistory(
                    service_instance_name=host_obj.instance_name,
                    operation_uuid=uuid,
                    created=time_str
                )
            )

        CollectLogRuleHistory.objects.bulk_create(his_ls)
        log_rule_collect.delay(uuid, task_args)
        return Response({"operation_uuid": uuid})


# 主机接口修改需要考虑是周期任务的执行
class LogClearRuleView(GenericViewSet, BulkDestroyAPIView, ListModelMixin,
                       CreateModelMixin, UpdateModelMixin):
    """
        list:
        获取日志清理列表

        create:
        修改日志清理规则

        update:
        修改日志清理规则

        partial_update:
        修改日志清理规则一个或多个字段
    """
    queryset = ClearLogRule.objects.all()
    serializer_class = LogClearRuleSerializer
    filter_backends = (BulkDeleteFilter,)

    def create(self, request, *args, **kwargs):
        many_data = request.data
        dict_dc = dict([(i["id"], i["switch"]) for i in many_data])
        clear_objs = self.get_queryset().filter(id__in=list(dict_dc))
        if clear_objs.count() != len(dict_dc):
            raise OperateError("请求id不存在")
        # 进行批量操作
        exec_obj = LogRuleExec(clear_objs.values_list(
            "id", "host__ip", "host__data_folder", "exec_dir", "exec_type", "exec_value", "exec_rule"
        ), int(many_data[0]["switch"]))
        if not exec_obj.change_clear_action():
            raise OperateError("修改状态异常")
        # 修改库
        for obj in clear_objs:
            obj.switch = dict_dc.pop(obj.id)
            obj.save()
        return Response("修改成功")

    def allow_bulk_destroy(self, qs, filtered):
        # 进行批量操作
        exec_obj = LogRuleExec(filtered.values_list("id", "host__ip", "host__data_folder"), 0)
        return exec_obj.change_clear_action()


class HostCronView(GenericViewSet, ListModelMixin, BulkUpdateAPIView):
    """
    主机策略更新（删除）
    主机策略初始化
    """
    queryset = Host.objects.all()
    serializer_class = HostCronRuleSerializer


class GetSerUrlView(GenericViewSet, ListModelMixin):
    queryset = Service.objects.filter(service__app_name__in=list(GATEWAY_DIC))
    serializer_class = GetSerUrlSerializer

    @staticmethod
    def service_port(port_text):
        for i in json.loads(port_text):
            if i.get("key") == "service_port":
                return i.get("default")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        app_info = {}
        for info in serializer.data:
            app_name = info.pop("app_name")
            if not app_info.get(app_name):
                info["ip"] = [info["ip"]]
                app_info[app_name] = info
            else:
                app_info[app_name]["ip"].append(info["ip"])
        for app, info in app_info.items():
            app_count = len(info["ip"])
            info["ip"] = info["ip"][0]
            info.update(GATEWAY_DIC[app])
            if app_count != 1:
                info.update(GATEWAY_DIC[app].get("cluster", {}))
            if not info.get("port"):
                info["port"] = self.service_port(info.get("service_port"))
            info.pop("service_port")
            info.pop("cluster", "")

        res_ls = []
        for app, info in app_info.items():
            ip = info["ip"]
            if ip in list(app_info):
                ip = app_info[ip]["ip"]
            res_ls.append({
                "app_name": app,
                "username": info["username"],
                "password": info["password"],
                "url": f"http://{ip}:{info['port']}{info.get('url', '')}"
            })
        return Response(res_ls)
