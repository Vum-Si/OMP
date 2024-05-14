import json
import logging
import traceback

from django.db import models, transaction
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.generics import ListAPIView, GenericAPIView, \
    RetrieveUpdateAPIView
from rest_framework.response import Response
from app_store.new_install_utils import RedisDB
from db_models.mixins import UpgradeStateChoices, RollbackStateChoices
from db_models.models import UpgradeHistory, Service, ApplicationHub, Env, \
    UpgradeDetail, RollbackHistory, RollbackDetail
from utils.common.exceptions import GeneralError
from utils.common.paginations import PageNumberPager
from .filters import RollBackHistoryFilter
from .serializers import UpgradeHistorySerializer, ServiceSerializer, \
    UpgradeHistoryDetailSerializer, ApplicationHubSerializer, \
    UpgradeTryAgainSerializer, RollbackHistorySerializer, \
    RollbackHistoryDetailSerializer, RollbackTryAgainSerializer, \
    RollbackListSerializer
from .tasks import upgrade_service, rollback_service
from .update_data_json import DataJsonUpdate
from utils.plugin.public_utils import check_env_cmd
from app_store.new_install_utils import DeployTypeUtil
from utils.parse_config import IGNORE_UPGRADE_APP, IGNORE_ROLLBACK_APP

logger = logging.getLogger("server")


class UpgradeHistoryListAPIView(ListAPIView):
    """
        list:
        回滚历史记录页
    """
    # 升级历史记录
    pagination_class = PageNumberPager
    queryset = UpgradeHistory.objects.all() \
        .prefetch_related("upgradedetail_set")
    filter_backends = (OrderingFilter,)
    serializer_class = UpgradeHistorySerializer
    ordering_fields = ("id",)
    ordering = ('-id',)
    get_description = "升级历史记录页"


class UpgradeHistoryDetailAPIView(RetrieveUpdateAPIView):
    """
        list:
        升级历史记录详情页

        update:
        升级重试

        partial_update:
        升级重试
    """
    # 升级历史记录详情
    queryset = UpgradeHistory.objects.all() \
        .prefetch_related("upgradedetail_set")
    serializer_class = UpgradeHistoryDetailSerializer
    lookup_url_kwarg = 'pk'
    get_description = "升级历史记录详情页"
    put_description = "升级重试"

    def update(self, request, *args, **kwargs):
        # put 升级重试
        instance = self.get_object()
        serializer = UpgradeTryAgainSerializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        redis_obj = RedisDB()
        task = upgrade_service.delay(instance.id)
        redis_obj.set(f"upgrade_{instance.id}", task.task_id)
        return Response()


class UpgradeChoiceAllVersionListAPIView(GenericAPIView):
    # 可升级服务列表（可选择升级的目标）
    queryset = Service.split_objects.filter(
        service_status__in=[0, 1, 2, 3, 4]
    ).select_related("service")
    filter_backends = (SearchFilter,)
    search_fields = ("service__app_name",)
    get_description = "可升级服务列表"

    def get_service_info(self, services_data):
        """
        确定已安装服务最小版本，缩小查询范围及组装数据
        """
        service_min_app_ids, services_versions = {}, {}
        for service_data in services_data:
            app_name = service_data.get("app_name")
            app_id = service_data.get("app_id")
            min_app_id = service_min_app_ids.get(app_name, None)
            if app_name not in services_versions:
                services_versions[app_name] = [service_data]
            else:
                services_versions[app_name].append(service_data)
            if min_app_id is None or app_id < min_app_id:
                service_min_app_ids[app_name] = app_id
        return services_versions, service_min_app_ids

    def get(self, requests):
        queryset = self.filter_queryset(self.get_queryset())
        services_data = ServiceSerializer(queryset, many=True).data
        if not services_data:
            return Response({"results": []})
        services_v, min_app_ids = self.get_service_info(
            services_data)
        # 查询服务可能存在可升级的安装包
        apps = ApplicationHub.objects.filter(
            id__gt=min(min_app_ids.values()),
            app_name__in=services_v.keys()
        ).order_by("-id").exclude(id__in=min_app_ids.values())
        if not apps:
            return Response({"results": []})
        # 确定服务可升级的安装包
        apps_data = ApplicationHubSerializer(apps, many=True).data
        for app_data in apps_data:
            app_id = app_data.get("app_id")
            app_name = app_data.pop("app_name")
            if min_app_ids.get(app_name, float("inf")) >= app_id:
                apps_data.remove(app_data)
                continue
            for service_v in services_v.get(app_name):
                if service_v.get("app_id", float("inf")) >= app_id:
                    continue
                if "can_upgrade" not in service_v:
                    service_v["can_upgrade"] = [app_data]
                else:
                    service_v["can_upgrade"].append(app_data)
        # 格式化数据，排除不可升级服务
        results = []
        # {"a": [{""}, {}]}
        for app_name, services in services_v.items():
            if not services:
                services_v.pop(app_name)
            upgrade_services = []
            for service in services:
                if service.get("can_upgrade"):
                    upgrade_services.append(service)
            if upgrade_services:
                results.append(
                    {"app_name": app_name, "children": upgrade_services}
                )
        # results: [{"app_name": a, "service": [{"can_upgrade": []...}]
        return Response({"results": results})


