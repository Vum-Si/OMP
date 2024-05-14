"""
主机相关异步任务
"""

import os
import yaml
import time
import json
import redis
import logging

from celery import shared_task
from celery.utils.log import get_task_logger
from utils.plugin import public_utils
from utils.parse_config import (
    OMP_REDIS_PORT, OMP_REDIS_PASSWORD, OMP_REDIS_HOST, THREAD_POOL_MAX_WORKERS
)

from db_models.models import (
    UploadPackageHistory, ApplicationHub, ProductHub,
    MainInstallHistory, DetailInstallHistory
)
from app_store.upload_task import CreateDatabase
from app_store.install_exec import InstallServiceExecutor
# from app_store.install_executor import InstallServiceExecutor
from promemonitor.prometheus_utils import PrometheusUtils
from concurrent.futures import (
    ThreadPoolExecutor, as_completed
)

# 屏蔽celery任务日志中的paramiko日志
logging.getLogger("paramiko").setLevel(logging.WARNING)
logger = get_task_logger("celery_log")

current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(os.path.dirname(current_dir))
package_hub = os.path.join(project_dir, "package_hub")

package_dir = {"back_end_verified": "back_end_verified",
               "front_end_verified": "front_end_verified",
               "verified": "verified"}


class FiledCheck(object):
    """
     弱校验 只校验key
     强校验 在弱校验key存在的情况下校验value值
     params is_weak强校验前执行弱校验
     ignore 强校验中去除一些必要字段的强校验
     settings 待校验文本
     field 需要校验的字段，如果为空则强校验文本所有字段是否value为空
     is_weak 强校验一定包含弱校验。值为True，简化代码量。
    """

    def __init__(self, yaml_dir, db_obj):
        self.db_obj = db_obj
        self.yaml_dir = yaml_dir

    def strong_check(self, settings, field=None, is_weak=False, ignore=None, attention=""):
        try:
            if is_weak:
                if not self.weak_check(settings, field, attention=attention):
                    return False
            if ignore:
                field = field - ignore
            if isinstance(settings, dict):
                if not field:
                    field = set(settings.keys())
                for i in field:
                    if settings.get(i) is None:
                        self.db_obj.update_package_status(
                            1,
                            f"yml{i}缺乏值，检查yml文件{self.yaml_dir}")
                        return False
                return True
            elif isinstance(settings, list):
                if not field:
                    field = set(settings[0].keys())
                for i in settings:
                    for j in field:
                        if i.get(j) is None:
                            self.db_obj.update_package_status(
                                1,
                                f"yml{i}缺乏值，检查yml文件{self.yaml_dir}")
                            return False
                return True
            else:
                return False
        except Exception:
            self.db_obj.update_package_status(
                1,
                f"yml:{attention}异常，检查yml文件{self.yaml_dir}")
            return False

    def weak_check(self, settings, field, attention=""):
        try:
            if isinstance(settings, dict):
                # 以field为基准,settings多出的也不会显示,只要满足field即可
                status = field - set(settings.keys())
                if status:
                    self.db_obj.update_package_status(
                        1,
                        f"yml{str(status)}字段和预期不符，检查yml文件{self.yaml_dir}")
                    return False
                return True
            elif isinstance(settings, list):
                for i in settings:
                    status = field - set(i.keys())
                    if status:
                        self.db_obj.update_package_status(
                            1,
                            f"yml{str(status)}字段和预期不符，检查yml文件{self.yaml_dir}")
                        return False
                return True
            else:
                self.db_obj.update_package_status(
                    1,
                    f"字段检测异常，需要正确的字段{str(field)},父级字段{attention}")
                return False
        except Exception:
            self.db_obj.update_package_status(
                1,
                f"yml:{str(field)}异常，检查yml文件{self.yaml_dir}")
            return False


def exec_clear(clear_dirs):
    for clear_dir in clear_dirs:
        if len(clear_dir) <= 28:
            logger.error(f'{clear_dir}路径异常')
            return False
        else:
            clear_out = public_utils.local_cmd(
                f'rm -rf {clear_dir}')
            logger.info(f"清理环境路径{clear_dir}")
            if clear_out[2] != 0:
                logger.error('清理环境失败')
                return False
    return True


