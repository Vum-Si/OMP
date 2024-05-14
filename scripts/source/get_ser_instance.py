import os
import sys
import json
import django
import logging
import argparse
from prettytable import PrettyTable

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
sys.path.append(os.path.join(PROJECT_DIR, 'omp_server'))

# 加载django环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omp_server.settings")
django.setup()
from db_models.models import Service, DetailInstallHistory, ClusterInfo


class Logging:

    @staticmethod
    def log_new(app_name, path_log):
        logger = logging.getLogger(app_name)
        formatter = logging.Formatter('[%(asctime)s-%(levelname)s]: %(message)s')
        logger.setLevel(level=logging.INFO)
        file_handler = logging.FileHandler(path_log)
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        return logger


class BaseDB:
    """仅负责查询不负责拼接处理"""

    def __init__(self, s_type):
        self.s_type = s_type

    def _get_data(self, func, field, **kwargs):
        db_name = func.__name__.lower()
        if not hasattr(self, f"{db_name}_db"):
            data_all = func.objects.filter(**kwargs)
            if data_all:
                setattr(self, f"{db_name}_db", [data_all, field])
        else:
            data_all = getattr(self, f"{db_name}_db")
            data_all.append(field)
        return data_all

    def merge(self):
        # get专用
        dbs_info = []
        field = []
        for i in dir(self):
            if i.endswith("_db"):
                func = i.split("_")
                args = getattr(self, i)
                db_info = list(getattr(self, func[0])(*args))
                if db_info:
                    field.extend(args[1:])
                    dbs_info.extend(db_info)
        if not dbs_info:
            return [], field
        # 排序,合成一张表
        finally_db = []
        dbs_info.sort(key=lambda data: data[-1], reverse=True)
        mid = dbs_info[0][-1]
        mid_ls = [mid]
        for info in dbs_info:
            if info[-1] == mid:
                mid_ls.extend(info[:-1])
            else:
                mid = info[-1]
                finally_db.append(mid_ls)
                mid_ls = [mid]
                mid_ls.extend(info[:-1])
        finally_db.append(mid_ls)
        return finally_db, field

    def save(self, kwargs={}, update=True):
        if not update:
            self.s_type = "get"
        for i in dir(self):
            if i.endswith("_db"):
                func = i.split("_")
                args = getattr(self, i)
                db_info = list(getattr(self, func[0])(*args, **kwargs))
                self.s_type = "post"
                return db_info

    def detailinstallhistory(self, *args, **kwargs):
        # objs ,*field [(2, 2), (3, 2), (4, 2), (5, 2)]
        if self.s_type == "get":
            return args[0].values_list(*args[1:], "service__id")
        return [args[0].update(**kwargs)]

    def service(self, *args, **kwargs):
        if self.s_type == "get":
            return args[0].values_list(*args[1:], "id")
        return [args[0].update(**kwargs)]

    def clusterinfo(self, *args, **kwargs):
        if self.s_type == "get":
            ser_args = [f"cluster__{i}" for i in args[1:]]
            dbs_info = []
            for i in args[0]:
                dbs_info.extend(list(i.service_set.values_list(*ser_args, "id")))
            return dbs_info
        return [args[0].update(**kwargs)]


# 入口 - 查库 处理拼接。库和字段对应的json


class AddField(object):
    """
    处理两个类连接处问题
    定义一个中间表
    """

    def __init__(self, available=True, is_child=False):
        self.available = available
        self.is_child = is_child

    def __call__(self, func):
        field_ls = [
            ["install_detail_args", "DetailInstallHistory"],
            [
                "service_port", "service_controllers", "service_role",
                "service_status", "vip", "deploy_mode", "service_instance_name",
                "ip", "service_dependence", "Service"
            ],
            ["cluster_service_name", "ClusterInfo"]

        ]

        get_func_dc = {
            "DetailInstallHistory": [DetailInstallHistory, "service__service__app_name"],
            "Service": [Service, "service__app_name"],
            "ClusterInfo": [ClusterInfo, "cluster_service_name__startswith"]
        }

        post_func_dc = {
            "DetailInstallHistory": [DetailInstallHistory, "service__in"],
            "Service": [Service, "id__in"],
        }

        def wrapper(*args, **kwargs):
            # ToDO此处需要增加校验,一般不考虑因为func都在自己函数哪
            if kwargs.get("data") is not None:
                return func(*args, **kwargs)
            # 此处不返回
            if kwargs.get("check"):
                args[0].base_func(self.available, self.is_child, args[0].field)

                # func(*args, **kwargs)
            db_info = None
            for db in field_ls:
                if func.__name__ in db:
                    db_info = post_func_dc[db[-1]] if kwargs.get("check") else get_func_dc[db[-1]]
            args[0].db._get_data(db_info[0], func.__name__, **{db_info[1]: args[0].name})

        return wrapper