class UpgradeChoiceMaxVersionListAPIView(UpgradeChoiceAllVersionListAPIView):
    # 可升级服务列表（只展示可供升级的最高版本）
    get_description = "可升级服务列表"

    def get_service_max_app(self, apps):
        max_apps = {}
        for app in apps:
            if app["app_name"] in IGNORE_UPGRADE_APP:
                continue
            app_info = max_apps.get(app["app_name"], {})
            if app_info.get("app_id", float("-inf")) <= app["app_id"]:
                max_apps[app["app_name"]] = app
        return max_apps

    def get(self, requests):
        """ 可升级服务列表 """
        queryset = self.filter_queryset(self.get_queryset())
        services_data = ServiceSerializer(queryset, many=True).data
        if not services_data:
            return Response({"results": []})
        services_v, min_app_ids = self.get_service_info(
            services_data)
        # 查询服务可能存在可升级的安装包
        apps = ApplicationHub.objects.filter(
            id__gt=min(min_app_ids.values()),
            app_name__in=services_v.keys()
        ).order_by("-id").exclude(id__in=min_app_ids.values())
        if not apps:
            return Response({"results": []})
        # 确定服务可升级的安装包
        apps_data = ApplicationHubSerializer(apps, many=True).data
        max_apps_dict = self.get_service_max_app(apps_data)
        results = []
        for app_name, max_app in max_apps_dict.items():
            services = services_v.get(app_name)
            upgrade_services = []
            for service_v in services:
                if service_v.get("app_id", float("inf")) >= max_app["app_id"]:
                    continue
                service_v["can_upgrade"] = [max_app]
                upgrade_services.append(service_v)
            if upgrade_services:
                results.append(
                    {
                        "app_name": app_name,
                        "children": upgrade_services,
                        "can_upgrade": max_app
                    }
                )
        return Response({"results": results})