class ProduceJson:
    """
     upload_obj 上传记录表的id
     package_name 上传的安装包
     random_str 随机字符串，用于拼接临时校验目录
     upload_obj 上传记录表的id
    """

    def __init__(self, upload_obj, package_name, package_path, random_str, is_test):
        self.upload_obj = upload_obj
        self.package_name = package_name
        self.package_path = package_path
        self.random_str = random_str
        self.file_name = os.path.join(package_path, package_name)
        self.tmp_dir = None
        self.image = None
        self.product_is_repeat = False
        self.test = is_test

    def update_package_status(self, status, msg=None):
        self.upload_obj.package_status = status
        if msg:
            self.upload_obj.error_msg = msg
        self.upload_obj.save()
        logger.info(msg)
        return False

    def check_local_cmd(self, *args, msg=None):
        # _out, _err, _code
        if args[2] != 0:
            self.update_package_status(1, msg if msg else args[1])
            return False
        return True

    def get_md5(self, file_name=None):
        """
        获取md5值
        """
        file_name = file_name if file_name else self.file_name
        md5_out = public_utils.local_cmd(f'md5sum {file_name}')
        if self.check_local_cmd(*md5_out, msg="md5sum命令执行失败"):
            self.upload_obj.package_md5 = md5_out[0].split()[0]
            self.upload_obj.save()
            return md5_out

    def unzip_package(self):
        touch_name = self.file_name[:-7] if \
            self.file_name[-7:] == ".tar.gz" else self.file_name[:-3]
        self.tmp_dir = os.path.join(self.package_path, touch_name + self.random_str)
        # 创建临时校验路径
        os.mkdir(self.tmp_dir)
        tar_out = public_utils.local_cmd(f'tar -xmf {self.file_name} -C {self.tmp_dir}')
        return self.check_local_cmd(*tar_out, msg=f"安装包{self.package_name}解压失败或者压缩包格式不合规")

    def check_yaml(self, check_file=None):
        app_name = self.package_name.split('-', 1)[0]
        check_file = check_file if check_file \
            else os.path.join(self.tmp_dir, app_name, f'{app_name}.yaml')
        # yaml内容进行标准校验
        explain_yml = ExplainYml(self, check_file).explain_yml()
        # 这个校验可能用不到
        if isinstance(explain_yml, bool):
            return False
        return explain_yml[1]

    def get_image(self, app_name):
        try:
            image_dir = os.path.join(self.tmp_dir, f'{app_name}.svg')
            if os.path.exists(image_dir):
                with open(image_dir, 'r') as fp:
                    self.image = fp.read()
        except UnicodeDecodeError as e:
            logger.info(f"{self.package_name}包图片格式异常{e}")

    def get_publish_dir(self, info, valid_dir=None):
        tar_dir = os.path.join(project_dir, 'package_hub', 'verified')
        valid_dir = os.path.join(
            tar_dir, valid_dir) if valid_dir else tar_dir
        p_type = info.get('kind')
        if p_type == "product":
            info['clear_dir'] = [self.tmp_dir, self.file_name]
            valid_dir = os.path.join(valid_dir, f"{info.get('name')}-{info.get('version')}")
        else:
            info['clear_dir'] = [self.tmp_dir]
        info['target_dir'] = valid_dir

    def test_create_env(self, pro_name, pro_version):
        if self.test:
            package_obj = UploadPackageHistory.objects.create(
                operation_uuid="test",
                operation_user="admin",
                package_name=f"{pro_name}-{pro_version}",
                package_md5="testmd5",
                package_path="verified",
                package_status=3
            )
            product_obj = ProductHub.objects.create(
                is_release=True,
                pro_name=pro_name,
                pro_version=pro_version,
                pro_package=package_obj,
                pro_services=json.dumps([]),
                pro_dependence=json.dumps([], ensure_ascii=False),
                extend_fields={}
            )
            return product_obj

    def service(self, info, service_package=None, is_product=None):
        """
        包含通过产品校验和单独服务校验逻辑
        """
        service_package = service_package if service_package else self.package_name
        kind, version, name = (info.get(key) for key in ['kind', 'version', 'name'])
        if kind != "service":
            return self.update_package_status(
                1, f"安装包类型错误，请解压后单独发布服务"
            )
        # 校验服务是否唯一,无安装包跳过逻辑后
        app_obj = ApplicationHub.objects.filter(app_version=version, app_name=name).first()
        if app_obj:
            if self.product_is_repeat:
                return True
            elif self.test:
                # if app_obj.service_set.count() != 0:
                #    return self.update_package_status(
                #        1, f"{name}-{version} 该服务存在且被安装或升级"
                #    )
                info['version'] = f"{info['version']}-{str(time.time())}"
            else:
                return self.update_package_status(
                    1, f"{name}-{version} 已存在，请确认服务名称和版本号联合唯一"
                )

        # 校验md5
        if is_product:
            service_pk_name = service_package.rsplit("/", 1)[1]
            md5_ser = public_utils.local_cmd(f'md5sum {service_package}')
            if md5_ser[2] != 0:
                return self.update_package_status(1, "md5sum命令执行失败")
            md5_service = md5_ser[0].split()[0]
            # 对合法服务的记录进行创建操作，
            # 信息会追加入"product_service"字段并归入所属产品yaml，组件则不会有此值。
            s_obj = UploadPackageHistory.objects.create(
                operation_uuid=self.upload_obj.operation_uuid,
                operation_user=self.upload_obj.operation_user,
                package_name=service_pk_name,
                package_md5=md5_service,
                package_path=os.path.join(
                    package_dir.get(
                        "verified"), is_product
                ),
                package_status=0,
                package_parent=self.upload_obj
            )
            info['package_id'] = s_obj.id
        else:
            dependence_product = info.get("extend_fields", {}).get("product")
            if not dependence_product:
                return self.update_package_status(1, f"不能无依赖产品上传")
            product_obj = ProductHub.objects.filter(
                pro_name=dependence_product.get("name"),
                pro_version=dependence_product.get("version")
            ).last()
            product_obj = product_obj if product_obj else self.test_create_env(
                dependence_product.get("name"),
                dependence_product.get("version")
            )
            if not product_obj:
                return self.update_package_status(
                    1, f"归属的产品包在数据库中不存在"
                )
            pro_info = f"{product_obj.pro_name}-{product_obj.pro_version}"
            # app_n_v_dc = dict(ApplicationHub.objects.filter(product=product_obj).values_list(
            #    "app_name", "app_version")
            # )
            # if app_n_v_dc.get(name) == version:
            #    return self.update_package_status(
            #        1, f"依赖的产品包存在同服务同版本的服务包")
            self.upload_obj.package_status = 0
            self.upload_obj.package_path = os.path.join(
                package_dir.get("verified"),
                pro_info
            )
            self.upload_obj.save()
            info["move_dir"] = [self.file_name]
            self.get_publish_dir(info, valid_dir=pro_info)
        return info

    def product(self, info):
        services, version, name = (info.get(key) for key in ['service', 'version', 'name'])
        self.get_image(name)
        count = ProductHub.objects.filter(pro_version=version, pro_name=name).count()
        if count != 0:
            self.product_is_repeat = True
        service_yml_dirs = os.path.join(self.tmp_dir, name)
        # 成功的将会入库，未匹配到的则跳过逻辑。
        # 获取该路径下所有的压缩包，并与包名组成dict
        package_ls = [os.path.join(service_yml_dirs, i) for i in os.listdir(service_yml_dirs)]
        service_packages_value = [p for p in package_ls if os.path.isfile(p) and 'tar' in p]
        service_packages_key = [
            service_package.rsplit("/", 1)[1].split("-")[0]
            for service_package in
            service_packages_value
        ]
        service_packages = dict(
            zip(service_packages_key, service_packages_value))
        # 对匹配到的yaml进行yaml校验，此时逻辑产品下服务包没有合法，
        # 但产品内service字段存在的service必须有对应的yaml文件。

        ser_ls = []
        for i in services:
            service_name = i.get('name')
            service_package = service_packages.get(service_name)
            if not service_package:
                continue

            service_dir = os.path.join(service_yml_dirs, name, f"{service_name}.yaml")
            check_yaml = self.check_yaml(check_file=service_dir)
            if not check_yaml:
                return False
            res = self.service(check_yaml, service_package=service_package, is_product=f"{name}-{version}")
            if isinstance(res, dict):
                ser_ls.append(
                    {'name': service_name, 'version': res.get('version')}
                )
                info.setdefault("product_service", []).append(res)
                info.setdefault("move_dir", []).append(service_package)
            # 当返回ture时意味着该服务在产品内已存在 需要排查其他增量服务
            elif res:
                continue
            else:
                return False
        self.get_publish_dir(info)
        if not ser_ls:
            return self.update_package_status(1, "产品包已存在，或产品包下无可用服务")
        info['service'] = ser_ls
        return info

    def component(self, info):
        count = ApplicationHub.objects.filter(app_version=info.get('version'),
                                              app_name=info.get('name')).count()
        if count != 0:
            return self.update_package_status(
                1, f"安装包{self.package_name}已存在:请确保name联合version唯一")
        self.get_image(info.get('name'))
        info["move_dir"] = [self.file_name]
        self.get_publish_dir(info)
        return info

    def run(self):
        check_list = ['get_md5', 'unzip_package', 'check_yaml']
        res = None
        for _ in check_list:
            res = getattr(self, _)()
            if not res:
                return False
        return getattr(self, res.get('kind'))(res)


