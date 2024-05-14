"""
应用商店相关视图
"""
import os
import uuid
import json
import time
import string
import random
import yaml
import logging
from django.conf import settings
import re
import pandas as pd
from datetime import datetime, timedelta

from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import (
    ListModelMixin, CreateModelMixin
)
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django_filters.rest_framework.backends import DjangoFilterBackend
from db_models.mixins import UpgradeStateChoices, RollbackStateChoices

from db_models.models import (
    Labels, ApplicationHub, Product, ProductHub,
    Env, Host, Service, ServiceConnectInfo,
    DeploymentPlan, ClusterInfo,
    MainInstallHistory, DetailInstallHistory,
    PreInstallHistory, PostInstallHistory,
    UploadPackageHistory, ExecutionRecord,
    UpgradeHistory, RollbackHistory
)
from utils.common.paginations import PageNumberPager
from app_store.deploy_role_utils import DEPLOY_ROLE_UTILS
from app_store.app_store_filters import (
    LabelFilter, ComponentFilter, ServiceFilter, UploadPackageHistoryFilter,
    PublishPackageHistoryFilter
)
from app_store.app_store_serializers import (
    ComponentListSerializer, ServiceListSerializer,
    UploadPackageSerializer, RemovePackageSerializer,
    UploadPackageHistorySerializer, ExecuteLocalPackageScanSerializer,
    PublishPackageHistorySerializer, DeploymentPlanValidateSerializer,
    DeploymentImportSerializer, DeploymentPlanListSerializer,
    ExecutionRecordSerializer, DeleteComponentSerializer,
    DeleteProDuctSerializer, ProductCompositionSerializer,
    InstallTempFirstSerializer, InstallTempLastSerializer,
    InstallTempSecondSerializer
)
from app_store.app_store_serializers import (
    ProductDetailSerializer, ApplicationDetailSerializer
)
from app_store import tmp_exec_back_task
from backups.backups_utils import cmd
from omp_server.settings import PROJECT_DIR
from utils.common.exceptions import OperateError
from utils.common.views import BaseDownLoadTemplateView
from app_store.tasks import publish_entry
from rest_framework.filters import OrderingFilter, SearchFilter
from utils.parse_config import (
    BASIC_ORDER, AFFINITY_FIELD,
    SUPPORT_DOCP_YAML_VERSION,
    DEFAULT_STOP_TIME
)
from omp_server.celery import app
from app_store.new_install_utils import (
    DataJson, ServiceArgsPortUtils, DeployTypeUtil, CheckAttr)
from utils.plugin.public_utils import check_env_cmd
from app_store.new_install_utils import RedisDB

logger = logging.getLogger("server")


class AppStoreListView(GenericViewSet, ListModelMixin):
    """ 应用商店 list 视图类 """

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        name_field = kwargs.get("name_field")
        # 根据名称进行去重
        result_ls, name_set = [], set()
        for obj in queryset:
            name = getattr(obj, name_field)
            if name not in name_set:
                name_set.add(name)
                result_ls.append(obj)

        serializer = self.get_serializer(
            self.paginate_queryset(result_ls), many=True)

        return self.get_paginated_response(serializer.data)


class LabelListView(GenericViewSet, ListModelMixin):
    """
        list:
        查询所有标签列表
    """
    queryset = Labels.objects.all()
    # 过滤，排序字段
    filter_backends = (DjangoFilterBackend,)
    filter_class = LabelFilter
    # 操作信息描述
    get_description = "查询所有标签列表"

    def list(self, request, *args, **kwargs):
        query_set = self.get_queryset()
        # 过滤掉子项为 null 的 label
        label_type = request.query_params.get("label_type", -1)
        if int(label_type) == Labels.LABEL_TYPE_COMPONENT:
            query_set = Labels.objects.filter(
                applicationhub__app_type=ApplicationHub.APP_TYPE_COMPONENT)
        if int(label_type) == Labels.LABEL_TYPE_APPLICATION:
            query_set = Labels.objects.exclude(
                producthub__isnull=True)
        query_set = query_set.order_by(
            "id").values_list("label_name", flat=True).distinct()
        queryset = self.filter_queryset(query_set)
        return Response(list(queryset))


class ComponentListView(AppStoreListView):
    """
        list:
        查询所有基础组件列表
    """
    queryset = ApplicationHub.objects.filter(
        app_type=ApplicationHub.APP_TYPE_COMPONENT,
        is_release=True,
    ).order_by("-created")
    serializer_class = ComponentListSerializer
    pagination_class = PageNumberPager
    # 过滤，排序字段
    filter_backends = (DjangoFilterBackend,)
    filter_class = ComponentFilter
    # 操作信息描述
    get_description = "查询所有基础组件列表"

    def list(self, request, *args, **kwargs):
        return super(ComponentListView, self).list(
            request, name_field="app_name", *args, **kwargs)


class ServiceListView(AppStoreListView):
    """
        list:
        查询所有应用服务列表
    """
    queryset = ProductHub.objects.filter(
        is_release=True).order_by("-created")
    serializer_class = ServiceListSerializer
    pagination_class = PageNumberPager
    # 过滤，排序字段
    filter_backends = (DjangoFilterBackend,)
    filter_class = ServiceFilter
    # 操作信息描述
    get_description = "查询所有应用服务列表"

    def list(self, request, *args, **kwargs):
        return super(ServiceListView, self).list(
            request, name_field="pro_name", *args, **kwargs)


class UploadPackageView(GenericViewSet, CreateModelMixin):
    """
        create:
        上传安装包
    """
    queryset = UploadPackageHistory.objects.all()
    serializer_class = UploadPackageSerializer
    # 操作信息描述
    post_description = "上传安装包"


class RemovePackageView(GenericViewSet, CreateModelMixin):
    """
        create:
        批量移除安装包
    """
    queryset = UploadPackageHistory.objects.all()
    serializer_class = RemovePackageSerializer
    # 操作信息描述
    post_description = "移除安装包"


