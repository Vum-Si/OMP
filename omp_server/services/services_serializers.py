"""
服务序列化器
"""
import json
from rest_framework import serializers

from db_models.models import Service, ApplicationHub, CollectLogRuleHistory, ClearLogRule, Host
from utils.common.serializers import DynamicFieldsModelSerializer
from rest_framework_bulk import BulkSerializerMixin, BulkListSerializer
from utils.plugin.crontab_utils import change_task
from operator import itemgetter
from utils.common.exceptions import OperateError
from services.tasks import LogRuleExec


class ServiceStatusSerializer(DynamicFieldsModelSerializer):
    is_web = serializers.SerializerMethodField()
    is_base_env = serializers.BooleanField(source="service.is_base_env")
    service_status = serializers.CharField(source="get_service_status_display")
    app_version = serializers.CharField(source="service.app_version")
    app_name = serializers.CharField(source="service.app_name")

    class Meta:
        """ 元数据 """
        model = Service
        fields = (
            "ip", "app_name", "app_version", "service_status",
            "is_base_env", "is_web", "service_instance_name"
        )

    def get_is_web(self, obj):
        """ 或是是否为 web 服务 """
        if obj.service.extend_fields.get("affinity", "") == "tengine":
            return True
        return False


class ServiceSerializer(serializers.ModelSerializer):
    """ 服务序列化器 """

    port = serializers.SerializerMethodField()
    label_name = serializers.SerializerMethodField()
    cluster_type = serializers.SerializerMethodField()
    alert_count = serializers.SerializerMethodField()
    operable = serializers.SerializerMethodField()
    is_web = serializers.SerializerMethodField()
    is_base_env = serializers.BooleanField(source="service.is_base_env")
    service_status = serializers.CharField(source="get_service_status_display")
    app_type = serializers.IntegerField(source="service.app_type")
    app_name = serializers.CharField(source="service.app_name")
    app_version = serializers.CharField(source="service.app_version")
    env = serializers.CharField(source="env.name")

    class Meta:
        """ 元数据 """
        model = Service
        fields = (
            "id", "service_instance_name", "ip", "port", "label_name", "alert_count",
            "operable", "app_type", "app_name", "app_version", "cluster_type",
            "service_status", "is_base_env", "is_web", "env"
        )

    def get_is_web(self, obj):
        """ 或是是否为 web 服务 """
        if obj.service.extend_fields.get("affinity", "") == "tengine":
            return True
        return False

    def get_port(self, obj):
        """ 返回服务 service_port """
        service_port = "-"
        if obj.service_port is not None:
            service_port_ls = json.loads(obj.service_port)
            if len(service_port_ls) > 0:
                service_port = service_port_ls[0].get("default", "")
        return service_port

    def get_label_name(self, obj):
        """ 拼接返回标签 """
        label_name = "-"
        if obj.service.app_labels.exists():
            label_name = ", ".join(
                obj.service.app_labels.values_list("label_name", flat=True))
        return label_name

    def get_cluster_type(self, obj):
        """ 获取集群类型 """
        cluster_type = "单实例"
        if obj.cluster is not None:
            # cluster_type = obj.cluster.cluster_type
            cluster_type = "集群"
        return cluster_type

    def get_alert_count(self, obj):
        """ 获取告警数量 """
        alert_count = f"{obj.alert_count}次"
        # 服务状态为 '安装中'、'安装失败' 告警数量显示为 '-'
        if obj.service_status in (
                Service.SERVICE_STATUS_INSTALLING,
                Service.SERVICE_STATUS_INSTALL_FAILED):
            alert_count = "-"
        # '基础环境' 展示为 '-'
        base_env = obj.service.extend_fields.get("base_env", "")
        if isinstance(base_env, str):
            base_env = base_env.lower()
        if base_env in (True, "true"):
            alert_count = "-"
        return alert_count

    def get_operable(self, obj):
        """ 服务可操作 (启动、停止、重启) """
        if obj.service_controllers is not None:
            return obj.service_controllers.get("start", "") != ""
        return False