@shared_task
def front_end_verified(package_name, random_str, ver_dir, upload_obj, is_test=False):
    """
     前端发布界面校验逻辑及后端校验逻辑公共类
     params
     uuid 操作唯一id
     operation_user 执行用户
     package_name 上传的安装包
     md5 md5值，暂时不用，现为后端自己生成
     random_str 随机字符串，用于拼接临时校验目录
     ver_dir 区分前后端校验临时存储路径
     upload_obj 上传记录表的id
    """
    upload_obj = UploadPackageHistory.objects.get(id=upload_obj)
    package_path = os.path.join(package_hub, ver_dir)
    json_obj = ProduceJson(upload_obj, package_name, package_path, random_str, is_test)
    # 开启写入中间结果，包含发布入库所有的信息
    write_info = json_obj.run()
    if isinstance(write_info, dict):
        write_info['package_id'] = upload_obj.id
        write_info['image'] = json_obj.image
        middle_data = os.path.join(project_dir, 'data', f'middle_data-{upload_obj.operation_uuid}.json')
        with open(middle_data, mode='a', encoding='utf-8') as f:
            f.write(json.dumps(write_info, ensure_ascii=False) + '\n')
        return json_obj.update_package_status(0)
    else:
        exec_clear([json_obj.file_name, json_obj.tmp_dir])
        # "未知异常或产品下无可扫描的安装包"
        return json_obj.update_package_status(1)