class DeleteAppStorePackageView(GenericViewSet, ListModelMixin, CreateModelMixin):
    """
        list:
        查看应用商店可删除的安装包

        create:
        删除应用商店
    """
    get_description = "查看应用商店可删除的安装包"
    post_description = "删除应用商店"

    def get_queryset(self):
        if self.request.query_params.get('type') == "component":
            return ApplicationHub.objects.filter(
                app_type=ApplicationHub.APP_TYPE_COMPONENT).order_by("-created")
        else:
            return ProductHub.objects.all().order_by("-created")

    def get_serializer_class(self):
        if self.request is not None and self.request.query_params.get('type') == "component":
            return DeleteComponentSerializer
        return DeleteProDuctSerializer

    def list(self, request, *args, **kwargs):
        app_type = request.GET.get("type")
        if not app_type or app_type not in ["component", "product"]:
            raise OperateError("请传入type或合法type")
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        app_name_dc = {}
        for _ in serializer.data:
            app_name_dc.setdefault(_["name"], []).extend(_["versions"])
        res_ls = []
        for name, versions in app_name_dc.items():
            res_ls.append({"name": name, "versions": versions})
        return Response(
            {"data": res_ls,
             "type": app_type}
        )

    @staticmethod
    def explain_info():
        app_ls = ApplicationHub.objects.all().values_list(
            "id", "app_name", "app_version", "product")
        pro_ls = ProductHub.objects.all().values_list("id", "pro_name", "pro_version")
        app_dc = {}
        pro_id_app_count = {}
        for app in app_ls:
            app_dc[f"{app[1]}|{app[2]}"] = app[0]
            if app[3]:
                pro_id_app_count[app[3]] = pro_id_app_count.get(app[3], 0) + 1
        pro_id_count = {}
        for pro in pro_ls:
            if pro_id_app_count.get(pro[0]):
                pro_id_count[f"{pro[1]}|{pro[2]}"] = [
                    pro_id_app_count[pro[0]], pro[0]]
            else:
                pro_id_count[f"{pro[1]}|{pro[2]}"] = [0, pro[0]]
        return pro_id_count, app_dc

    def check_service(self, params):
        pro_id_count, app_dc = self.explain_info()
        ser_id = []
        pro_dc = {}
        for info in params["data"]:
            info["versions"] = ["|".join(v.split("|")[:-1])
                                for v in info["versions"]]
            if params['type'] == "component":
                for version in info["versions"]:
                    app_id = app_dc.get(f'{info["name"]}|{version}')
                    if app_id:
                        ser_id.append(app_id)
            else:
                # 查询选择的产品是不是勾选全部
                pro_info = pro_id_count[info["name"]]
                # 确定就是产品删除
                if pro_info[0] == len(info["versions"]):
                    pro_dc[pro_info[1]] = info["name"]
                for _ in info["versions"]:
                    app_id = app_dc.get(_)
                    if app_id:
                        ser_id.append(app_id)
        ser_name = Service.objects.filter(
            service__in=ser_id).values_list('service_instance_name', flat=True)
        if ser_name:
            raise OperateError(f'存在已安装的服务{",".join(ser_name)}')
        return ser_id, pro_dc

    @staticmethod
    def del_file(file_path):
        logger.info(f"应用包可能删除的路径 {file_path}")
        if file_path and len(file_path) > 28:
            _out, _err, _code = cmd(f"/bin/rm -rf {file_path}")
            if _code != 0:
                raise OperateError(f'执行cmd异常,删除路径失败{file_path}:{_err},{_out}')

    def del_database(self, ser_id, pro_dc):
        app_objs = ApplicationHub.objects.filter(id__in=ser_id)
        del_ser_file = []
        for app in app_objs:
            if app.app_package.package_name:
                del_ser_file.append(os.path.join(
                    PROJECT_DIR, "package_hub", app.app_package.package_path,
                    app.app_package.package_name,
                ))
        self.del_file(" ".join(del_ser_file))
        app_objs.delete()
        if pro_dc:
            del_pro_file = []
            for pro_id, pro_info in pro_dc.items():
                pro_info = pro_info.replace("|", "-")
                if pro_info:
                    del_pro_file.append(
                        os.path.join(PROJECT_DIR, f"package_hub/verified/{pro_info}"))
            self.del_file(" ".join(del_pro_file))
            ProductHub.objects.filter(id__in=list(pro_dc)).delete()

    def get_service(self, pre_day, app_type):
        if app_type == "component":
            app_type = ApplicationHub.APP_TYPE_COMPONENT
        else:
            app_type = ApplicationHub.APP_TYPE_SERVICE
        if not isinstance(pre_day, int) or pre_day < 1:
            raise OperateError(f"请输入正确天数{pre_day}")
        ser_id = []
        now = datetime.now()
        one_day_ago = now - timedelta(days=pre_day)
        objs = ApplicationHub.objects.filter(
            created__lt=one_day_ago, app_type=app_type)
        for obj in objs:
            if obj.service_set.count() != 0:
                continue
            ser_id.append(obj.id)
        return ser_id, {}

    def create(self, request, *args, **kwargs):
        params = request.data
        app_type = params.get('type', None)
        pre_day = params.get('pre_day', None)
        if not app_type:
            raise OperateError("请传入类型")
        if pre_day:
            ser_id, pro_dc = self.get_service(pre_day, app_type)
        else:
            ser_id, pro_dc = self.check_service(params)
        if ser_id:
            self.del_database(ser_id, pro_dc)
        return Response({"status": "删除成功"})


class ComponentDetailView(GenericViewSet, ListModelMixin):
    """
    查询组件详情
    """
    serializer_class = ApplicationDetailSerializer

    # 操作信息描述
    get_description = "查询组件详情"

    def list(self, request, *args, **kwargs):
        arg_app_name = request.GET.get('app_name')

        queryset = ApplicationHub.objects.filter(
            app_name=arg_app_name).order_by("created")
        serializer = self.get_serializer(queryset, many=True)
        result = dict()
        result.update(
            {
                "app_name": arg_app_name,
                "versions": list(serializer.data)
            }
        )
        return Response(result)


class ServiceDetailView(GenericViewSet, ListModelMixin):
    """
    查询服务详情
    """
    serializer_class = ProductDetailSerializer

    # 操作信息描述
    get_description = "查询服务详情"

    def list(self, request, *args, **kwargs):
        arg_pro_name = request.GET.get('pro_name')

        queryset = ProductHub.objects.filter(
            pro_name=arg_pro_name).order_by("created")
        serializer = self.get_serializer(queryset, many=True)
        result = dict()
        result.update(
            {
                "pro_name": arg_pro_name,
                "versions": list(serializer.data)
            }
        )
        return Response(result)


class ServicePackPageVerificationView(GenericViewSet, ListModelMixin):
    """
        list:
        查看安装包校验结果
    """
    queryset = UploadPackageHistory.objects.filter(
        is_deleted=False, package_parent__isnull=True)
    serializer_class = UploadPackageHistorySerializer
    filter_backends = (DjangoFilterBackend, OrderingFilter)
    filter_class = UploadPackageHistoryFilter


class PublishViewSet(ListModelMixin, CreateModelMixin, GenericViewSet):
    """
        list:
        查看上传应用商店安装包发布

        create:
        上传应用商店安装包发布
    """

    queryset = UploadPackageHistory.objects.filter(
        is_deleted=False,
        package_parent__isnull=True,
        package_status__in=[3, 4, 5]
    )
    serializer_class = PublishPackageHistorySerializer
    filter_backends = (DjangoFilterBackend, OrderingFilter)
    filter_class = PublishPackageHistoryFilter
    post_description = "上传应用商店安装包发布"

    def create(self, request, *args, **kwargs):
        params = request.data
        uuid = params.pop('uuid', None)
        if not uuid:
            raise OperateError("请传入uuid")
        res = check_env_cmd()
        if isinstance(res, tuple):
            raise OperateError(res[1])
        publish_entry.delay(uuid)
        return Response({"status": "发布任务下发成功"})


class ExecuteLocalPackageScanView(GenericViewSet, CreateModelMixin):
    """
        post:
        扫描服务端执行按钮
    """
    serializer_class = ExecuteLocalPackageScanSerializer
    # 操作信息描述
    post_description = "扫描本地安装包"

    def create(self, request, *args, **kwargs):
        """
            post:
            扫描服务端执行按钮
        """
        res = check_env_cmd()
        if isinstance(res, tuple):
            raise OperateError(res[1])
        _uuid, _package_name_lst = tmp_exec_back_task.back_end_verified_init(
            operation_user=request.user.username
        )
        ret_data = {
            "uuid": _uuid,
            "package_names": _package_name_lst
        }

        return Response(ret_data)


class LocalPackageScanResultView(GenericViewSet, ListModelMixin):
    """
        list:
        扫描服务端执行结果查询接口
    """

    @staticmethod
    def get_res_data(operation_uuid, package_names):
        """
        获取安装包扫描状态
        :param operation_uuid: 唯一操作uuid
        :param package_names: 安装包名称组成的字符串
        :return:
        """
        package_names_lst = package_names.split(",")
        # 确定当前安装包状态
        if UploadPackageHistory.objects.filter(
                operation_uuid=operation_uuid,
                package_name__in=package_names_lst,
                package_status=1
        ).count() == len(package_names_lst):
            # 当全部安装包的状态为 1 - 校验失败 时，整个流程结束
            stage_status = "check_all_failed"
        elif UploadPackageHistory.objects.filter(
                operation_uuid=operation_uuid,
                package_name__in=package_names_lst,
                package_status__gt=2
        ).exists():
            # 当有安装包进入到分布流程时，整个流程进入到发布流程
            if UploadPackageHistory.objects.filter(
                    operation_uuid=operation_uuid,
                    package_name__in=package_names_lst,
                    package_status=5
            ).exists():
                # 如果有安装包处于发布中装太，那么整个流程处于发布中状态
                stage_status = "publishing"
            else:
                stage_status = "published"
        else:
            # 校验中
            stage_status = "checking"
        package_info_dic = {
            el: {
                "status": 2, "message": ""
            } for el in package_names_lst
        }
        queryset = UploadPackageHistory.objects.filter(
            operation_uuid=operation_uuid,
            package_name__in=package_names_lst,
            package_parent=None
        )
        # 发布安装包状态及error信息提取
        for item in queryset:
            package_info_dic[item.package_name]["status"] = item.package_status
            package_info_dic[item.package_name]["message"] = item.error_msg
        if stage_status == "checking":
            count = UploadPackageHistory.objects.filter(
                operation_uuid=operation_uuid,
                package_name__in=package_names_lst,
                package_status=UploadPackageHistory.PACKAGE_STATUS_PARSING
            ).count()
            message = f"共扫描到 {len(package_names_lst)} 个安装包，" \
                      f"正在校验中..." \
                      f"({len(package_names_lst) - count}/{len(package_names_lst)})"
        elif stage_status == "check_all_failed":
            message = f"共计 {len(package_names_lst)} 个安装包校验失败!"
        elif stage_status == "publishing":
            _count = UploadPackageHistory.objects.filter(
                operation_uuid=operation_uuid,
                package_name__in=package_names_lst,
                package_status__gt=2
            ).count()
            message = f"本次共发布 {_count} 个安装包，正在发布中..."
        elif stage_status == "published":
            _count = UploadPackageHistory.objects.filter(
                operation_uuid=operation_uuid,
                package_name__in=package_names_lst,
                package_status=3
            ).count()
            message = \
                f"本次共发布成功 {_count} 个安装包，" \
                f"发布失败 {len(package_names_lst) - _count} 个安装包!"
        else:
            message = ""
        package_detail_lst = list()
        for item in package_names_lst:
            package_detail_lst.append(package_info_dic[item])
        ret_dic = {
            "uuid": operation_uuid,
            "package_names_lst": package_names_lst,
            "package_detail": package_detail_lst,
            "message": message,
            "stage_status": stage_status
        }
        return ret_dic

    @staticmethod
    def check_request_param(operation_uuid, package_names):
        """
        校验参数
        :param operation_uuid: 唯一uuid
        :param package_names: 安装包名称
        :return:
        """
        if not operation_uuid:
            raise ValidationError({"uuid": "请求参数中必须包含 [uuid] 字段"})
        if not package_names:
            raise ValidationError(
                {"package_names": "请求参数中必须包含 [package_names] 字段"})

    def list(self, request, *args, **kwargs):
        operation_uuid = request.query_params.get("uuid", "")
        package_names = request.query_params.get("package_names", "")
        self.check_request_param(operation_uuid, package_names)
        res = self.get_res_data(operation_uuid, package_names)
        return Response(res)