class DoUpgradeAPIView(GenericAPIView):
    post_description = "升级服务"

    def valid_can_upgrade(self, data):
        # 校验信息
        service_queryset = Service.split_objects.filter(
            id__in=data.keys(),
            service_status__in=[0, 1, 2, 3, 4]
        )
        services = list(
            service_queryset.annotate(
                app_name=models.F("service__app_name"),
                current_app_id=models.F("service_id")
            ).values(
                "id", "app_name", "ip", "current_app_id", "service_dependence"
            )
        )
        if not services:
            raise GeneralError("请选择需要升级的服务！")
        app_queryset = ApplicationHub.objects.filter(
            id__in=data.values(),
            is_release=True
        )
        apps = app_queryset.values(
            "id", "app_name", "app_version", "app_dependence")
        app_dict = {}
        for app in apps:
            app_dict[app.get("app_name")] = {
                "target_app_id": app.get("id"),
                "app_dependence": json.loads(
                    app.get("app_dependence") or '[]'
                )
            }
        for service in services:
            app_name = service.get("app_name")
            app_info = app_dict.get(app_name, {})
            if app_info.get("target_app_id", float("-inf")) \
                    <= service["current_app_id"]:
                raise GeneralError(f"服务{app_name}升级版本小于或等于当前版本！")
            try:
                _app = app_queryset.filter(
                    id=app_info.get("target_app_id")).first()
                _service = service_queryset.filter(
                    id=service.get("id")).first()
                dependence_list = DeployTypeUtil(
                    _app, app_info.get("app_dependence", [])
                ).get_dependence_by_deploy(_service.deploy_mode)
                Service.update_dependence(
                    service.get("service_dependence"),
                    dependence_list
                )
            except Exception as e:
                raise GeneralError(
                    f"服务{service.get('app_name')}依赖校验失败：{str(e)}")
            service.update(app_dict.get(app_name))
        return services, service_queryset

    def post(self, requests):
        """ 执行服务升级 """
        # if UpgradeHistory.objects.filter(
        #        upgrade_state__in=[
        #            UpgradeStateChoices.UPGRADE_WAIT,
        #            UpgradeStateChoices.UPGRADE_ING,
        #        ]
        # ).exists():
        #    raise GeneralError("存在正在升级的服务，请稍后！")
        # if RollbackHistory.objects.filter(
        #        rollback_state__in=[
        #            RollbackStateChoices.ROLLBACK_WAIT,
        #            RollbackStateChoices.ROLLBACK_ING,
        #        ]
        # ).exists():
        #    raise GeneralError("存在正在回滚的服务，请稍后！")
        # fail_query = UpgradeDetail.objects.filter(
        #    upgrade_state=UpgradeStateChoices.UPGRADE_FAIL,
        #    service__isnull=False
        # ).exclude(has_rollback=True)
        # if fail_query.exists():
        #    fail_services = list(
        #        fail_query.values_list("union_server", flat=True)
        #    )
        #    raise GeneralError(
        #        f"存在升级失败的服务，请继续升级或回滚！失败服务：{fail_services}")
        choices = requests.data.get("choices", [])
        if not choices:
            raise GeneralError("请选择需要升级的服务！")
        try:
            data = {}
            for choice in choices:
                if choice.get("service_id") in data:
                    raise KeyError(f'{choice.get("service_id")}重复！')
                data[choice.get("service_id")] = choice.get("app_id")
        except Exception as e:
            logger.error(
                f"解析升级数据错误：{str(e)}, 详情为：\n{traceback.format_exc()}")
            raise GeneralError("解析升级数据错误！")
        services, ser_objs = self.valid_can_upgrade(data)
        res = check_env_cmd(
            ip=list(set([i["ip"] for i in services])),
            need_check_agent=True
        )
        if isinstance(res, tuple):
            raise GeneralError(res[1])
        for status in ser_objs.values_list("service_status", "service_instance_name"):
            if status[0] > 4:
                raise GeneralError(f"{status[1]}服务状态异常不可升级")
        with transaction.atomic():
            ser_objs.update(service_status=Service.SERVICE_STATUS_UPGRADE)
            history = UpgradeHistory.objects.create(
                env=Env.objects.first(),
                operator=requests.user
            )
            details = []
            for service in services:
                service_id = service.pop("id")
                app_name = service.pop("app_name")
                ip = service.pop("ip")
                service.pop("app_dependence")
                service.pop("service_dependence")
                details.append(
                    UpgradeDetail(
                        history=history,
                        service_id=service_id,
                        union_server=f"{ip}-{app_name}",
                        **service,
                    )
                )
            UpgradeDetail.objects.bulk_create(details)
            # for post save
            history.save()
        redis_obj = RedisDB()
        task = upgrade_service.delay(history.id)
        redis_obj.set(f"upgrade_{history.id}", task.task_id)
        return Response({"history": history.id})