class ExplainYml:
    """
    校验yml文件总类
    params:
    db_obj 更新记录表obj
    yaml_dir yaml文件路径
    """

    def __init__(self, db_obj, yaml_dir):
        # md5 的
        self.db_obj = db_obj
        self.yaml_exc = yaml_dir
        self.yaml_dir = yaml_dir.rsplit("/", 1)[1]
        self.check_obj = FiledCheck(self.yaml_dir, self.db_obj)

    def check_book_tools(self, key, value):
        """
        校验值bool类型，前置条件，需强校验通过
        后期根据需求进行扩展
        params:
        key输出错误日志的key
        value需要判断的值
        """
        if value.lower() == "false" or value.lower() == "true":
            return False
        self.db_obj.update_package_status(
            1,
            f"yml校验{key}非bool值，检查yml文件{self.yaml_dir}")
        return True

    def explain_yml(self):
        """
        各种kind类型公共字段
        """
        kinds = ['product', 'service', 'upgrade', 'component']
        try:
            with open(self.yaml_exc, "r", encoding="utf8") as fp:
                settings = yaml.load(fp, Loader=yaml.BaseLoader)
            if not settings:
                self.db_obj.update_package_status(
                    1,
                    f"yml文件为空，检查yml文件{self.yaml_dir}")
        except Exception as e:
            self.db_obj.update_package_status(
                1,
                f"yml包格式错误或文件不存在,请检查yml文件{self.yaml_dir}:{e}")
            return False
        # 将公共字段抽出校验，生成中间结果
        kind = settings.pop('kind', None)
        name = settings.pop('name', None)
        version = settings.pop('version', None)
        dependencies = settings.pop('dependencies', "-1")
        if dependencies == "-1":
            self.db_obj.update_package_status(
                1,
                f"yml校验dependencies校验失败，检查yml文件{self.yaml_dir}")
            return False
        if dependencies:
            for i in dependencies:
                if not i.get("name") or not i.get("version"):
                    self.db_obj.update_package_status(
                        1,
                        f"yml校验dependencies校验失败，检查yml文件{self.yaml_dir}")
                    return False
        if kind not in kinds:
            self.db_obj.update_package_status(
                1,
                f"yml校验kind校验失败，检查yml文件{self.yaml_dir}")
            return False
        if not name or not version:
            self.db_obj.update_package_status(
                1,
                f"yml校验name或version校验失败，检查yml文件{self.yaml_dir}")
            return False

        # 校验默认部署模式是否在所有部署模式中
        default_deploy_mode = settings.pop("default_deploy_mode", None)
        deploy_set = set()
        for dependence in dependencies:
            deploy_mode_ls = dependence.get("deploy_mode", None)
            if deploy_mode_ls:
                deploy_mode_ls = deploy_mode_ls.split(",")
                for deploy_mode in deploy_mode_ls:
                    deploy_set.add(deploy_mode)
        if default_deploy_mode is not None and \
                default_deploy_mode not in deploy_set:
            self.db_obj.update_package_status(
                1, f"yml校验default_deploy_mode字段异常，检查文件{self.yaml_dir}")
            return False
        deploy_mode_info = {
            "deploy_mode_ls": list(deploy_set),
            "default_deploy_mode": default_deploy_mode,
        }

        # 对剩余字段进行自定义校验
        yml = getattr(self, kind)(settings)
        if isinstance(yml, bool):
            return False
        db_filed = {
            "kind": kind,
            "name": name,
            "version": version,
            "dependencies": dependencies,
            "deploy_mode_info": deploy_mode_info,
            "extend_fields": settings
        }
        db_filed.update(yml[1])
        return True, db_filed

    def product(self, settings):
        """产品级校验"""
        db_filed = {}
        service = settings.pop('service', None)
        if not service:
            self.db_obj.update_package_status(
                1,
                f"yml校验service校验失败，检查yml文件{self.yaml_dir}")
            return False
        for i in service:
            if not i.get("name"):
                self.db_obj.update_package_status(
                    1,
                    f"yml校验service校验失败，检查yml文件{self.yaml_dir}")
                return False
        db_filed['service'] = service
        label = settings.pop('labels', None)
        if not label:
            self.db_obj.update_package_status(
                1,
                f"yml校验labels失败，检查yml文件{self.yaml_dir}")
            return False
        db_filed['labels'] = label
        description = settings.pop('description', "-1")
        if description == "-1":
            self.db_obj.update_package_status(
                1,
                f"yml校验description校验失败，检查yml文件{self.yaml_dir}")
            return False
        if description is not None and len(description) > 200:
            self.db_obj.update_package_status(
                1,
                f"yml校验description长度过长，检查yml文件{self.yaml_dir}")
            return False
        db_filed['description'] = description
        return True, db_filed

    def service_component(self, settings):
        """校验kind为service"""
        # service骨架弱校验
        db_filed = {}
        # post_action affinity base_env auto_launch不再校验
        # level 默认0 monitor不做校验
        first_check = {"ports", "install",
                       "control"}
        if not self.check_obj.weak_check(settings, first_check, attention=""):
            return False
        # auto_launch 校验 不填写默认给true
        settings["auto_launch"] = settings.get("auto_launch", "true")
        # base_env 校验 不填写True true 全部按照false处理
        db_filed['base_env'] = settings.pop('base_env', "")
        # ports 校验
        ports = settings.pop('ports')
        ports_strong_check = {"name", "protocol", "default", "key"}
        port = self.check_obj.strong_check(
            ports, ports_strong_check,
            is_weak=True,
            ignore={"key"},
            attention="ports") if ports else 1
        if not port:
            return False
        db_filed['ports'] = ports
        #  control校验
        control = settings.pop('control')
        control_weak_check = {"start", "stop", "restart", "install",
                              "init"}
        control_check = self.check_obj.weak_check(
            control,
            control_weak_check,
            attention='control')
        if not control_check:
            return False
        control_strong_check = self.check_obj.strong_check(
            control,
            {"install"},
            attention="control")
        if not control_strong_check:
            return False
        db_filed['control'] = control
        # install 校验
        install = settings.pop('install')
        single_strong_install = {"name", "key", "default"}
        install_check = self.check_obj.strong_check(
            install,
            single_strong_install,
            is_weak=True,
            attention="install") if install else 1
        if not install_check:
            return False
        db_filed['install'] = install
        # monitor 校验
        # monitor = settings.pop('monitor', None)
        # monitor_weak_check = {"process_name", "metric_port", "type", "health"}
        # monitor_check = self.check_obj.weak_check(
        #    monitor, monitor_weak_check,
        #    attention='monitor') if monitor else 1
        # if not monitor_check:
        #    return False
        db_filed['monitor'] = settings.pop('monitor', None)
        return True, db_filed

    def service(self, settings):
        """
        创建服务校验类，原服务类变为基类
        """
        level = settings.pop('level', -1)
        if level == -1:
            level = 0
        result = self.service_component(settings)
        if isinstance(result, bool):
            return False
        settings['level'] = level
        return True, result[1]

    def upgrade(self, settings):
        return self.service_component(settings)

    def component(self, settings):
        # 校验label,继承service
        db_filed = {}
        label = settings.pop('labels', None)
        if not label:
            self.db_obj.update_package_status(
                1,
                f"yml校验labels失败，检查yml文件{self.yaml_dir}")
            return False
        db_filed['labels'] = label
        description = settings.pop('description', "-1")
        if description == "-1":
            self.db_obj.update_package_status(
                1,
                f"yml校验description校验失败，检查yml文件{self.yaml_dir}")
            return False
        if description is not None and len(description) > 200:
            self.db_obj.update_package_status(
                1,
                f"yml校验description长度过长，检查yml文件{self.yaml_dir}")
            return False
        db_filed['description'] = description
        result = self.service_component(settings)
        if isinstance(result, bool):
            return False
        db_filed.update(result[1])
        return True, db_filed