class ApplicationTemplateView(BaseDownLoadTemplateView):
    """
        list:
        获取应用商店下载模板
    """
    # 操作描述信息
    get_description = "应用商店下载组件模板"

    def list(self, request, *args, **kwargs):
        return super(ApplicationTemplateView, self).list(
            request, template_file_name="app_publish_readme.md",
            *args, **kwargs)


class DeploymentOperableView(GenericViewSet, ListModelMixin):
    """
        list:
        部署计划是否可操作
    """
    queryset = Service.objects.filter(
        service__is_base_env=False)
    # 操作描述信息
    get_description = "查看部署计划"

    def list(self, request, *args, **kwargs):
        return Response(not self.get_queryset().exists())


class DeploymentTemplateView(BaseDownLoadTemplateView):
    """
          list:
          获取部署计划模板
      """
    # 操作描述信息
    get_description = "获取部署计划模板"

    def list(self, request, *args, **kwargs):
        return super(DeploymentTemplateView, self).list(
            request, template_file_name="deployment.xlsx",
            *args, **kwargs)


class DeploymentPlanListView(GenericViewSet, ListModelMixin):
    """
        list:
        查看部署计划
    """
    queryset = DeploymentPlan.objects.all().order_by("-created")
    serializer_class = DeploymentPlanListSerializer
    pagination_class = PageNumberPager
    # 操作描述信息
    get_description = "查看部署计划"


class DeploymentPlanValidateView(GenericViewSet, CreateModelMixin):
    """
        create:
        校验部署计划服务数据
    """
    serializer_class = DeploymentPlanValidateSerializer
    # 操作描述信息
    post_description = "校验部署计划服务数据"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"deployment plan validate failed:{request.data}")
            raise ValidationError("数据格式错误")
        return Response(serializer.validated_data.get("result_dict"))