class ChangeServiceArgsBase:
    def __init__(self, s_type, field, name, ids, char):
        self.s_type = s_type
        self.field = set(field.split(","))
        self.ids = set(ids.split(",")) if ids else set()
        self.name = name if s_type == "get" else list(self.ids)
        self.char = char
        self.data = None
        self.db = BaseDB(s_type)

    @staticmethod
    def base_func(available, is_child, func_name):
        func_name = list(func_name)[0]
        if not available:
            print(f"当前字段不支持修改{func_name}")
            sys.exit(1)
        if is_child:
            child_len = len(func_name.split("."))
            if child_len != 2:
                print(f"当前字段{func_name}非字符串字段，仅支持对子字段修改")
                sys.exit(1)


class ChangeServiceArgs(ChangeServiceArgsBase):

    #    def __new__(cls, *args, **kwargs):
    #    instance = super().__new__(cls)
    #    if callable(cls.db):
    #        cls.db = cls.db(args[2])
    #    return instance

    def __init__(self, s_type, field, name, ids="", char=""):
        super().__init__(s_type, field, name, ids, char)

    @AddField(is_child=True)
    def install_detail_args(self, **kwargs):
        child = kwargs.get("child")
        data = kwargs["data"].get("install_args", [])
        install_dc = [] if kwargs.get("check") else {}
        for install_args in data:
            if not child:
                install_dc[install_args["key"]] = install_args.get("default")
                continue
            if install_args.get("key") in child:
                if kwargs.get("check"):
                    if child[0] in ["base_dir", "log_dir", "data_dir"]:
                        print(f"此字段{child[0]}仅可查看，不能被修改")
                    install_args["default"] = self.char
                    return kwargs["data"]
                install_dc[install_args["key"]] = install_args.get("default")
        return install_dc

    @AddField(is_child=True)
    def service_port(self, **kwargs):
        """
        is_child: 当check为true(post)时，校验提交是否包含child，
        available: 当check为true(post)时，校验当前字段是否可被修改
        data: 获取字段的单一的值
        check: post时使用
        child: 当前字段下的子集
        char: 修改的字符串
        return: post时返回修改后的值
        get时返回需要保留字段的值
        """
        port_data = json.loads(kwargs["data"] or [])
        child = kwargs.get("child")
        port_dc = json.dumps([]) if kwargs.get("check") else {}
        for install_port in port_data:
            if not child:
                port_dc[install_port["key"]] = install_port.get("default")
                continue
            if install_port.get("key") in child:
                if kwargs.get("check"):
                    install_port["default"] = self.char
                    return json.dumps(port_data)
                port_dc[install_port["key"]] = install_port.get("default")
        return port_dc

    @AddField(is_child=True)
    def service_controllers(self, **kwargs):
        child = kwargs.get("child")
        data = kwargs["data"] if isinstance(kwargs["data"], dict) else {}
        if kwargs.get("check"):
            if data.get(child[0]):
                data[child[0]] = self.char
            return data
        if not child:
            return data
        for name in list(data):
            if name not in child:
                data.pop(name)
        return data

    @AddField()
    def service_role(self, **kwargs):
        return kwargs["data"]

    @AddField()
    def service_status(self, **kwargs):
        if kwargs.get("check"):
            ser_status = {status[1]: status[0] for status in Service.SERVICE_STATUS_CHOICES}
            try:
                status_code = ser_status[self.char]
                return status_code
            except Exception as e:
                print(f"请输入正确的状态{ser_status.keys()}")
                sys.exit(1)
        if not hasattr(self, "ser_status"):
            ser_status = {status[0]: status[1] for status in Service.SERVICE_STATUS_CHOICES}
            setattr(self, "ser_status", ser_status)
        return self.ser_status.get(int(kwargs["data"]))

    @AddField()
    def vip(self, **kwargs):
        return kwargs["data"]

    @AddField()
    def deploy_mode(self, **kwargs):
        return kwargs["data"]

    # 不可修改字段考虑增加参数
    @AddField(available=False)
    def service_instance_name(self, **kwargs):
        return kwargs["data"]

    @AddField(available=False)
    def ip(self, **kwargs):
        return kwargs["data"]

    @AddField(available=False)
    def service_dependence(self, **kwargs):
        return kwargs["data"]

    @AddField(available=False)
    def cluster_service_name(self, **kwargs):
        return kwargs["data"]

    @AddField(available=False)
    def id(self, **kwargs):
        return kwargs["data"]

    def check_and_init(self):
        check = False if self.s_type == "get" else True
        if "id" in self.field:
            print(f"不可通过字段id进行查询筛选")
            return False
        if self.s_type == "post" and len(self.field) != 1:
            print("修改暂时只支持单字段修改")
            return False
        for filed in self.field:
            func = filed.split(".")[0]
            if not hasattr(self, func):
                print(f"字段不存在{filed}:请确保输入字段的正确性")
                return False
            getattr(self, func)(check=check)
        return True

    def get_data(self):
        # [{"ip":"127.0.0.1","installargs"{}"}]
        # service
        # 真实库表的字段 service.a service.b
        nul_field = []
        data, db_field = self.db.merge()
        # 表头字段排序
        for n in self.field:
            n_field = n.split(".")[0]
            change = False
            for index, db in enumerate(db_field):
                if n_field == db:
                    db_field[index] = n
                    change = True
            if not change:
                # 空字段
                nul_field.append(n)
        db_field.insert(0, "id")
        table = PrettyTable(db_field)
        for line in data:
            for d_index, func_name in enumerate(db_field):
                func_ls = func_name.split(".")
                child = func_ls[1:] if len(func_ls) > 1 else []
                line[d_index] = getattr(self, func_ls[0])(data=line[d_index], child=child)
            table.add_row(line)
        print(table)
        if nul_field:
            print(f"空字段不做展示,可能查询的服务或字段无数据:{','.join(nul_field)}")

    def post_data(self):
        func_ls = list(self.field)[0].split(".")
        need_get = ["service_status", "install_detail_args", "service_port", "service_controllers"]
        if func_ls[0] in need_get:
            data = self.db.save(update=False)
            if data:
                data = data[0][0]
            else:
                print("无该id查询的服务")
                sys.exit(0)
            child = [func_ls[1]] if len(func_ls) == 2 else []
            post_data = getattr(self, func_ls[0])(data=data, check=True, child=child)
        else:
            post_data = self.char
        self.db.save(kwargs={func_ls[0]: post_data})

    # 先把field执行一次 ，校验
    # 然后通过装饰器告诉要查的对象
    # 然后通过merge分发给各个字段进行处理。如果是空可以理解就是无相关数据。直接返字段下未空即可

    # 写入逻辑。首先不需要做合并，
    # 先筛选出合适的obj。进行校验。（有些字段不可修改，修改的有的字段必须包含child，且child的len为1）
    # 读取含有child的字段进行更新 。返回数据层进行更新