def clear_check(need_rm):
    """
    梳理要删除的包
    """
    result = []
    for tmp_dir in need_rm:
        if ".tar" in tmp_dir[0]:
            result.append(tmp_dir[0])
            result.append(tmp_dir[2].rsplit('/', 1)[0])
        else:
            rm_dir = tmp_dir[0].rsplit('/', 1)[0]
            result.append(rm_dir)
            result.append(f"{rm_dir[:-10]}*")
    logger.info("需要删除的目录:" + " ".join(result))
    return " ".join(result)


@shared_task
def publish_bak_end(uuid, exc_len):
    """
    后台扫描同步等待发布函数
    params:
    uuid 当前唯一操作id
    exc_len 合法安装包个数
    """

    # 增加try，并增加超时机制释放锁
    exc_task = True
    time_count = 0
    try:
        while exc_task and time_count <= 600:
            # 当所有安装包的状态均不为正在校验，
            # 并和扫描出得包的个数相同且不为0，进行发布逻辑。
            valid_uuids = UploadPackageHistory.objects.filter(
                operation_uuid=uuid,
                package_parent__isnull=True,
            ).exclude(
                package_status=2)
            valid_success = valid_uuids.exclude(
                package_status=1).count()
            if valid_uuids.count() != exc_len:
                time_count += 1
                time.sleep(5)
            else:
                if valid_uuids.count() != 0 and valid_success != 0:
                    publish_entry(uuid)
                else:
                    exec_clear(["{0}/*".format(os.path.join(
                        package_hub, package_dir.get('back_end_verified')))])
                exc_task = False
    finally:
        re = redis.Redis(host=OMP_REDIS_HOST, port=OMP_REDIS_PORT, db=9,
                         password=OMP_REDIS_PASSWORD)
        re.delete('back_end_verified')