class DeploymentPlanImportView(GenericViewSet, CreateModelMixin):
    """
        create:
        部署计划导入，服务数据入库
    """
    serializer_class = DeploymentImportSerializer
    # 操作描述信息
    post_description = "部署计划导入，服务数据入库"

    @staticmethod
    def _get_app_pro_queryset(service_name_ls):
        """ 获取 app、pro 最新 queryset """
        # 查询所有 application 信息
        _queryset = ApplicationHub.objects.filter(
            app_name__in=service_name_ls, is_release=True)
        # 所有 application 默认取最新
        new_app_id_list = []
        for app in _queryset:
            new_version = _queryset.filter(
                app_name=app.app_name
            ).order_by("-created").first().app_version
            if new_version == app.app_version:
                new_app_id_list.append(app.id)
        app_queryset = _queryset.filter(
            id__in=new_app_id_list, is_release=True
        ).select_related("product")

        # 获取 application 对应的 product 信息
        app_now = app_queryset.exclude(product__isnull=True)
        pro_id_list = app_now.values_list("product_id", flat=True).distinct()
        # 验证 product 的依赖项均已包含
        pro_queryset = ProductHub.objects.filter(id__in=pro_id_list)
        return app_queryset, pro_queryset

    @staticmethod
    def _add_service(service_obj_ls, host_obj, app_obj, env_obj, only_dict,
                     cluster_dict, product_dict, service_set, vip=None, role=None, mode=None):
        """ 添加服务 """
        # 切分 ip 字段，构建服务实例名
        ip_split_ls = host_obj.ip.split(".")
        service_name = app_obj.app_name
        service_instance_name = f"{service_name}-{ip_split_ls[-2]}-{ip_split_ls[-1]}"

        # 当服务实例已经存在，则跳过
        if service_instance_name in service_set:
            return
        service_set.add(service_instance_name)

        # 服务端口
        service_port = json.dumps(ServiceArgsPortUtils().get_app_port(app_obj))
        if not service_port:
            service_port = json.dumps([])

        # 获取服务的基础目录、用户名、密码、密文
        base_dir = "/data"
        username, password, password_enc = "", "", ""
        app_install_args = ServiceArgsPortUtils().get_app_install_args(app_obj)
        for item in app_install_args:
            if item.get("key") == "base_dir":
                base_dir = os.path.join(
                    host_obj.data_folder,
                    item.get("default", "").lstrip("/")
                )
            elif item.get("key") == "username":
                username = item.get("default")
            elif item.get("key") == "password":
                password = item.get("default")
            elif item.get("key") == "password_enc":
                password_enc = item.get("default")
            else:
                pass

        # 拼接服务的控制脚本
        service_controllers = {}
        app_controllers = json.loads(app_obj.app_controllers)
        for k, v in app_controllers.items():
            if v != "":
                service_controllers[k] = f"{base_dir}/{v}"
        if "post_action" in app_obj.extend_fields:
            service_controllers["post_action"] = os.path.join(
                base_dir, app_obj.extend_fields.get("post_action")
            )

        # 创建服务连接信息表
        connection_obj = None
        if any([username, password, password_enc]):
            connection_obj, _ = ServiceConnectInfo.objects.get_or_create(
                service_name=service_name,
                service_username=username,
                service_password=password,
                service_password_enc=password_enc,
                service_username_enc="",
            )

        # 集群信息
        cluster_id = None
        if not app_obj.is_base_env:
            if service_name in only_dict:
                # 存在于单实例字典中，删除单实例字典中数据，创建集群
                only_dict.pop(service_name)
                upper_key = ''.join(random.choice(
                    string.ascii_uppercase) for _ in range(7))
                cluster_obj = ClusterInfo.objects.create(
                    cluster_service_name=service_name,
                    cluster_name=f"{service_name}-cluster-{upper_key}",
                    service_connect_info=connection_obj,
                )
                # 写入集群字典，记录 id
                cluster_dict[service_name] = (
                    cluster_obj.id, cluster_obj.cluster_name)
            elif service_name in cluster_dict:
                # 存在于集群字典中
                pass
            else:
                # 尚未记录，加入单实例字典
                only_dict[service_name] = service_instance_name

        # 如果当前服务包含 mode 字段为 None，则使用默认模式
        if mode is None and app_obj.deploy_mode is not None:
            default_deploy_mode = app_obj.deploy_mode.get(
                "default_deploy_mode", None)
            if default_deploy_mode is not None:
                mode = default_deploy_mode

        # 如果产品信息不再字典中，将其添加至字典
        if app_obj.product:
            pro_name = app_obj.product.pro_name
            if pro_name not in product_dict:
                product_dict[pro_name] = [app_obj.product, mode]
            else:
                # 如果产品信息已经被记录，如果模式为 None 则更新
                if product_dict[pro_name][1] is None:
                    product_dict[pro_name] = [app_obj.product, mode]

        # 添加服务到列表中
        service_obj_ls.append(Service(
            ip=host_obj.ip,
            service_instance_name=service_instance_name,
            service=app_obj,
            service_port=service_port,
            service_controllers=service_controllers,
            service_status=Service.SERVICE_STATUS_READY,
            env=env_obj,
            service_connect_info=connection_obj,
            cluster_id=cluster_id,
            vip=vip,
            service_role=role,
            deploy_mode=mode
        ))

    def create(self, request, *args, **kwargs):
        # 信任数据，只进行格式校验
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"host batch import failed:{request.data}")
            raise ValidationError("数据格式错误")

        # env 环境对象
        default_env = Env.objects.filter(id=1).first()

        # 实例名称、服务数据、服务名称列表
        instance_info_ls = serializer.data.get("instance_info_ls")
        instance_name_ls = list(
            map(lambda x: x.get("instance_name"), instance_info_ls))
        service_data_ls = serializer.data.get("service_data_ls")
        service_name_ls = list(
            map(lambda x: x.get("service_name"), service_data_ls))

        # 预处理，为基础组件补充角色
        auto_role_ls = []
        for basic_ls in BASIC_ORDER.values():
            for basic_name in basic_ls:
                if service_name_ls.count(basic_name) > 1:
                    role_list = list(map(lambda x: x.get("role", ""), filter(
                        lambda x: x.get("service_name") == basic_name, service_data_ls)))
                    if not all(role_list):
                        auto_role_ls.append(basic_name)

        for index, service_data in enumerate(service_data_ls):
            service_name = service_data.get("service_name")
            if service_name in auto_role_ls:
                role = "master" if index == service_name_ls.index(
                    service_name) else "slave"
                service_data["role"] = role

        # 亲和力 tengine 字段
        tengine_name = AFFINITY_FIELD.get("tengine", "tengine")

        # 主机、基础环境 queryset
        host_queryset = Host.objects.filter(instance_name__in=instance_name_ls)
        base_env_queryset = ApplicationHub.objects.filter(is_base_env=True)
        # 应用、产品 queryset
        app_queryset, pro_queryset = self._get_app_pro_queryset(
            service_name_ls)
        # 如果主机不存在
        if not host_queryset.exists():
            raise OperateError("导入失败，主机未纳管")
        # 构建 uuid
        operation_uuid = serializer.data.get("operation_uuid") if \
            serializer.data.get("operation_uuid") else uuid.uuid4()

        # 考虑到录入主机可能大于分配服务主机，故此记录真实使用的主机实例数量
        service_instance_set = set(
            map(lambda x: x.get("instance_name"), service_data_ls))
        use_host_queryset = host_queryset.filter(
            instance_name__in=service_instance_set)

        try:
            # 服务对象列表、基础环境字典
            service_obj_ls = []
            base_env_dict = {}
            # 产品信息字典
            product_dict = {}
            # 单实例、集群服务字典
            only_dict, cluster_dict = {}, {}
            # tengine 所在主机对象字典
            tengine_host_obj_dict = {}

            # 服务实例唯一集合，用于限制重复服务
            service_set = set()

            # 遍历获取所有需要安装的服务
            for service_data in service_data_ls:
                instance_name = service_data.get("instance_name")
                service_name = service_data.get("service_name")
                # 服务的角色、虚拟IP
                vip = service_data.get("vip")
                role = service_data.get("role")
                mode = service_data.get("mode")
                # 主机、应用对象
                host_obj = use_host_queryset.filter(
                    instance_name=instance_name).first()
                app_obj = app_queryset.filter(app_name=service_name).first()

                # 亲和力为 tengine 字段 (Web 服务) 跳过，后续按照 product 维度补充
                if app_obj.extend_fields.get("affinity") == tengine_name:
                    continue
                # 如果服务为 tengine 时，记录其所在节点
                if app_obj.app_name == tengine_name:
                    tengine_host_obj_dict[host_obj.ip] = host_obj

                # 检查服务依赖
                if app_obj.app_dependence:
                    dependence_list = json.loads(app_obj.app_dependence)
                    for dependence in dependence_list:
                        app_name = dependence.get("name")
                        # version = dependence.get("version")
                        # base_env_obj = base_env_queryset.filter(
                        #     app_name=app_name, app_version__startswith=version
                        # ).order_by("-created").first()
                        base_env_obj = base_env_queryset.filter(
                            app_name=app_name).order_by("-created").first()
                        # 如果服务的依赖中有 base_env，并且对应 ip 上不存在则写入
                        if base_env_obj and \
                                app_name not in base_env_dict.get(host_obj.ip, []):
                            # base_env 一定为单实例
                            self._add_service(
                                service_obj_ls, host_obj, base_env_obj, default_env,
                                only_dict, cluster_dict, product_dict, service_set)
                            # 以 ip 为维度记录，避免重复
                            if host_obj.ip not in base_env_dict:
                                base_env_dict[host_obj.ip] = []
                            base_env_dict[host_obj.ip].append(app_name)

                # 添加服务
                self._add_service(
                    service_obj_ls, host_obj, app_obj, default_env,
                    only_dict, cluster_dict, product_dict, service_set,
                    vip=vip, role=role, mode=mode)

            # 亲和力为 tengine 字段 (Web 服务) 列表
            app_target = ApplicationHub.objects.filter(
                product__in=pro_queryset)
            tengine_app_list = list(filter(
                lambda x: x.extend_fields.get("affinity") == tengine_name, app_target))

            # 为所有 tengine 节点添加亲和力服务
            for tengine_ip, host_obj in tengine_host_obj_dict.items():
                for app_obj in tengine_app_list:
                    self._add_service(
                        service_obj_ls, host_obj, app_obj, default_env,
                        only_dict, cluster_dict, product_dict, service_set)

            service_instance_name_ls = list(map(
                lambda x: x.service_instance_name, service_obj_ls))
            # run_user 字典
            run_user_dict = {}
            for instance_info in instance_info_ls:
                if instance_info.get("run_user", "") != "":
                    run_user_dict[
                        instance_info.get("instance_name")
                    ] = instance_info.get("run_user")

            # 服务 memory 字典,合并 install_args
            service_memory_dict = {}
            for service_data in service_data_ls:
                only_key = f'{service_data.get("service_name")}-{service_data.get("instance_name")}'
                install_args = service_data.get("install_args", "")
                if install_args != "":
                    install_args = json.loads(install_args)
                    if not isinstance(install_args, dict):
                        raise OperateError(f'{service_data.get("service_name")}的配置不合规{install_args}')
                    service_memory_dict[only_key] = install_args
                if service_data.get("memory", "") != "":
                    service_memory_dict.setdefault(only_key, {}).update(
                        {"memory": service_data.get("memory")}
                    )

            # 数据库入库
            with transaction.atomic():

                # 已安装产品信息
                product_obj_ls = []
                for pro_name, pro_info in product_dict.items():
                    upper_key = ''.join(random.choice(
                        string.ascii_uppercase) for _ in range(7))
                    pro_obj, deploy_mode = pro_info
                    product_obj_ls.append(Product(
                        product_instance_name=f"{pro_name}-{upper_key}",
                        product=pro_obj,
                        deploy_mode=deploy_mode
                    ))
                Product.objects.bulk_create(product_obj_ls)

                # 批量创建 service，return 无 id，需重查获取
                Service.objects.bulk_create(service_obj_ls)

                # 为所有服务统一补充集群信息
                for k, v in cluster_dict.items():
                    Service.objects.filter(
                        service__app_name=k
                    ).update(cluster_id=v[0])

                # 获取所有服务对象
                service_queryset = Service.objects.filter(
                    service_instance_name__in=service_instance_name_ls
                ).select_related("service")

                # 遍历服务，如果存在依赖信息则补充
                for service_obj in service_queryset:
                    service_dependence_list = []
                    if service_obj.service.app_dependence:
                        dependence_list = json.loads(
                            service_obj.service.app_dependence)
                        # 根据服务当前部署模式决定依赖
                        dependence_list = DeployTypeUtil(
                            service_obj.service, dependence_list
                        ).get_dependence_by_deploy(service_obj.deploy_mode)
                        for dependence in dependence_list:
                            app_name = dependence.get("name")
                            item = {
                                "name": app_name,
                                "cluster_name": None,
                                "instance_name": None,
                            }

                            if app_name in only_dict:
                                item["instance_name"] = only_dict.get(app_name)
                            elif app_name in cluster_dict:
                                item["cluster_name"] = cluster_dict.get(
                                    app_name)[1]
                            else:
                                # base_env 不在单实例和集群列表中
                                ip_split_ls = service_obj.ip.split(".")
                                service_instance_name = f"{app_name}-{ip_split_ls[-2]}-{ip_split_ls[-1]}"
                                item["instance_name"] = service_instance_name
                            service_dependence_list.append(item)
                    service_obj.service_dependence = json.dumps(
                        service_dependence_list)
                    service_obj.save()

                # 更新主机非base_env服务数量
                for host_obj in use_host_queryset:
                    obj_service_num = service_queryset.filter(
                        ip=host_obj.ip).exclude(service__is_base_env=True).count()
                    Host.objects.filter(
                        id=host_obj.id
                    ).update(service_num=obj_service_num)

                # 主安装记录表、后续任务记录表
                main_history_obj = MainInstallHistory.objects.create(
                    operator=request.user.username,
                    operation_uuid=operation_uuid,
                )
                PostInstallHistory.objects.create(
                    main_install_history=main_history_obj,
                )

                # 主机层安装记录表
                pre_install_obj_ls = []
                for host_obj in use_host_queryset:
                    pre_install_obj_ls.append(PreInstallHistory(
                        main_install_history=main_history_obj,
                        ip=host_obj.ip,
                    ))
                PreInstallHistory.objects.bulk_create(pre_install_obj_ls)

                # 构建基础组件多维列表
                component_order_ls = [[] for _ in range(len(BASIC_ORDER))]
                for k, v in BASIC_ORDER.items():
                    for i in range(len(v)):
                        component_order_ls[k].append([])

                # 用于详情表排序的列表
                component_last_ls = []
                service_order_ls = []
                service_last_ls = []

                # 安装详情表
                for service_obj in service_queryset:
                    # 获取主机对象
                    host_obj = use_host_queryset.filter(
                        ip=service_obj.ip).first()

                    app_args = ServiceArgsPortUtils().get_app_install_args(
                        service_obj.service
                    )
                    # 获取服务对应的 run_user 和 memory
                    run_user = run_user_dict.get(host_obj.instance_name, None)
                    install_args_dc = service_memory_dict.get(
                        f'{service_obj.service.app_name}-{host_obj.instance_name}', None)
                    # 如果用户自定义 run_user、memory 需覆盖写入 install_args
                    if run_user:
                        for i in app_args:
                            if i.get("key") == "run_user":
                                i["default"] = run_user
                                break
                        else:
                            app_args.append({
                                "name": "安装用户",
                                "key": "run_user",
                                "default": run_user,
                            })
                    if install_args_dc:
                        ser_count = service_name_ls.count(service_obj.service.app_name)
                        for i in app_args:
                            default_value = install_args_dc.get(i.get("key"))
                            if default_value:
                                i["default"] = default_value
                            # 检查参数合法性
                            res, msg = CheckAttr(i, num=ser_count).run()
                            if not res:
                                raise OperateError(f"{service_obj.service.app_name}服务参数{i}异常{msg}")
                            # break
                        # else:
                        #    app_args.append({
                        #        "name": "运行内存",
                        #        "key": "memory",
                        #        "default": memory,
                        #    })

                    # {data_path} 占位符替换
                    for i in app_args:
                        if "dir_key" in i:
                            i["default"] = os.path.join(
                                host_obj.data_folder,
                                i.get("default", "").lstrip("/")
                            )

                    # 标记服务是否需要 post
                    post_action_flag = 4
                    if service_obj.service.extend_fields.get(
                            "post_action", "") != "":
                        post_action_flag = 0

                    # 服务端口
                    service_port = ServiceArgsPortUtils().get_app_port(
                        service_obj.service
                    )

                    # 构建 detail_install_args
                    detail_install_args = {
                        "ip": service_obj.ip,
                        "name": service_obj.service.app_name,
                        "ports": service_port,
                        "version": service_obj.service.app_version,
                        "run_user": "",
                        "data_folder": host_obj.data_folder,
                        "cluster_name": None,
                        "install_args": app_args,
                        "instance_name": service_obj.service_instance_name,
                    }

                    detail_obj = DetailInstallHistory(
                        service=service_obj,
                        main_install_history=main_history_obj,
                        install_detail_args=detail_install_args,
                        post_action_flag=post_action_flag,
                    )

                    # 安装详情表按顺序录入
                    app_type = service_obj.service.app_type
                    # 公共组件
                    if app_type == ApplicationHub.APP_TYPE_COMPONENT:
                        for k, v in BASIC_ORDER.items():
                            if service_obj.service.app_name in v:
                                # 动态根据层级插入数据
                                target = v.index(service_obj.service.app_name)
                                component_order_ls[k][target].append(
                                    detail_obj)
                                break
                        else:
                            component_last_ls.append(detail_obj)

                    elif app_type == ApplicationHub.APP_TYPE_SERVICE:
                        app_level_str = service_obj.service.extend_fields.get(
                            "level", "")
                        if app_level_str == "":
                            service_last_ls.append(detail_obj)
                        else:
                            k = int(app_level_str)
                            # 动态根据层级索引创建空列表
                            if len(service_order_ls) <= k:
                                for i in range(len(service_order_ls), k + 1):
                                    service_order_ls.append([])
                            service_order_ls[k].append(detail_obj)
                    else:
                        pass

                # 合并多维列表和后置列表
                detail_history_obj_ls = []
                for child_ls in component_order_ls:
                    for i in child_ls:
                        if len(i) != 0:
                            detail_history_obj_ls += i
                detail_history_obj_ls += component_last_ls
                for i in service_order_ls:
                    detail_history_obj_ls += i
                detail_history_obj_ls += service_last_ls

                DetailInstallHistory.objects.bulk_create(detail_history_obj_ls)

                # 部署计划表
                DeploymentPlan.objects.create(
                    plan_name=f"快速部署-{str(int(round(time.time() * 1000)))}",
                    host_num=use_host_queryset.count(),
                    product_num=pro_queryset.count(),
                    service_num=len(service_data_ls),
                    create_user=request.user.username,
                    operation_uuid=operation_uuid,
                )

                # 生成 data.json
                data_json = DataJson(
                    operation_uuid=str(operation_uuid),
                    service_obj=service_queryset)
                data_json.run()

        except Exception as err:
            logger.error(f"import deployment plan err: {err}")
            import traceback
            logger.error(traceback.print_exc())
            raise OperateError(f"导入执行计划失败: {err}")

        return Response({
            "operation_uuid": operation_uuid,
            "host_num": host_queryset.count(),
            "product_num": pro_queryset.count(),
            "service_num": len(service_data_ls),
        })


