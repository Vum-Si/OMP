import os
from db_models.models import ApplicationHub, ProductHub, UploadPackageHistory, Labels
import logging
from celery.utils.log import get_task_logger
import json

logging.getLogger("paramiko").setLevel(logging.WARNING)
logger = get_task_logger("celery_log")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))


class CreateDatabase(object):
    """
     创建产品表，服务表，标签表公共类
     params json_data创建表所需要的json
     label_type json归属类型
     eg: 1 产品类型
    """

    def __init__(self, json_data):
        self.json_data = json_data
        self.label_type = None

    def str_to_bool(self, value):
        """
        str转换bool值
        """
        str_bool = self.json_data.get(value)
        result = "true" if str_bool.lower() == "true" else None
        return bool(result)

    def dependence_clear(self, start=False):
        data_info = self.json_data.get('dependencies', [])
        if data_info:
            dependence_ls = list({d["name"]: d for d in data_info}.values())
            # ToDO 首位匹配期望取消
            if start:
                for key in dependence_ls:
                    if isinstance(key, dict):
                        key["version"] = key.get("version", "").split(".")[0]
            data_info = dependence_ls
        return json.dumps(data_info, ensure_ascii=False)

    def explain(self, data, default=None):
        """
        将dict list转换成 json
        """
        data_info = self.json_data.get(data)
        if data_info:
            if isinstance(data_info, dict) or isinstance(data_info, list):
                data_info = json.dumps(data_info, ensure_ascii=False)
        else:
            data_info = default
        return data_info

    def _get_app_deploy_mode_ls(self):
        """ 获取服务的部署模式 """
        try:
            deploy_mode_info = self.json_data.get("deploy_mode_info", {})
            deploy_mode_ls = deploy_mode_info.get("deploy_mode_ls", [])
            if len(deploy_mode_ls) > 0:
                return deploy_mode_info
        except Exception:
            pass
        return None

    def create_product(self):
        """
        创建产品表
        """
        self.label_type = 1
        self.create_lab()
        _dic = {
            "is_release": True,
            "pro_name": self.json_data.get('name'),
            "pro_version": self.json_data.get('version'),
            "pro_description": self.json_data.get('description'),
            "pro_dependence": self.dependence_clear(),
            "pro_services": self.explain('service', []),
            "pro_package_id": self.json_data.get('package_id'),
            "pro_logo": self.json_data.get('image'),
            "extend_fields": self.json_data.get("extend_fields")
        }
        pro_queryset = ProductHub.objects.filter(
            pro_name=self.json_data.get('name'),
            pro_version=self.json_data.get('version')
        )
        if pro_queryset.exists():
            pro_queryset.update(**_dic)
            app_obj = pro_queryset.first()
        else:
            app_obj = ProductHub.objects.create(**_dic)
        app_obj.save()
        # 创建lab表
        self.create_pro_app_lab(app_obj)
        service = self.json_data.pop('product_service')
        # 创建服务表
        self.create_service(service, app_obj)

    def create_service(self, service, app_obj):
        """
        创建服务表
        params service service的json字段，格式同json_data一致
        app_obj 需要关联产品表的对象
        """
        # 实例化变量添加label标签，创建产品名称标签，类型组件
        self.json_data['labels'] = [app_obj.pro_name]
        self.label_type = 0
        self.create_lab()
        # pro_services = json.loads(app_obj.pro_services)
        # name_ls = [name.get('name') for name in pro_services]
        # version_ls = [version.get('version') for version in pro_services]
        for info in service:
            self.json_data = info
            # 服务json添加labels字段，给create_pro_app_lab做筛选
            self.json_data['labels'] = [app_obj.pro_name]
            # 按照服务名和版本进行划分 如果存在则覆盖，否则创建
            monitor = self.json_data.get(
                "monitor") if self.json_data.get("monitor") else None
            extend_fields = self.json_data.get("extend_fields")
            app_description = extend_fields.pop("description", "")
            _dic = {
                "is_release": True,
                "app_type": 1,
                "app_name": self.json_data.get("name", ""),
                "app_version": self.json_data.get("version", ""),
                "app_port": self.explain("ports", json.dumps([])),
                "app_dependence": self.dependence_clear(start=True),
                "app_install_args": self.explain("install"),
                "app_controllers": self.explain("control"),
                "app_package_id": self.json_data.get("package_id"),
                "product": app_obj,
                "extend_fields": extend_fields,
                "app_description": app_description,
                "is_base_env": self.str_to_bool("base_env"),
                "app_monitor": monitor,
                "deploy_mode": self._get_app_deploy_mode_ls(),

            }
            app_queryset = ApplicationHub.objects.filter(
                app_name=self.json_data.get("name"),
                app_version=self.json_data.get("version")
            )
            # if _dic["app_name"] not in name_ls \
            #        or _dic["app_version"] not in version_ls:
            #    pro_services.append({
            #        "name": _dic["app_name"],
            #        "version": _dic["app_version"]
            #    })
            if app_queryset.exists():
                app_queryset.update(**_dic)
            else:
                ser_obj = ApplicationHub.objects.create(**_dic)
                # 做多对多关联
                self.create_pro_app_lab(ser_obj)
        # app_obj.pro_services = json.dumps(pro_services, ensure_ascii=False)
        # app_obj.save()

    def create_component(self):
        """
        创建组件表 逻辑同创建产品表一致
        """
        self.label_type = 0
        self.create_lab()
        monitor = self.json_data.get(
            "monitor") if self.json_data.get("monitor") else None
        _dic = {
            "is_release": True,
            "app_type": 0,
            "app_name": self.json_data.get("name"),
            "app_version": self.json_data.get("version"),
            "app_description": self.json_data.get("description"),
            "app_port": self.explain("ports"),
            "app_dependence": self.dependence_clear(start=True),
            "app_install_args": self.explain("install"),
            "app_controllers": self.explain("control"),
            "app_package_id": self.json_data.get("package_id"),
            "extend_fields": self.json_data.get("extend_fields"),
            "app_logo": self.json_data.get("image"),
            "is_base_env": self.str_to_bool("base_env"),
            "app_monitor": monitor,
            "deploy_mode": self._get_app_deploy_mode_ls()
        }
        app_queryset = ApplicationHub.objects.filter(
            app_name=self.json_data.get("name"),
            app_version=self.json_data.get("version")
        )
        if app_queryset.exists():
            app_queryset.update(**_dic)
            app_obj = app_queryset.first()
        else:
            app_obj = ApplicationHub.objects.create(**_dic)
        self.create_pro_app_lab(app_obj)

    def create_pro_app_lab(self, obj):
        """
        创建lab表和服务表应用表做多对多关联
        """
        labels = self.json_data.get('labels')
        for i in labels:
            label_obj = Labels.objects.get(
                label_name=i, label_type=self.label_type)
            if self.label_type == 1:
                obj.pro_labels.add(label_obj)
            else:
                obj.app_labels.add(label_obj)

    def create_lab(self):
        """
        创建lab表，未存在的名称做创建，已存在的跳过处理
        """
        labels_obj = Labels.objects.filter(label_type=self.label_type)
        labels = [i.label_name for i in labels_obj]
        compare_labels = set(self.json_data.get('labels')) - set(labels)
        compare_list = []
        if compare_labels:
            for compare_label in compare_labels:
                label_obj = Labels(
                    label_name=compare_label,
                    label_type=self.label_type
                )
                compare_list.append(label_obj)
            Labels.objects.bulk_create(compare_list)