class PushUtil:

    def __init__(self, upload_obj, info):
        self.upload_obj = upload_obj
        self.info = info

    def update_package_status(self, status, msg=None):
        self.upload_obj.package_status = status
        self.upload_obj.error_msg = msg
        self.upload_obj.save()
        logger.info(msg)
        return False

    def check_local_cmd(self, *args, msg=None):
        # _out, _err, _code
        if args[2] != 0:
            return self.update_package_status(4, msg if msg else args[1])
        return True

    def move_file(self):
        target_dir = self.info['target_dir']
        if not os.path.exists(target_dir):
            os.mkdir(target_dir)
        for _ in self.info['move_dir']:
            if not _.endswith("gz"):
                return self.update_package_status(4, msg=f"文件不合法{_}")
        return self.check_local_cmd(*public_utils.local_cmd(
            f"mv {' '.join(self.info['move_dir'])} {target_dir}"
        ))

    def run(self):
        mv_status = self.move_file()
        clear_status = exec_clear(clear_dirs=self.info.get('clear_dir'))
        if mv_status and clear_status:
            self.upload_obj.package_status = 3
            self.upload_obj.save()
            return True
        else:
            self.upload_obj.error_msg = "清理目录异常，查看日志"
            self.upload_obj.save()
            return False


@shared_task
def publish_entry(uuid):
    """
    前台发扫描台发布函数公共类
    params:
    uuid 当前唯一操作id
    注：此异步任务的调用的前提必须是校验已完成状态
    """
    # 修改校验无误的安装包的状态为正在发布状态。
    UploadPackageHistory.objects.filter(
        is_deleted=False,
        operation_uuid=uuid,
        package_parent__isnull=True,
        package_status=0).update(package_status=5)

    json_data = os.path.join(project_dir, 'data', f'middle_data-{uuid}.json')
    with open(json_data, "r", encoding="utf8") as fp:
        lines = fp.readlines()
    for line in lines:
        line = json.loads(line)
        up_obj = UploadPackageHistory.objects.get(id=line['package_id'])
        if not PushUtil(up_obj, line).run():
            continue
        if line.get('kind') == 'product':
            CreateDatabase(line).create_product()
        elif line.get('kind') == 'service':
            product = line.get("extend_fields").get("product")
            product_obj = ProductHub.objects.filter(pro_name=product.get("name"),
                                                    pro_version=product.get(
                                                        "version")
                                                    ).last()
            up_obj.package_parent = product_obj.pro_package
            up_obj.save()
            CreateDatabase(line).create_service([line], product_obj)
        else:
            CreateDatabase(line).create_component()