class ExecutionRecordAPIView(GenericViewSet, ListModelMixin):
    """
        list:
        查询执行记录
    """
    queryset = ExecutionRecord.objects.exclude(count=0).all()
    pagination_class = PageNumberPager
    filter_backends = (OrderingFilter, SearchFilter)
    search_fields = ("module",)
    ordering_fields = ("created",)
    ordering = ('-created',)
    serializer_class = ExecutionRecordSerializer
    # 操作信息描述
    get_description = "查询执行记录"


class ProductCompositionView(GenericViewSet, ListModelMixin, CreateModelMixin):
    """
        list:
        查询产品信息

        create:
        修改产品包含服务信息
    """

    serializer_class = ProductCompositionSerializer
    # 关闭权限、认证设置
    authentication_classes = ()
    permission_classes = ()

    get_description = "查询产品信息"
    post_description = "修改产品包含服务信息"

    def get_queryset(self):
        return ProductHub.objects.filter(**self.request.query_params.dict())

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        for data in serializer.data:
            data["pro_services"] = json.loads(data.get("pro_services"))
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        pro_services = json.dumps(request.data.get(
            "pro_services", []), ensure_ascii=False)
        request.data["pro_services"] = pro_services

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        params = request.data
        pro_obj = ProductHub.objects.filter(
            pro_name=params.get('pro_name'), pro_version=params.get('pro_version')
        ).first()
        pro_obj.pro_services = pro_services
        pro_obj.save()

        return Response("修改成功")