class RollbackHistoryListAPIView(ListAPIView):
    """
        list:
        回滚历史记录页
    """
    pagination_class = PageNumberPager
    queryset = RollbackHistory.objects.all() \
        .prefetch_related("rollbackdetail_set")
    filter_backends = (OrderingFilter,)
    serializer_class = RollbackHistorySerializer
    ordering_fields = ("id",)
    ordering = ('-id',)
    get_description = "回滚历史记录页"


class RollbackHistoryDetailAPIView(RetrieveUpdateAPIView):
    """
        list:
        回滚历史记录详情页

        update:
        回滚重试

        partial_update:
        回滚重试
    """
    queryset = RollbackHistory.objects.all() \
        .prefetch_related("rollbackdetail_set")
    serializer_class = RollbackHistoryDetailSerializer
    lookup_url_kwarg = 'pk'
    get_description = "回滚历史记录详情页"
    put_description = "回滚重试"

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = RollbackTryAgainSerializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        redis_obj = RedisDB()
        task = rollback_service.delay(instance.id)
        redis_obj.set(f"rollback_{instance.id}", task.task_id)
        return Response()


class RollbackChoiceListAPIView(GenericAPIView):
    queryset = UpgradeDetail.objects.filter(
        upgrade_state__in=[
            UpgradeStateChoices.UPGRADE_SUCCESS,
            UpgradeStateChoices.UPGRADE_FAIL
        ],
        target_app__isnull=False,
        current_app__isnull=False,
        service__isnull=False
    ).exclude(has_rollback=True)
    filter_backends = (SearchFilter, RollBackHistoryFilter)
    search_fields = ("target_app__app_name",)
    get_description = "可回滚服务列表页"

    def get(self, requests):
        """
        可回滚服务列表页
        """
        error_ids = set(
            RollbackDetail.objects.exclude(
                rollback_state=RollbackStateChoices.ROLLBACK_SUCCESS).select_related(
                "upgrade").values_list(
                "upgrade__service__id", flat=True))
        error_app = set()
        queryset = self.filter_queryset(self.get_queryset())
        upgrades_data = RollbackListSerializer(queryset, many=True).data
        service_id_max_d, service_name_max_d = {}, {}
        for upgrade_data in upgrades_data:
            service_id = upgrade_data.get("service_id")
            detail_id = upgrade_data.get("id")
            app_name = upgrade_data.get("app_name")
            # 回滚时的上次回滚异常在未解决之前不被允许再次回滚
            if service_id in error_ids:
                error_app.add(app_name)
            if app_name in IGNORE_ROLLBACK_APP or app_name in error_app:
                continue
            service_max_data = service_id_max_d.get(service_id, {})
            if service_max_data.get("id", float("-inf")) > detail_id:
                continue
            service_id_max_d[service_id] = upgrade_data
            if app_name not in service_name_max_d:
                service_name_max_d[app_name] = {service_id: upgrade_data}
            else:
                service_name_max_d[app_name].update({service_id: upgrade_data})
        response_data = [
            {"app_name": app_name, "children": list(max_info.values())}
            for app_name, max_info in service_name_max_d.items()
        ]
        return Response(data={"results": response_data})


class ChangeSerAPIView(GenericAPIView):
    post_description = "修改服务"
    # 关闭权限、认证设置
    authentication_classes = ()
    permission_classes = ()

    def post(self, requests):
        """ 修改服务 """
        response_data = requests.data
        app_name = response_data.get('app_name')
        old_v = response_data.get('old_v')
        new_v = response_data.get('new_v')
        new_app = ApplicationHub.objects.filter(
            app_name=app_name, app_version=new_v).first()

        if not new_app:
            raise GeneralError(f"数据库无{app_name}版本为{new_app}的包")
        if new_app.service_set.count() != 0:
            return Response("存在新版本服务无需修改")
        if old_v:
            old_app = ApplicationHub.objects.filter(
                app_name=app_name, app_version=old_v).first()
            ser_objs = Service.objects.filter(service=old_app)
        else:
            old_app = ApplicationHub.objects.filter(
                app_name=app_name).exclude(app_version=new_v)
            ser_objs = []
            for i in old_app:
                if i.service_set.count() != 0:
                    ser_objs = i.service_set.all()
                    break
        if len(ser_objs) == 0:
            raise GeneralError(f"当前服务{app_name}版本为{old_v}未存在安装实例")
        for obj in ser_objs:
            install_args = DataJsonUpdate. \
                get_ser_install_args(obj, json.loads(new_app.app_install_args))
            obj.update_application(new_app, True)
            detail_obj = obj.detailinstallhistory_set.first()
            detail_obj.install_detail_args.update(install_args)
            detail_obj.save()
        return Response("修改成功")


