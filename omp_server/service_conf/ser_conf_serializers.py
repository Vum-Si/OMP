import datetime
from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from rest_framework.serializers import Serializer
from db_models.models import ApplicationHub, Service, ServiceConfHistory
from service_conf.utils import ChangeServiceArgs
from services.utils import check_repeat


class BaseConfSerializer(Serializer):
    CONF = 0
    DE = 1
    DE_ON = 2
    INSTALL_TYPE_CHOICES = (
        (CONF, "配置"),
        (DE, "依赖"),
        (DE_ON, "被依赖"),
    )
    change_type = serializers.ChoiceField(
        choices=INSTALL_TYPE_CHOICES,
        help_text="选择类型",
        required=True, allow_null=False, allow_blank=False,
        error_messages={"required": "必须包含[change_type]字段"}
    )
    ser_or_app = serializers.CharField(
        help_text="服务类别应用类别",
        required=False,
    )

    @staticmethod
    def get_ser_fields(ser_field):
        """
        install_detail_args.username,install_detail_args.password
        转 install_detail_args.username.password
        install_detail_args.username.password,install_detail_args.base_dir
        转 install_detail_args.username.password.base_dir
        """
        new_ls = []
        pre = None
        for i in sorted(ser_field):
            filed_ls = i.split(".")
            if filed_ls[0] == pre:
                new_ls[-1] = f'{new_ls[-1]}.{".".join(filed_ls[1:])}'
            else:
                pre = filed_ls[0]
                new_ls.append(i)
        return new_ls


class GetConfSerializer(BaseConfSerializer):
    app_name = serializers.ListField(
        child=serializers.CharField(),
        help_text="服务名称",
        required=False
    )
    product_name = serializers.ListField(
        child=serializers.CharField(),
        help_text="产品名称",
        required=False,
    )
    ser_field = serializers.ListField(
        help_text="字段名称",
        required=True,
        error_messages={"required": "必须包含[ser_field]字段"}
    )
    is_background = serializers.CharField(
        help_text="是否为后台请求",
        required=False,
    )

    def validate_ser_field(self, ser_field):
        if "id" in ser_field:
            raise ValidationError("不可通过字段id进行查询筛选")
        if len(ser_field) >= 2 and "service_dependence" in ser_field:
            raise ValidationError("字段不可以混搭")
        ser_field = self.get_ser_fields(ser_field)
        # new_ls.insert(0, "service_instance_name")
        if "service_instance_name" not in ser_field:
            ser_field.append("service_instance_name")
        return list(set(ser_field))

    def validate(self, attrs):
        if int(attrs.get("change_type")) == 0 and \
                "service_dependence" in attrs.get("ser_field"):
            raise ValidationError("配置不允许service_dependence字段")
        if not attrs.get("app_name") and not attrs.get("product_name"):
            raise ValidationError("服务名称和产品名称至少选择一项")
        return attrs


class GetAppConfSerializer(BaseConfSerializer):
    data = serializers.ListField(
        child=serializers.DictField(),
        help_text="勾选服务列表",
        required=True
    )
    ser_field = serializers.ListField(
        help_text="app可查询字段",
        required=True,
        error_messages={"required": "必须包含[ser_field]字段"}
    )

    def validate_ser_field(self, ser_field):
        for filed in ser_field:
            if filed.split(".")[0] not in ['app_port', 'app_install_args', 'app_dependence']:
                raise ValidationError("查询字段不被允许")
        if len(ser_field) >= 2 and "app_dependence" in ser_field:
            raise ValidationError("字段不可以混搭")
        ser_field = self.get_ser_fields(ser_field)
        ser_field.extend(["app_name", "app_version"])
        return list(set(ser_field))

    def validate_data(self, data):
        check_repeat(data)
        for info in data:
            error = info.get("error")
            if error in "不允许纳管不同版本":
                raise ValidationError(error)
        return data

    def validate(self, attrs):
        change_type = int(attrs.get("change_type"))
        if change_type == 0 and \
                "app_dependence" in attrs.get("ser_field"):
            raise ValidationError("配置不允许app_dependence字段")
        if change_type == 2:
            app_data = attrs.get("data")
            if len(app_data) == 1 and not app_data[0].get("child"):
                return attrs
            else:
                raise ValidationError("查询被依赖仅可勾选单个基础服务")
        return attrs