def check_monitor_data(detail_obj):
    """
    根据部署详情信息，确认该服务的要监控的方式，并返回监控处理结果
    {
        "type": "JavaSpringBoot",
        "metric_port": "{service_port}",
        "process_name": ""
    }
    :param detail_obj: 部署详情对象
    :type detail_obj: DetailInstallHistory
    :return: (bool, _ret_dic)
    """

    def get_port(keyword):
        """
        根据关键字获取端口值
        :param keyword:
        :return:
        """
        service_port_ls = json.loads(detail_obj.service.service_port)
        for item in service_port_ls:
            if item.get("key") == keyword:
                return item.get("default")
        return None

    _ret_dic = {
        "listen_port": get_port("service_port"),
        "metric_port": None,
        "run_port": [],
        "only_process": False,
        "health": "",
        "process_key_word": None,
        "type": None
    }
    run_port_key_list = run_port_value_list = list()
    app_monitor = detail_obj.service.service.app_monitor
    if not app_monitor:
        return False, _ret_dic
    _health = app_monitor.get("health")
    run_port_key_list = app_monitor.get("run_port", [])
    if len(run_port_key_list) > 0:
        run_port_value_list = [get_port(key) for key in run_port_key_list]
        if None not in run_port_value_list:
            _ret_dic["run_port"] = run_port_value_list

    _ret_dic["type"] = app_monitor.get("type")
    _ret_dic["process_key_word"] = app_monitor.get("process_name")
    if isinstance(_health, str) and "port" in _health.lower():
        _health = get_port(_health.replace("{", "").replace("}", ""))
    elif isinstance(_health, dict):
        _health = get_port(list(_health.keys())[0])
    _ret_dic["health"] = _health
    if isinstance(app_monitor.get("metric_port"), str):
        _metric_port_key = app_monitor.get(
            "metric_port", "").replace("{", "").replace("}", "")
    elif isinstance(app_monitor.get("metric_port"), dict):
        _metric_port_key = list(app_monitor.get("metric_port", {}).keys())[0]
    else:
        _metric_port_key = None
    if detail_obj.service.service_port is not None:
        # _ret_dic["listen_port"] = get_port("service_port")
        _ret_dic["metric_port"] = get_port(_metric_port_key)
    if _ret_dic["metric_port"]:
        return True, _ret_dic
    if _ret_dic["process_key_word"]:
        _ret_dic["only_process"] = True
        return True, _ret_dic
    # TODO DOIM全部用进程监控
    DOIM_UNIC_PROCESS_KEY_DICT = {
        "ProxyWebExpress": "proxywebexpress",
        "pyweb": "DOIM/Server/webexpress/python/index.py",
        "mxagentrun": "MxAgent",
        "WebExpress": "webexpress/WebExpress",
        "TSManager": "TaskDispatcherManager",
    }
    if detail_obj.service.service.app_name.lower() == "doim":
        _service_name = detail_obj.service.service_instance_name.split("-")[0]
        _ret_dic = {
            "listen_port": get_port(_service_name),
            "metric_port": None,
            "only_process": True,
            "health": "",
            "process_key_word": DOIM_UNIC_PROCESS_KEY_DICT.get(_service_name, _service_name),
            "type": app_monitor.get("type")
        }
        return True, _ret_dic
    return False, _ret_dic


def add_single_service_prometheus(prometheus, tuple_item):
    """添加单个服务到prometheus"""
    detail_obj, _monitor_dic = tuple_item
    instance_name = detail_obj.service.service_instance_name
    service_port = _monitor_dic.get("listen_port")
    run_port = _monitor_dic.get("run_port", [])
    health = _monitor_dic.get("health")
    # 获取数据目录、日志目录
    app_install_args = detail_obj.install_detail_args.get(
        "install_args", [])
    data_dir = log_dir = base_dir = ""
    username = password = ""
    for info in app_install_args:
        if info.get("key", "") == "base_dir":
            base_dir = info.get("default", "")
        if info.get("key", "") == "data_dir":
            data_dir = info.get("default", "")
        if info.get("key", "") == "log_dir":
            log_dir = info.get("default", "")
        if info.get("key", "") == "username":
            username = info.get("default", "")
        if info.get("key", "") == "password":
            password = info.get("default", "")
    # TODO 后期优化
    ser_name = detail_obj.service.service.app_name
    if ser_name == "hadoop":
        ser_name = instance_name.split("_", 1)[0]
    elif ser_name == 'doim':
        ser_name = instance_name.split("-", 1)[0]
    prom_data_dict = {
        "service_name": ser_name,
        "instance_name": instance_name,
        "data_path": data_dir,
        "app_path": base_dir,
        "log_path": log_dir,
        "env": "default",
        "ip": detail_obj.service.ip,
        "listen_port": service_port,
        "run_port": run_port,
        "health": health,
        "metric_port": _monitor_dic.get("metric_port"),
        "only_process": _monitor_dic.get("only_process"),
        "process_key_word": _monitor_dic.get("process_key_word"),
        "username": username,
        "password": password,
    }
    # 添加服务到 prometheus
    is_success, message = prometheus.add_service(prom_data_dict)
    if not is_success:
        logger.error(
            f"Add Prometheus Failed {instance_name}, error: {message}")
        return False, f"Add Prometheus Failed {instance_name}, error: {message}"
    return True, f"Add Prometheus success {instance_name}"