class DoRollbackAPIView(GenericAPIView):
    get_description = "回滚服务"

    def post(self, requests):
        """
        执行服务回滚
        """
        # if UpgradeHistory.objects.filter(
        #        upgrade_state__in=[
        #            UpgradeStateChoices.UPGRADE_WAIT,
        #            UpgradeStateChoices.UPGRADE_ING,
        #        ]
        # ).exists():
        #    raise GeneralError("存在正在升级的服务，请稍后！")
        # if RollbackHistory.objects.filter(
        #        rollback_state__in=[
        #            RollbackStateChoices.ROLLBACK_WAIT,
        #            RollbackStateChoices.ROLLBACK_ING,
        #        ]
        # ).exists():
        #    raise GeneralError("存在正在回滚的服务，请稍后！")
        choices = requests.data.get("choices", [])
        if not choices:
            raise GeneralError("请选择需要回滚的记录！")
        upgrade_details_objs = UpgradeDetail.objects.filter(
            id__in=choices,
            upgrade_state__in=[
                UpgradeStateChoices.UPGRADE_SUCCESS,
                UpgradeStateChoices.UPGRADE_FAIL
            ]
        )
        if upgrade_details_objs.count() != len(choices):
            raise GeneralError("提交信息校验失败，请刷新重试！")
        upgrade_details = upgrade_details_objs.values("id", "current_app_id", "union_server")
        # 校验同一个服务是否回滚至同一版本
        union_app = {}
        for detail in upgrade_details:
            rollback_app_id = detail.get("current_app_id")
            union_server = detail.get("union_server")
            if not union_server:
                raise GeneralError(f"实例{union_server}不在平台纳管范围！")
            if not union_app.get(union_server):
                union_app[union_server] = rollback_app_id
                continue
            if union_app.get(union_server) != rollback_app_id:
                raise GeneralError(f"实例{union_server}将回滚的服务版本不一致！")

        ips = set([upgrade_detail.service.ip for upgrade_detail in upgrade_details_objs])
        res = check_env_cmd(ip=list(ips), need_check_agent=True)
        if isinstance(res, tuple):
            raise GeneralError(res[1])

        for upgrade_detail in upgrade_details_objs:
            if upgrade_detail.service.service_status in [Service.SERVICE_STATUS_ROLLBACK,
                                                         Service.SERVICE_STATUS_UPGRADE]:
                raise GeneralError(f"该服务正在升级或回滚{upgrade_detail.service.service_instance_name}")
            upgrade_detail.service.service_status = Service.SERVICE_STATUS_ROLLBACK
            upgrade_detail.service.save()
            # 防止回滚失败的服务进行升级重试操作
            upgrade_detail.has_rollback = True
            upgrade_detail.save()
        with transaction.atomic():
            history = RollbackHistory.objects.create(
                env=Env.objects.first(),
                operator=requests.user
            )
            RollbackDetail.objects.bulk_create(
                [
                    RollbackDetail(
                        history=history,
                        upgrade_id=upgrade_detail.get("id")
                    )
                    for upgrade_detail in upgrade_details
                ]
            )
            # for post save
            history.save()
        redis_obj = RedisDB()
        task = rollback_service.delay(history.id)
        redis_obj.set(f"rollback_{history.id}", task.task_id)
        return Response({"history": history.id})