class PostConfSerializer(BaseConfSerializer):
    """
    记住选择依赖类型修改的时候不允许勾选不同类别的服务进行依赖更新。或者进行甄别
    service_dependence.add.nacos.cluster_name(instance_name)
    """
    ser_field = serializers.CharField(
        help_text="字段名称",
        required=True,
        error_messages={"required": "必须包含[ser_field]字段"}
    )
    ids = serializers.ListField(
        help_text="服务id列表",
        required=True,
        error_messages={"required": "必须包含[ids]字段"}
    )
    char = serializers.CharField(
        help_text="修改结果",
        required=True,
        error_messages={"required": "必须包含[ser_field]字段"}
    )
    de_info = serializers.DictField(help_text="依赖详细信息")

    def validate_de_info(self, de_info):
        """
        {"app_name":"动作服务","app_type":"cluster_name"}
        """
        if de_info and isinstance(de_info, dict):
            if {"action", "name", "app_type", "char"} - set(de_info):
                raise ValidationError("请输入正确字段")
            if de_info["action"] not in ["add", "del", "edit"]:
                raise ValidationError("请输入正确动作")
        return de_info

    def validate(self, attrs):
        de_info = attrs.get("de_info")
        ser_or_app = attrs.get("ser_or_app")
        if ser_or_app != "app" and de_info and de_info.get("app_type") not in ["cluster_name", "instance_name"]:
            raise ValidationError("请输入正确服务类型")
        return attrs

    def create(self, validated_data):
        ser_field = validated_data["ser_field"]
        if int(validated_data["change_type"]) in [1, 2]:
            de = validated_data["de_info"]
            validated_data['char'] = de['char']
            if "." in ser_field:
                raise ValidationError("依赖类型无子节点")
            ser_field = f"{ser_field}.{de['action']}.{de['name']}.{de.get('app_type', 'instance_name')}"

        de_char = ','.join(validated_data.get('de_info', {}).get('char', []))
        ids = [str(i) for i in validated_data['ids']]
        ServiceConfHistory.objects.create(
            instance_name=",".join(ids),
            change_field=ser_field,
            change_value=de_char if de_char else validated_data['char'],
            change_type=validated_data.get('change_type'),
            create_time=datetime.datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S")

        )

        change_obj = ChangeServiceArgs(
            "post", [ser_field], "", ids=validated_data['ids'], char=validated_data['char']
        )
        change_obj.check_and_init()
        change_obj.post_data()
        return validated_data


class GetAndCheckDependence(Serializer):
    action = serializers.CharField(
        help_text="动作类型",
        required=True,
        error_messages={"required": "必须包含[ser_field]字段"}
    )
    current_body = serializers.ListField(
        child=serializers.DictField(),
        help_text="当前处理body",
        required=True,
        error_messages={"required": "必须包含[current_body]字段"}
    )

    def validate_action(self, action):
        if action not in ["add", "del", "edit"]:
            raise ValidationError("请输入正确动作")
        return action

    @staticmethod
    def append_response(source, response_ls, app_type):
        for name, instance in source.items():
            response_ls.append(
                {"name": name,
                 "char": list(instance),
                 "app_type": app_type}
            )

    @staticmethod
    def get_ins(name_instance, name_cluster, action, app_ls):
        # 需要类型 也需要app-name 不然无法获取到底哪个app
        response_ls = []
        instance_dc, cluster_dc = {}, {}
        if action == "del":
            instance_dc, cluster_dc = name_instance, name_cluster
        else:
            component = Service.objects.filter(
                service__app_type=ApplicationHub.APP_TYPE_COMPONENT).select_related(
                "service", "cluster").values_list(
                "service__app_name", "service_instance_name", "cluster__cluster_name")

            app_ls = [i[0] for i in component if i[1] in app_ls]
            for i in component:
                if i[0] in app_ls:
                    continue
                # add集群需要在以装依赖里不存在 edit可以，但会覆盖,只要依赖的app就不可添加
                if i[2]:
                    if action == "edit" or not name_cluster.get(i[0]):
                        cluster_dc.setdefault(i[0], set()).add(i[2])
                else:
                    if action == "edit" or not name_instance.get(i[0]):
                        instance_dc.setdefault(i[0], set()).add(i[1])
        GetAndCheckDependence.append_response(instance_dc, response_ls, "instance_name")
        GetAndCheckDependence.append_response(cluster_dc, response_ls, "cluster_name")
        return response_ls

    @staticmethod
    def get_apps(action, app_ls, check_app):
        """
        check_app 已勾选的服务
        action 动作
        app_ls 现有勾选服务里所有依赖的服务列表
        # 添加修改是添加不存在check_app的
        return [{name:"doucApi","version":[1.0,2.0]}]
        """
        edit_add_dc = {}

        if action == "del":
            # 需要解决
            return [{"name": _, "char": [], "app_type": ""} for _ in app_ls]
        else:
            all_app = list(ApplicationHub.objects.filter(
                app_type=ApplicationHub.APP_TYPE_COMPONENT).values(
                "app_name", "app_version"))
            for app in all_app:
                if app.get("app_name") not in check_app:
                    if action == "add" and app.get("app_name") in app_ls:
                        continue
                    edit_add_dc.setdefault(app.get("app_name"), []).append(app.get("app_version"))

            return [{"name": n, "char": v, "app_type": ""} for n, v in edit_add_dc.items()]


class ChangeConfSerializer(Serializer):
    ids = serializers.ListField(
        help_text="服务id列表",
        required=True,
        error_messages={"required": "必须包含[ids]字段"}
    )