class InstallTempFirstView(GenericViewSet, ListModelMixin,
                           CreateModelMixin):
    """
        create:
        生成模版修改产品包含服务信息
        list:
        查询产品信息
    """
    # 私
    serializer_class = InstallTempFirstSerializer
    get_description = "查询产品信息"
    post_description = "修改产品包含服务信息"

    def list(self, request, *args, **kwargs):
        result = {}
        for item in ProductHub.objects.all().values("pro_name", "pro_version"):
            pro_name = item['pro_name']
            pro_version = item['pro_version']
            result.setdefault(pro_name, {'pro_name': pro_name, 'pro_version': []})[
                'pro_version'].append(pro_version)

        result = list(result.values())

        return Response(
            {
                "pro_info": result,
                "support_dpcp_yaml_version": SUPPORT_DOCP_YAML_VERSION,
                "model_style": ["单服务模式", "基础组件高可用", "全高可用模式"]
            }
        )

    @staticmethod
    def pro_dependence(expressions, versions):
        # 表达式 版本集合

        patterns = [re.compile(expression) for expression in expressions]
        common = {}
        for index, pattern in enumerate(patterns):
            pattern_set = set()
            for v in versions:
                if pattern.findall(v):
                    pattern_set.add(v)
            if index == 0:
                common = pattern_set
            else:
                # 交集进行合并找正则共性
                common = common & pattern_set
        return list(common)

    @staticmethod
    def check_de(pro_dependence_dc, pro_name_version_dc):
        """
        检查依赖是否存在数据库中
        """
        # pro_name_version_dc :{"douc":[6.0.0]}
        # pro_dependence_dc "cmdb-6.0":{"douc":"6.0.0","xxx":"^6."}
        for de, de_on in pro_dependence_dc.items():
            for n, v in de_on.items():
                res_v = None
                for i in pro_name_version_dc.get(n, []):
                    if re.match(v, i):
                        res_v = True
                if not res_v:
                    raise ValidationError({
                        f"产品{de}依赖产品{n}正则版本{v}不存在"
                    })

    def get_product(self, pro_info, pro_de_dc, pro_name_version_dc, add=True):
        # pro_name_version_dc 全量 {douc:[6.0.0,6.1.0]}
        # pro_de_dc 勾选产品的依赖信息 {"cmdb-6.0":{"douc":"6.0.0","xxx":"^6."}
        for pro in pro_info:
            name_version = f"{pro['pro_name']}-{pro['pro_version']}"
            dependence = json.loads(pro_de_dc[name_version])
            if add:
                self.install_dc.setdefault(
                    pro['pro_name'], []).append({pro['pro_version']})
            for de in dependence:
                name, expression = de.get('name'), de.get('version')
                # 通过表达式获取所有产品的版本
                version_ls = self.pro_dependence([expression], pro_name_version_dc.get(name,[]))
                if not version_ls:
                    raise ValidationError({
                        f"产品{pro['pro_name']}依赖产品{name}正则版本{expression}不存在"
                    })
                self.install_dc.setdefault(
                    name, []).append(set(version_ls))
                # 排查递归依赖是否存在依赖
                for version in version_ls:
                    self.get_product([
                        {"pro_name": name, "pro_version": version}
                    ], pro_de_dc, pro_name_version_dc,
                        add=False)

    def produce_pro_info(self, data):
        pro_info = data.get('pro_info')
        model_style = int(data.get('model_style'))
        # 全量获取
        pro_de_dc = {}
        pro_name_version_dc = {}
        pro_ls = ProductHub.objects.all().values_list(
            "pro_name", "pro_version", "pro_dependence")
        for i in pro_ls:
            pro_de_dc[f"{i[0]}-{i[1]}"] = i[2]
            pro_name_version_dc.setdefault(i[0], []).append(i[1])
        setattr(self, "install_dc", dict())
        self.get_product(pro_info, pro_de_dc, pro_name_version_dc)

        deploy_product = []
        pro_objs = set()
        count = 2 if model_style == 1 else 1
        for name, versions in self.install_dc.items():
            # 产品的一批版本找到唯一一个版本 self.install_dc ["douc":[[6.0],[6.0,6.1,6.2]]]
            common = versions[0]
            for version in versions[1:]:
                common = common & version
            if not common:
                raise ValidationError({
                    "model_style": f"依赖产品{name}版本{versions}存在冲突"
                })

            deploy_product.append(
                {"pro_name": name, "pro_version": list(common)[0], "pro_count": count})
            pro_objs.add(
                ProductHub.objects.filter(
                    pro_name=name, pro_version=list(common)[0]
                ).first()
            )
        return deploy_product, pro_objs

    def app_dependence(self, ser_ob):
        """递归查找依赖"""
        for de_ser in ser_ob:
            app_name = de_ser.get("name")
            a_obj = ApplicationHub.objects.filter(
                app_name=app_name,
                app_version__regex=de_ser.get("version")
            ).first()
            if not a_obj:
                raise ValidationError(
                    f"依赖服务:{app_name}找不到对应的名称或版本{de_ser.get('version')}")
            self.component.add(a_obj)
            if a_obj.app_dependence:
                self.app_dependence(json.loads(a_obj.app_dependence))

    @staticmethod
    def get_mem(obj, default_mem):
        """
        内存处理并换算单位,返回mem参数单位m
        """
        # 基础组件无内存
        if obj.is_base_env:
            return {"mem": 0}
        if not obj.app_install_args:
            raise ValidationError(f"无安装参数{obj.service_instance_name}")
        install_args = json.loads(obj.app_install_args)
        memory = None
        for key in install_args:
            if key.get("key") == "memory":
                memory = key.get("default", "0m").lower()
        # 筛选内存不存在的
        if not memory:
            if not obj.app_port:
                return {"mem": 0}
            return {"mem": None}
            # memory = f'{default_mem}m'
        match_rule = re.compile("\\d+")
        mem_count = match_rule.match(memory).group()
        if mem_count and len(memory.split(mem_count)) == 2:
            if memory.split(mem_count)[1].startswith("g"):
                mem_count = int(mem_count) * 1024
            return {"mem": mem_count}
        return {"mem": 0}

    def produce_all_app(self, product_objs, json_info, model_style):
        # 查询所有app
        service_app = ApplicationHub.objects.select_related(
            "product").filter(
            product__in=product_objs).order_by("-created")
        # 进行依赖查看并确定最终部署的服务（服务名称要求单一）
        for ser_obj in service_app:
            pro_name = ser_obj.product.pro_name
            if ser_obj.app_name in self.pro_ser_dc.get(pro_name, {}).keys():
                continue
            if ser_obj.extend_fields.get("affinity", "") == "tengine":
                continue
            mem = self.get_mem(ser_obj, json_info["default_mem"]).get("mem")
            self.pro_ser_dc.setdefault(
                pro_name, {})[ser_obj.app_name] = mem
            if ser_obj.app_dependence:
                self.app_dependence(json.loads(ser_obj.app_dependence))
            self.component.add(ser_obj)

        com_count_dc = {i['name']: i['count'] for i in json_info["component"]}

        check_app_ls = []
        app_ls = []
        for app in self.component:
            if app.app_name in check_app_ls:
                # ToDo 考虑a依赖c服务的1.0.0而b依赖c服务的0.9.0情况
                # raise ValidationError(f"依赖服务{app.app_name}版本冲突")
                continue
            check_app_ls.append(app.app_name)
            if app.app_type == ApplicationHub.APP_TYPE_COMPONENT and not app.is_base_env:
                app_count = com_count_dc.get(
                    app.app_name, 1) if model_style != 2 else 1
                app_dc = {
                    "app_name": app.app_name,
                    "app_version": app.app_version,
                    "app_count": app_count
                }
                app_dc.update(self.get_mem(app, json_info["default_mem"]))
                app_ls.append(app_dc)
        return app_ls

    @staticmethod
    def check_yaml(yaml_name):
        try:
            yaml_path = os.path.join(
                settings.PROJECT_DIR, 'config/docp_yaml', f"{yaml_name}.yaml"
            )
            with open(yaml_path, "r") as fp:
                return yaml.load(fp, Loader=yaml.SafeLoader)
        except Exception as e:
            raise ValidationError(f"找不到对应的yaml文件{yaml_name}.yaml:{e}")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        setattr(self, "component", set())
        setattr(self, "pro_ser_dc", dict())
        deploy_product, pro_objs = self.produce_pro_info(serializer.data)
        json_info = self.check_yaml(
            serializer.data['support_dpcp_yaml_version'])
        deploy_app = self.produce_all_app(
            pro_objs, json_info, int(serializer.data['model_style']))
        redis_uuid = int(time.time() * 1000)
        redis_obj = RedisDB()
        redis_obj.set(f"deploy_tmp_{redis_uuid}", self.pro_ser_dc)
        redis_obj.set(f"deploy_yaml_{redis_uuid}", json_info)

        return Response(
            {"pro_info": deploy_product,
             "omp_mem": 8,
             "deploy_app": deploy_app,
             "redundant_mem": json_info["redundant_mem"],
             "default_mem": json_info["default_mem"],
             "uuid": redis_uuid,
             }
        )