def add_prometheus(main_history_id, queryset=None):
    """ 添加服务到 Prometheus """
    logger.info("Add Prometheus Begin")
    new_queryset = list()
    res = False
    prometheus = PrometheusUtils()
    # TODO 不同类型服务添加监控方式不同，后续版本优化
    # 仅更新已经安装完成的最新服务
    # 给monitor_agent刷新使用，提供detail_obj list。
    queryset = queryset if queryset else DetailInstallHistory.objects.filter(
        main_install_history_id=main_history_id,
        install_step_status=DetailInstallHistory.INSTALL_STATUS_SUCCESS
    ).exclude(service__service_split=1)
    if not queryset:
        return
    # TODO 已是否具有metrics端口或process_name作为是否需要添加监控的依据，后续版本优化
    # tuple_list: [(detail_obj, _ret_dic)...]
    tuple_list = [(item, check_monitor_data(item)[1]) for item in queryset if check_monitor_data(item)[0]]
    # new_queryset: [detail_obj, ...]
    new_queryset = [i[0] for i in tuple_list]
    for i in range(2):
        res, msg = prometheus.write_prometheus_yml(new_queryset)
        if res:
            break
    if not res:
        return
    prometheus.write_target_json(new_queryset)
    with ThreadPoolExecutor(THREAD_POOL_MAX_WORKERS) as executor:
        _future_list = list()
        for tuple_item in tuple_list:
            _future_obj = executor.submit(add_single_service_prometheus, *(prometheus, tuple_item))
            _future_list.append(_future_obj)

        error_message = ""
        for future in as_completed(_future_list):
            res_flag, message = future.result()
            if not res_flag:
                error_message += \
                    f"add prometheus: (execute_flag: {res_flag}; execute_msg: {message})"
    prometheus.reload_prometheus()
    logger.info("Add Prometheus End")


def make_inspection(username):
    """
    触发巡检任务
    :param username:
    :return:
    """
    logger.info("安装成功后触发巡检任务")
    from rest_framework.test import APIClient
    from rest_framework.reverse import reverse
    from db_models.models import UserProfile
    from db_models.models import Env
    data = {
        "inspection_name": "mock", "inspection_type": "deep",
        "inspection_status": "1", "execute_type": "man",
        "inspection_operator": username, "env": Env.objects.last().id
    }
    user = UserProfile.objects.filter(username=username).last()
    client = APIClient()
    client.force_authenticate(user)
    res = client.post(
        path=reverse("history-list"),
        data=json.dumps(data),
        content_type="application/json"
    ).json()
    logger.info(f"安装成功后触发巡检任务的结果为: {res}")
    return res


@shared_task
def install_service(main_history_id, username="admin", action=None):
    """
    安装服务
    :param main_history_id: MainInstallHistory 主表 id
    :param username: 执行用户
    :return:
    """
    try:
        # 为防止批量安装时数据库写入数据过多，这里采用循环的方式判断main_history_id
        try_times = 0
        while try_times < 3:
            if MainInstallHistory.objects.filter(id=main_history_id).exists():
                break
            time.sleep(5)
        else:
            logger.error(
                "Install Service Task Failed: can not find {main_history_id}")
        executor = InstallServiceExecutor(main_history_id, username, action=action)
        executor.main()
        logger.error(f"Install Service Task Success [{main_history_id}]")
    except Exception as err:
        import traceback
        logger.error(f"Install Service Task Failed [{main_history_id}], "
                     f"err: {err}")
        logger.error(traceback.format_exc())
        # 更新主表记录为失败
        MainInstallHistory.objects.filter(
            id=main_history_id).update(
            install_status=MainInstallHistory.INSTALL_STATUS_FAILED)

    # 安装成功，则注册服务至监控
    add_prometheus(main_history_id)

    # 安装成功，触发巡检任务
    if MainInstallHistory.objects.filter(
            id=main_history_id,
            install_status=MainInstallHistory.INSTALL_STATUS_SUCCESS
    ).exists():
        make_inspection(username=username)