class ServiceDetailSerializer(serializers.ModelSerializer):
    """ 服务详情序列化器 """

    app_name = serializers.CharField(source="service.app_name")
    app_version = serializers.CharField(source="service.app_version")
    label_name = serializers.SerializerMethodField()
    cluster_type = serializers.SerializerMethodField()
    install_info = serializers.SerializerMethodField()
    history = serializers.SerializerMethodField()

    class Meta:
        """ 元数据 """
        model = Service
        fields = (
            "id", "service_instance_name", "app_name", "app_version", "label_name",
            "cluster_type", "ip", "install_info", "history", "created",
        )

    def get_install_info(self, obj):
        """ 安装信息 """
        result = {
            "service_port": "-",
            "base_dir": "-",
            "log_dir": "-",
            "data_dir": "-",
            "username": "-",
            "password": "-",
        }
        # 获取服务端口号
        if obj.service_port is not None:
            service_port_ls = json.loads(obj.service_port)
            if len(service_port_ls) > 0:
                result["service_port"] = service_port_ls[0].get("default", "")
        # 应用安装参数
        app_install_args = []
        if obj.detailinstallhistory_set.exists():
            detail_obj = obj.detailinstallhistory_set.first()
            app_install_args = detail_obj.install_detail_args.get(
                "install_args", [])
        for app_install_info in app_install_args:
            key = app_install_info.get("key", "")
            if key in result.keys():
                result[key] = app_install_info.get("default", "-")
        return result

    def get_label_name(self, obj):
        """ 获取拼接后的标签 """
        label_name = "-"
        if obj.service.app_labels.exists():
            label_name = ", ".join(
                obj.service.app_labels.values_list("label_name", flat=True))
        return label_name

    def get_cluster_type(self, obj):
        """ 获取集群类型 """
        cluster_type = "-"
        if obj.cluster is not None:
            cluster_type = obj.cluster.cluster_type
        return cluster_type

    def get_history(self, obj):
        """ 获取历史记录 """
        return list(obj.servicehistory_set.values(
            "username", "description", "result", "created"))


class ServiceActionSerializer(serializers.ModelSerializer):
    """ 服务动作序列化类 """

    class Meta:
        """ 元数据 """
        model = Service
        fields = '__all__'


class AppListSerializer(serializers.ModelSerializer):
    class Meta:
        """ 元数据 """
        model = ApplicationHub
        fields = '__all__'


class LogCollectSerializer(serializers.ModelSerializer):
    class Meta:
        """ 元数据 """
        model = CollectLogRuleHistory
        fields = '__all__'


class LogClearRuleSerializer(BulkSerializerMixin, serializers.ModelSerializer):
    host = serializers.CharField(source="host.ip")

    def update(self, instance, validated_data):
        update_keys = ["exec_value", "exec_rule"]
        host_args = [instance.id, instance.host.ip,
                     instance.host.data_folder, instance.exec_dir,
                     instance.exec_type]
        exec_args = itemgetter(
            *update_keys)(validated_data)
        host_args.extend(exec_args)
        exec_obj = LogRuleExec([host_args], int(validated_data.get("switch")))
        if not exec_obj.change_clear_action():
            raise OperateError("修改状态异常")
        return super(LogClearRuleSerializer, self).update(instance, validated_data)

    class Meta:
        """ 元数据 """
        model = ClearLogRule
        fields = '__all__'
        read_only_fields = (
            "id", "service_instance_name", "md5",
            "created", "exec_dir", "exec_type",
            "host")


class HostCronRuleSerializer(BulkSerializerMixin, serializers.ModelSerializer):

    def update(self, instance, validated_data):
        data = {
            "crontab_detail": validated_data.get("crontab_detail", {}),
            "is_on": True,
            "task_func": "services.tasks.log_clear_exec",
            "task_name": f"service_log_cron_task_{instance.id}"
        }
        change_task(instance.id, data)

        return super(BulkSerializerMixin, self).update(instance, validated_data)

    class Meta:
        """ 元数据 """
        model = Host
        fields = ("id", "ip", "crontab_detail")
        read_only_fields = ("id", "ip")
        list_serializer_class = BulkListSerializer


class GetSerUrlSerializer(serializers.ModelSerializer):
    """ 服务动作序列化类 """
    app_name = serializers.CharField(source="service.app_name")
    username = serializers.CharField(source="service_connect_info.service_username", allow_null=True, allow_blank=True)
    password = serializers.CharField(source="service_connect_info.service_password", allow_null=True, allow_blank=True)

    class Meta:
        """ 元数据 """
        model = Service
        fields = ('ip', 'service_port', 'app_name', 'username', 'password',)