class InstallTempSecondUtil:
    def __init__(self, data):
        self.data = data
        self.host_ip_mem = {}
        self.copy_host_ip_mem = {}
        # 产品名称和服务名称的匹配
        self.product_service_name = self._get_product_service_name()
        # 产品名称和倾向节点的匹配
        self.product_ip = {}
        self.redis_obj = RedisDB()

    @staticmethod
    def _get_product_service_name():
        pro_ser = {}
        for app_obj in ApplicationHub.objects.all():
            if app_obj.product:
                pro_ser.setdefault(app_obj.product.pro_name,
                                   set()).add(app_obj.app_name)
        return pro_ser

    @staticmethod
    def get_role_deploy(get_role_ls):
        # 获取role
        for name, info in get_role_ls.items():
            if name in DEPLOY_ROLE_UTILS.keys():
                DEPLOY_ROLE_UTILS[name]().update_service(info)

    def check_special_count(self, app_ls, json_res):

        count_min = json_res["component_template"]
        special_service = json_res["special_service"]
        get_role_ls = {}

        app_count_dc = {_.get("name"): _.get("count") for _ in app_ls}
        for app in app_ls:
            name = app.get("name")
            count = app.get("count", 1)
            if count != 1 and not count >= int(count_min.get(name, 0)):
                raise ValidationError(f"{name}数目不能低于{count_min.get(name, 0)}")
            if name in special_service.keys():
                count = str(special_service.get(name))
                if not count.isdigit():
                    count = app_count_dc.get(count)
            app.pop("count", 1)
            get_role_ls[app.get("name")] = [app.copy()
                                            for _ in range(int(count))]
        self.get_role_deploy(get_role_ls)
        return get_role_ls

    def get_app(self):
        """
        # "name": component.app_name,
        # "roles": "",
        # "mem"
        """
        o_uuid = self.data.get('uuid')
        default_mem = self.data.get("default_mem")
        flag, res = self.redis_obj.get(f"deploy_tmp_{o_uuid}")
        json_flag, json_res = self.redis_obj.get(f"deploy_yaml_{o_uuid}")
        if not flag or not json_flag:
            raise ValidationError(
                f"redis-{o_uuid}缓存信息不存在或已过期{flag}{json_flag}")
        pro_count_dc = {i.get("pro_name"): i.get("pro_count")
                        for i in self.data.get("pro_info")}
        app_ls = []
        for pro_name, apps in res.items():
            count = int(pro_count_dc.get(pro_name))
            for app, mem in apps.items():
                app_ls.append(
                    {
                        "name": app,
                        "roles": "",
                        "mem": default_mem if mem is None else mem,
                        "count": count
                    }
                )
        for com in self.data["deploy_app"]:
            app_ls.append(
                {
                    "name": com['app_name'],
                    "roles": "",
                    "mem": default_mem if com['mem'] is None else com['mem'],
                    "count": com['app_count']
                }
            )
        return app_ls, json_res

    def check_mem_distribution(self, get_role_ls):
        has_total_mem = 0
        hosts_num = 0
        ser_total_mem = int(self.data.get("omp_mem")) * 1024
        self.data.get("host_info")
        name = 0
        for host in self.data.get("host_info"):
            num = int(host.get("count"))
            if num == 0:
                raise ValidationError("主机数量不允许为0")
            host_one_mem = float(host.get('mem')) * 1024
            has_total_mem = has_total_mem + host_one_mem * num
            hosts_num = hosts_num + num
            # 录入主机内存信息
            for _ in range(num):
                name = name + 1
                self.host_ip_mem[f"docp0{name}"] = host_one_mem
        self.copy_host_ip_mem = self.host_ip_mem.copy()
        for name, role_info in get_role_ls.items():
            if hosts_num < len(role_info):
                raise ValidationError(
                    f"需要分配的节点数{len(role_info)},可提供的节点数{hosts_num}不足以分配")
            ser_total_mem = ser_total_mem + \
                            int(role_info[0].get("mem", 0)) * len(role_info)
        if has_total_mem < ser_total_mem:
            raise ValidationError(
                f"当前总内存{has_total_mem}不足以支撑所有服务{ser_total_mem}内存")
        # 添加平衡参数,防止出现一台臃肿情况
        re_balance_percent = ser_total_mem / has_total_mem
        logger.info(f"当前服务占比总内存{re_balance_percent}")
        redundant_mem = float(self.data.get("redundant_mem", 0.1))
        balance_percent = re_balance_percent * (1 + redundant_mem)
        # 冗余系数计算
        re_balance_percent = 1 if balance_percent >= 1 else balance_percent
        for ip, mem in self.host_ip_mem.items():
            self.host_ip_mem[ip] = int(mem) * re_balance_percent
        self.host_ip_mem["docp01"] = self.host_ip_mem["docp01"] - \
                                     int(self.data.get("omp_mem")) * 1024
        if self.host_ip_mem["docp01"] < 0:
            raise ValidationError("主机资源过小，无法分配omp，需提升首台内存大小或增加冗余系数")
        logger.info(f"当前所有内存总共占用{ser_total_mem}mb")

    def service_affinity(self, binding, bound_name, get_role_ls):
        """
        被绑定，绑定在被绑定上的
        hadoop flink
        hadoop:[flink]
        tengine: [lcapServer,lcapDevServer]
        clickhouse: [dodpClickhouseAgent]
        """
        need_host_len = len(binding)
        # 计算绑定单节点一共花费多少内存
        max_mem = int(binding[0].get("mem"))
        bound_info_ls = []
        for b_name in bound_name:
            b_name_info = get_role_ls.get(b_name)
            bound_info_ls.append(b_name_info)
            if not b_name_info:
                continue
            max_mem = max_mem + int(b_name_info[0].get("mem", 0))
            if need_host_len < len(b_name_info):
                raise ValidationError(f"{b_name_info}不足以分配到被绑定{binding}上")
        # 排序
        hosts = dict(sorted(self.host_ip_mem.items(),
                            key=lambda x: x[1], reverse=True))
        # 按照最大的分配
        host_ip = list(hosts)[need_host_len - 1]
        if hosts[host_ip] < max_mem:
            raise ValidationError(
                f"在服务{binding[0].get('name')}上的服务{bound_name}无法分配 需要内存{max_mem}")
        bound_ip_list = []
        for index, i in enumerate(binding):
            ip = i.get("ip")
            if not ip:
                ip = list(hosts)[index]
                self.host_ip_mem[ip] = self.host_ip_mem[ip] - \
                                       int(i.get("mem", 0))
                i["ip"] = ip
                logger.info(f"成功分配服务信息{i}")
            bound_ip_list.append(ip)
        for info in bound_info_ls:
            if not info:
                continue
            for b_index, b_i in enumerate(info):
                b_i["ip"] = bound_ip_list[b_index]
                logger.info(f"成功分配服务信息{b_i}")
                self.host_ip_mem[b_i["ip"]] = self.host_ip_mem[b_i["ip"]
                                              ] - int(b_i.get("mem", 0))
            get_role_ls[info[0]["name"]] = info

    def is_ser_or_component(self, ser):
        pro_name = None
        for pro_names, ser_ls in self.product_service_name.items():
            if ser in ser_ls:
                pro_name = pro_names
        if pro_name:
            return pro_name, self.product_ip.get(pro_name, [])
        else:
            # 不是服务或者未匹配到产品的服务
            return False, []

    def mem_math(self, index, mem, ip_ls=None):
        """
        剔除不可再分配的节点
        """
        ip = ip_ls[index] if ip_ls and index < len(
            ip_ls) else list(self.host_ip_mem)[index]
        has_mem = int(self.host_ip_mem[ip])
        if has_mem - int(mem) <= 0:
            # 当节点不够时重新进行排序
            self.host_ip_mem = dict(
                sorted(self.host_ip_mem.items(), key=lambda x: x[1], reverse=True))
            for i, m in self.host_ip_mem.items():
                if m - int(mem) > 0:
                    self.host_ip_mem[i] = m - int(mem)
                    return True, i
            return False, ip
        self.host_ip_mem[ip] = has_mem - int(mem)
        return True, ip

    def service_normal(self, role_info):
        ser_name = role_info[0].get("name")
        is_ser, ip_ls = self.is_ser_or_component(ser_name)
        if not is_ser or not ip_ls:
            # 当服务出现不同集群组建或者不同产品时。主机分布的大小进行二次排序
            self.host_ip_mem = dict(
                sorted(self.host_ip_mem.items(), key=lambda x: x[1], reverse=True))
        product_ip = []
        for index, ser in enumerate(role_info):
            true_ip = ser.get("ip")
            if not true_ip:
                res, ip = self.mem_math(index, ser.get("mem"), ip_ls)
                if not res:
                    raise ValidationError(
                        f"服务无法满足分配{ser.get('name')},主机剩余{self.host_ip_mem}")
                ser["ip"] = ip
                logger.info(f"成功分配服务信息{ser}")
                product_ip.append(ip)
        # 更新产品亲和性 防止特定服务更新亲和节点
        if is_ser and (not self.product_ip.get(is_ser) or len(
                self.product_ip.get(is_ser)) <= len(product_ip)):
            self.product_ip[is_ser] = product_ip

            # 判断服务给下次同产品的提供亲和性

    def service_distribution(self, get_role_ls, json_res):
        # 处理绑定关系
        # 先铺满 有绑定需求的，尽可能按顺序从始
        aff_dc = json_res.get("affinity")
        # 需要绑定的服务
        need_b = []
        for k, v in aff_dc.items():
            if get_role_ls.get(k):
                need_b.extend(v)
        for name, role_info in get_role_ls.items():
            if name in list(aff_dc):
                self.service_affinity(role_info, aff_dc[name], get_role_ls)
            # 服务在绑定预算时已经被放置
            elif name in need_b:
                continue
            # 处理正常服务
            else:
                self.service_normal(role_info)

    def produce_res(self, res):
        ip_dc = {}
        for name, a in res.items():
            for _ in a:
                ip_dc.setdefault(_.get('ip', 'IsNone'), []).append(_)

        save_redis_ls = []
        ip_mem = {}
        for n_, info in ip_dc.items():
            for _ in info:
                ip = _.get('ip', '')
                mem = int(_.get('mem', ''))
                if ip_mem.get(ip):
                    ip_mem[ip] = ip_mem[ip] + mem
                else:
                    ip_mem[ip] = mem
                save_redis_ls.append(
                    [
                        ip, _.get('name'), "", _.get('vip', ''),
                        _.get("roles", ""), _.get('deploy_mode', '')
                    ]
                )
        self.redis_obj.set(
            f"deploy_xlsx_{self.data.get('uuid')}", save_redis_ls)
        ip_mem_ls = []
        if not ip_mem.get("docp01"):
            ip_mem["docp01"] = 0
        for ip, mem in ip_mem.items():
            mem = round(mem / 1024, 2)
            mem = self.data.get('omp_mem') + mem if ip == "docp01" else mem
            ip_mem_ls.append(
                {
                    "hostname": ip,
                    "use_mem": f"{mem}G",
                    "all_mem": f"{round(self.copy_host_ip_mem.get(ip) / 1024, 2)}G"
                }
            )
        return ip_mem_ls

    def run(self):
        app_ls, json_res = self.get_app()
        res = self.check_special_count(app_ls, json_res)
        self.check_mem_distribution(res)
        self.service_distribution(res, json_res)
        return self.produce_res(res)


