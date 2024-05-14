import logging
import re
from service_conf.ser_conf_serializers import GetConfSerializer, GetAndCheckDependence, \
    PostConfSerializer, BaseConfSerializer, ChangeConfSerializer, GetAppConfSerializer
from rest_framework.exceptions import ValidationError
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import (
    ListModelMixin, CreateModelMixin
)
from rest_framework.response import Response
from db_models.models import Service, Product, ApplicationHub
from service_conf.utils import ChangeServiceArgs, get_background
from app_store.new_install_utils import change_conf
from utils.plugin.crypto import rsa_utils
from services.utils import get_all_apps
from app_store.new_install_utils import RedisDB

logger = logging.getLogger('server')


class GetConfInfoView(GenericViewSet, ListModelMixin, CreateModelMixin):
    """
        list:
        查看可选用的实例子与字段

        create:
        查看配置或依赖修改
    """
    # serializer_class = GetConfSerializer
    post_description = "查看配置或依赖修改"
    get_description = "查看可选用的实例子与字段"
    # 关闭权限、认证设置
    authentication_classes = ()
    permission_classes = ()

    def get_serializer_class(self):
        if not self.request or self.request.data.get('ser_or_app', 'ser') == "app":
            return GetAppConfSerializer
        return GetConfSerializer

    def list(self, request, *args, **kwargs):
        ser_or_app = request.query_params.get("ser_or_app", "ser")

        if ser_or_app == "app":
            app_ls = get_all_apps(ApplicationHub.objects.all().exclude(
                app_name__in=["hadoop", "doim"]), need_id=True)
            # app_dependence
            return Response({"data": app_ls,
                             "ser_or_app": ser_or_app,
                             "ser_field": ['app_port', 'app_install_args']})

        else:
            products = Product.objects.all().values_list("product_instance_name", flat=True)

            return Response(
                {
                    "app_name": set(
                        Service.objects.all().values_list("service__app_name", flat=True)
                    ),
                    "ser_or_app": ser_or_app,
                    "product_name": set([_.split("-")[0] for _ in products]),
                    "ser_field": [
                        'install_detail_args', 'service_port', 'service_controllers', 'service_role',
                        'service_status', 'vip', 'deploy_mode', 'service_instance_name', 'ip',
                    ]
                }
            )

    @staticmethod
    def app_create(data):
        redis_obj = RedisDB()
        flag, res = redis_obj.get("app_id_n_v_dc")
        if not flag:
            raise ValidationError("redis查询异常")
        need_app = []
        app_name, app_version = None, None
        data_info = data.get("data")
        for info in data_info:
            if info.get("child"):
                for app in list(info["child"].values())[0]:
                    app_name, app_version = app["name"], app["version"]
                    need_app.append(res[f'{app_name}-{app_version}'])
            else:
                app_name, app_version = info["name"], info["version"][0]
                need_app.append(res[f'{app_name}-{app_version}'])
        if data.get("change_type") == 2:
            return GetConfInfoView.de_on_app(need_app, app_name, app_version, res)
        return need_app

    @staticmethod
    def de_on_app(need_app, app_name, app_version, all_apps):
        """
        all_apps  所有名称对应的id
        """
        finally_need_app = []
        if len(need_app) != 1:
            raise ValidationError("被依赖仅可选择一个应用")
        redis_obj = RedisDB()
        flag, res = redis_obj.get("app_de_n_v_dc")
        if not flag:
            raise ValidationError("redis查询异常")
        for app_name_version, dependence in res.items():
            # ToDo 录入数据格式问题
            if not dependence:
                continue
            for de in dependence:
                if de.get("name") == app_name and re.match(de.get("version"), str(app_version)) is not None:
                    finally_need_app.append(all_apps[app_name_version])
        if len(finally_need_app) == 0:
            raise ValidationError(f"该服务{app_name}版本{app_version}找不到被依赖的服务")
        return finally_need_app

    @staticmethod
    def service_create(data):
        need_app = []
        product_name = data.get("product_name")
        if product_name:
            app_pro_dc = dict(
                ApplicationHub.objects.select_related(
                    "product__pro_name").filter(
                    product__isnull=False).values_list(
                    "app_name", "product__pro_name")
            )
            for app, pro in app_pro_dc.items():
                if pro in product_name:
                    need_app.append(app)
        need_app.extend(data.get("app_name", []))
        return need_app

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ser_or_app = serializer.data.get("ser_or_app")
        if ser_or_app == "app":
            need_app = self.app_create(serializer.data)
        else:
            need_app = self.service_create(serializer.data)
        change_obj = ChangeServiceArgs("get", serializer.data.get('ser_field'), set(need_app))
        change_obj.check_and_init()
        res = change_obj.get_data()
        if ser_or_app != 'app' and serializer.data.get('is_background'):
            return Response(get_background(res))
        res['change_type'] = serializer.data['change_type']
        return Response(res)


class PostConfInfoView(GenericViewSet, CreateModelMixin):
    """
        create:
        提交配置或依赖修改
    """
    serializer_class = PostConfSerializer
    post_description = "提交配置或依赖修改"


class GetAndCheckView(GenericViewSet, CreateModelMixin):
    """
        create:
        获取可用的依赖信息
    """
    serializer_class = GetAndCheckDependence
    post_description = "获取可用的依赖信息"

    @staticmethod
    def app_create(action, current_body):
        app_ls = []
        check_app = []
        for instance in current_body:
            check_app.append(instance["app_name"])
            app_ls.extend([_["name"] for _ in instance["app_dependence"]])
        return GetAndCheckDependence.get_apps(action, set(app_ls), set(check_app))

    @staticmethod
    def service_create(action, current_body):
        name_instance = {}
        name_cluster = {}
        app_ls = []
        for instance in current_body:
            app_ls.append(instance["service_instance_name"])
            for _ in instance["service_dependence"]:
                if _.get("instance_name"):
                    name_instance.setdefault(_["name"], set()).add(_["instance_name"])
                else:
                    name_cluster.setdefault(_["name"], set()).add(_["cluster_name"])
        return GetAndCheckDependence.get_ins(name_instance, name_cluster, action, app_ls)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        current_body = serializer.data['current_body']
        action = serializer.data.get('action')
        if current_body[0].get("service_instance_name"):
            res = self.service_create(action, current_body)
        else:
            res = self.app_create(action, current_body)

        return Response(res)


class ChangeConfView(GenericViewSet, CreateModelMixin):
    """
        create:
        同步修改本地配置
    """
    serializer_class = ChangeConfSerializer
    post_description = "同步修改本地配置"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        res, msg = change_conf(serializer.data["ids"])
        if not res:
            raise ValidationError("更新配置失败")
        return Response(msg)


class PostRsaView(GenericViewSet, CreateModelMixin):
    """
        create:
        rsa加解密工具
    """
    def create(self, request, *args, **kwargs):
        action = request.data.get("action")
        plain_text = request.data.get("plain_text")
        try:
            res = rsa_utils(plain_text, action)
            if not res:
                raise ValidationError(f"加解密失败或参数不符合{action}")
        except Exception as e:
            raise ValidationError(f"发生异常：{e}")
        return Response(res)