# 做最后数据的拼接和整合用
def parameters():
    """
    传递参数
    :return: 脚本接收到的参数
    """
    explain = "可修改查看字段\n" \
              "service_port\n" \
              "service_controllers\n" \
              "service_role\n" \
              "service_status\n" \
              "vip\n" \
              "install_detail_args\n" \
              "deploy_mode\n" \
              "仅可查看的字段\n" \
              "service_instance_name\n" \
              "ip\n" \
              "service_dependence\n" \
              "cluster_service_name\n" \
              "支持子字段的字段\n" \
              "service_port\n" \
              "service_controllers\n" \
              "install_detail_args"
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", "-action", required=True, choices=["get", "post"],
                        help="执行的动作get or post")
    parser.add_argument("--ids", "-ids", help="制定修改的服务id，由get获取,get时此参数无效，多个以逗号分隔")
    parser.add_argument("--app_name", "-app_name", help="组件名称 如mysql,jdk")
    parser.add_argument("--field", "-field",
                        required=True, help=f"查询或修改的字段，"
                                            f"查询时多字段可逗号分隔，"
                                            f"修改仅支持单字段修改,"
                                            f"子字段以英文字符点分隔多个以多个点分隔\n{explain}")
    parser.add_argument("--char", "-char", help="要修改字段的值，post时使用,get时此参数无效")
    param = parser.parse_args()
    return param


if __name__ == "__main__":
    # 初步校验
    # 日志记录
    # 参数传递
    param = parameters()
    ids, char, app_name = param.ids, param.char, param.app_name

    change_obj = ChangeServiceArgs(param.action, param.field, app_name, ids=ids, char=char)
    log = Logging.log_new("conf", os.path.join(PROJECT_DIR, f"logs/get_post_conf.log"))
    log.info(
        "action:{3},field:{4},ids:{0},app_name:{1},char:{2},".format(
            ids, app_name, char, param.action, param.field))
    res = change_obj.check_and_init()
    if not res:
        sys.exit(1)

    if param.action == "post":
        if not ids or not char:
            print("缺少参数ids或char")
            sys.exit(1)
        try:
            id_ls = ids.split(",")
            [int(i) for i in id_ls]
        except Exception as e:
            print("id不合法")
            sys.exit(1)

        change_obj.post_data()
        change_obj.s_type = "get"
        change_obj.db.s_type = "get"
    else:
        if not app_name:
            print("缺少参数app_name")
            sys.exit(1)
    change_obj.get_data()