class InstallTempLastUtil:
    def __init__(self, r_uuid):
        self.uuid = r_uuid
        self.data = self.get_redis_data()

    def get_redis_data(self):
        redis_obj = RedisDB()
        flag, res = redis_obj.get(f"deploy_xlsx_{self.uuid}")
        if not flag:
            raise OperateError("模版导出缓存超时或不存在")
        return res

    def host(self, h_data):
        hosts = list(set([i[0] for i in self.data]))
        for line, host in enumerate(hosts):
            h_data.iloc[line + 4, 1] = host
        return h_data

    def service(self, s_data):
        for line, line_s in enumerate(self.data):
            row_add = 1
            for row, row_s in enumerate(line_s):
                s_data.iloc[line + 3, row + row_add] = row_s
        return s_data

    def run(self):

        file_path = os.path.join(
            PROJECT_DIR, 'package_hub/template/deployment-new.xlsx')
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names
        file_name = f"deployment-{self.uuid}.xlsx"
        with pd.ExcelWriter(os.path.join(PROJECT_DIR, 'tmp', file_name)) as writer:
            for sheet in sheet_names:
                data = pd.read_excel(excel_file, sheet_name=sheet)
                if sheet == "节点信息":
                    data = self.host(data)
                else:
                    data = self.service(data)
                data.to_excel(writer, sheet_name=sheet, index=False)
        return file_name


class InstallTempSecondView(GenericViewSet, CreateModelMixin):
    """
        create:
        自动生成模版结果
    """
    serializer_class = InstallTempSecondSerializer
    post_description = "生成模版结果"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        res = InstallTempSecondUtil(serializer.data).run()
        return Response(res)


class InstallTempLastView(GenericViewSet, CreateModelMixin):
    """
        create:
        生成模版文件并下载
    """
    serializer_class = InstallTempLastSerializer
    post_description = "获取模版"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        res = InstallTempLastUtil(serializer.data['uuid']).run()
        return Response(f"download/{res}")


class StopProcessView(GenericViewSet, CreateModelMixin):
    """
    create:
        升级安装回滚强制中断
    """

    def __init__(self, *args, **kwargs):
        super(StopProcessView, self).__init__(*args, **kwargs)
        self.change = False
        self.now_time = datetime.now()

    @staticmethod
    def get_redis(instance, t):
        redis_obj = RedisDB()
        _, res = redis_obj.get(f"{t}_{instance.id}")
        if res is None:
            return True
        return res

    def maininstallhistory(self, instance, timeout):
        pre_obj = instance.preinstallhistory_set.first()
        """前置状态检查"""
        if pre_obj and pre_obj.install_flag == 1:
            interval_time = int(
                (self.now_time - pre_obj.modified).total_seconds() / 60)
            if interval_time > timeout:
                pre_obj.install_flag = 3
                pre_obj.save()
                self.change = instance.task_id
        detail_objs = instance.detailinstallhistory_set.filter(
            install_step_status=DetailInstallHistory.INSTALL_STATUS_INSTALLING)
        for obj in detail_objs:
            interval_time = int(
                (self.now_time - obj.modified).total_seconds() / 60)
            if interval_time > timeout:
                obj.install_step_status = DetailInstallHistory.INSTALL_STATUS_FAILED
                obj.service.service_status = Service.SERVICE_STATUS_UNKNOWN
                obj.service.save()
                obj.save()
                self.change = instance.task_id
        if self.change:
            instance.install_status = MainInstallHistory.INSTALL_STATUS_FAILED
            instance.save()

    def rollbackhistory(self, instance, timeout):
        rollback_objs = instance.rollbackdetail_set.filter(
            rollback_state=RollbackStateChoices.ROLLBACK_ING)
        for obj in rollback_objs:
            interval_time = int(
                (self.now_time - obj.modified).total_seconds() / 60)
            if interval_time > timeout:
                obj.rollback_state = RollbackStateChoices.ROLLBACK_FAIL
                obj.upgrade.service.service_status = Service.SERVICE_STATUS_UNKNOWN
                obj.upgrade.service.save()
                obj.save()
                self.change = self.get_redis(instance, "rollback")
        if self.change and self.change is not None:
            instance.rollback_state = RollbackStateChoices.ROLLBACK_FAIL
            instance.save()

    def upgradehistory(self, instance, timeout):
        if instance.pre_upgrade_state == UpgradeStateChoices.UPGRADE_ING:
            interval_time = int(
                (self.now_time - instance.modified).total_seconds() / 60)
            if interval_time > timeout:
                instance.pre_upgrade_state = UpgradeStateChoices.UPGRADE_FAIL
                instance.save()
                self.change = self.get_redis(instance, "upgrade")
        upgrade_objs = instance.upgradedetail_set.filter(
            upgrade_state=UpgradeStateChoices.UPGRADE_ING)
        for obj in upgrade_objs:
            interval_time = int(
                (self.now_time - obj.modified).total_seconds() / 60)
            if interval_time > timeout:
                obj.upgrade_state = UpgradeStateChoices.UPGRADE_FAIL
                obj.service.service_status = Service.SERVICE_STATUS_UNKNOWN
                obj.service.save()
                obj.save()
                self.change = self.get_redis(instance, "upgrade")
        if self.change:
            instance.upgrade_state = UpgradeStateChoices.UPGRADE_FAIL
            instance.save()

    def create(self, request, *args, **kwargs):
        reflect_module = {
            "MainInstallHistory": [MainInstallHistory, "operation_uuid"],
            "UpgradeHistory": [UpgradeHistory, "id"],
            "RollbackHistory": [RollbackHistory, "id"]
        }
        data = self.request.data
        class_field = reflect_module.get(data.get("module"))
        if not class_field:
            raise OperateError("module传入不合法或为空")
        timeout = int(DEFAULT_STOP_TIME.get(data["module"]))
        instance = class_field[0].objects.filter(
            **{class_field[1]: data.get("module_id")}
        ).first()
        if not instance:
            raise OperateError("id查询字典为空")
        getattr(self, data["module"].lower())(instance, timeout)
        if self.change:
            if isinstance(self.change, bool):
                return Response(f"强制停止成功，但未查到执行进程，可能进程已处于中断状态")
            app.control.revoke(self.change, terminate=True)
            if app.AsyncResult(self.change) in ["REVOKED", "SUCCESS"]:
                return Response(f"强制停止成功")
            else:
                return Response(f"数据库已改变，但主进程可能存在未停止情况")
        else:
            return Response(f"未发现需要强制停止的服务或该服务未超过强制停止时间")
