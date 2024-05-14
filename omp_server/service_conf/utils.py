import json
from db_models.models import Service, DetailInstallHistory, ApplicationHub
from rest_framework.exceptions import ValidationError
import logging
from datetime import datetime
from app_store.new_install_utils import RedisDB

logger = logging.getLogger('server')


class BaseDB:
    """仅负责查询不负责拼接处理"""

    def __init__(self, s_type):
        self.s_type = s_type

    def _get_data(self, func, field, **kwargs):
        """
        获取符合筛选的queryset
        """
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
        """
        get数据合并
        """
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

    def save(self, kwargs={}, update=True, ):
        if not update:
            self.s_type = "get"
        for i in dir(self):
            if i.endswith("_db"):
                func = i.split("_")
                args = getattr(self, i)
                db_info = list(getattr(self, func[0])(*args, **kwargs))
                self.s_type = "post"
                return db_info

    @staticmethod
    def save_dbs(*args, **kwargs):
        multiple = kwargs.pop("multiple")
        if multiple:
            k, v = kwargs.popitem()
            if len(v) != len(args[0]):
                raise ValidationError("查询的orm对象与获取行数不匹配")
            for index, obj in enumerate(args[0]):
                setattr(obj, k, v[index])
                obj.save()
            return args[0]
        else:
            return [args[0].update(**kwargs)]

    def detailinstallhistory(self, *args, **kwargs):
        # objs ,*field [(2, 2), (3, 2), (4, 2), (5, 2)]
        if self.s_type == "get":
            return args[0].values_list(*args[1:], "service__id")
        return self.save_dbs(*args, **kwargs)

    def applicationhub(self, *args, **kwargs):
        if self.s_type == "get":
            return args[0].values_list(*args[1:], "id")
        return self.save_dbs(*args, **kwargs)

    def service(self, *args, **kwargs):
        if self.s_type == "get":
            return args[0].values_list(*args[1:], "id")
        return self.save_dbs(*args, **kwargs)


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
            ["app_name", "app_version", "app_port", "app_install_args", "app_dependence", "ApplicationHub"],
        ]

        get_func_dc = {
            "DetailInstallHistory": [DetailInstallHistory, "service__service__app_name__in"],
            "Service": [Service, "service__app_name__in"],
            "ApplicationHub": [ApplicationHub, "id__in"],
        }

        post_func_dc = {
            "DetailInstallHistory": [DetailInstallHistory, "service__in"],
            "Service": [Service, "id__in"],
            "ApplicationHub": [ApplicationHub, "id__in"],
        }

        def wrapper(*args, **kwargs):
            # ToDO此处需要增加校验,一般不考虑因为func都在自己函数哪
            if kwargs.get("data") is not None:
                return func(*args, **kwargs)
            # 此处不返回,查询直接向下执行,不做写校验。
            write = kwargs.get("write")
            filed = kwargs.get('filed')
            if filed:
                args[0].base_func(self.available, self.is_child, filed, write)

            db_info = None
            for db in field_ls:
                if func.__name__ in db:
                    db_info = post_func_dc[db[-1]] if write else get_func_dc[db[-1]]
            args[0].db._get_data(db_info[0], func.__name__, **{db_info[1]: args[0].name})

        return wrapper


class ChangeServiceArgsBase:
    def __init__(self, s_type, field, name, ids, char):
        self.s_type = s_type
        self.field = set(field)
        self.ids = set(ids)
        self.name = name if s_type == "get" else list(self.ids)
        self.char = char
        self.data = None
        self.db = BaseDB(s_type)

    @staticmethod
    def base_func(available, is_child, func_name, write):
        """
        装饰器调用了基类调用方法校验使用，仅用于写校验 此函数func是个列表
        之所以能拿一个是写只能穿一个
        """
        child_len = len(func_name.split("."))
        if write and not func_name.startswith("service_dependence"):
            if not available:
                raise ValidationError(f"当前字段不支持修改{func_name}")
            if is_child and child_len != 2:
                raise ValidationError(f"当前字段{func_name}非字符串字段，仅支持对子字段修改")
        if not write and not is_child and child_len != 1:
            raise ValidationError(f"当前字段{func_name}不支持子查询或修改")


class ChangeServiceArgs(ChangeServiceArgsBase):
    """
    s_type 类型
    filed  list 查看字段
    name 过滤条件
    过滤字段在 get_func_dc
    """

    def __init__(self, s_type, field, name, ids="", char=""):
        super().__init__(s_type, field, name, ids, char)

    def _common_install_args(self, install_args, **kwargs):
        child = kwargs.get("child")
        # 此处出现了bug需要修复
        install_ls = kwargs["data"] if kwargs.get("write") else {}
        for install_arg in install_args:
            if not child:
                install_ls[install_arg["key"]] = install_arg.get("default")
                continue
            if install_arg.get("key") in child:
                if kwargs.get("write"):
                    if child[0] in ["base_dir", "log_dir", "data_dir"]:
                        raise ValidationError(f"此字段{child[0]}仅可查看，不能被修改")
                    install_arg["default"] = self.char
                    return install_args
                install_ls[install_arg["key"]] = install_arg.get("default")
        return install_ls

    @AddField(is_child=True)
    def install_detail_args(self, **kwargs):
        """
        不具备添加逻辑,如果全匹配则返回
        返回key,v
        """
        install_args = kwargs["data"].get("install_args", [])
        data = self._common_install_args(install_args, **kwargs)
        if kwargs.get("write"):
            return kwargs["data"]
        return data

    @AddField(is_child=True)
    def app_install_args(self, **kwargs):
        kwargs["data"] = json.loads(kwargs["data"])
        data = self._common_install_args(kwargs["data"], **kwargs)
        if kwargs.get("write"):
            data = json.dumps(data, ensure_ascii=False)
        return data

    def _common_port(self, **kwargs):
        port_data = json.loads(kwargs["data"] or [])
        child = kwargs.get("child")
        port_ls = kwargs["data"] if kwargs.get("write") else {}
        for install_port in port_data:
            if not child:
                port_ls[install_port["key"]] = install_port.get("default")
                continue
            if install_port.get("key") in child:
                if kwargs.get("write"):
                    install_port["default"] = self.char
                    return json.dumps(port_data)
                port_ls[install_port["key"]] = install_port.get("default")
        return port_ls

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
        return self._common_port(**kwargs)

    @AddField(is_child=True)
    def app_port(self, **kwargs):
        app_ls = self._common_port(**kwargs)
        return app_ls

    @AddField(is_child=True)
    def service_controllers(self, **kwargs):
        child = kwargs.get("child")
        data = kwargs["data"] if isinstance(kwargs["data"], dict) else {}
        if kwargs.get("write"):
            if data.get(child[0]):
                data[child[0]] = self.char
            return data
        control_dc = {}
        for name, value in data.items():
            if name in child or not child:
                control_dc[name] = value
        return control_dc

    @AddField()
    def service_role(self, **kwargs):
        return kwargs["data"]

    @AddField()
    def service_status(self, **kwargs):
        if kwargs.get("write"):
            ser_status = {status[1]: status[0] for status in Service.SERVICE_STATUS_CHOICES}
            try:
                status_code = ser_status[self.char]
                return status_code
            except Exception as e:
                raise ValidationError(f"请输入正确的状态{ser_status.keys()}")
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
    def app_name(self, **kwargs):
        return kwargs["data"]

    @AddField(available=False)
    def app_version(self, **kwargs):
        return kwargs["data"]

    @staticmethod
    def operate_list(lst, action, app_name, *args):
        "service_dependence.add.nacos.cluster_name(instance_name)  char: instance_name"
        instance_type, char = "", None
        if args:
            instance_type, char = args[0], args[1]
        if action in ["del", "edit"]:
            lst = [
                item for item in lst if
                item["name"] != app_name or
                (action == "del" and item[instance_type] not in char)
            ]
        if action in ["add", "edit"]:
            other_dc = {"instance_name": None} if \
                instance_type == "cluster_name" else {"cluster_name": None}
            update_dc = {"name": app_name, instance_type: char[0]}
            update_dc.update(other_dc)
            lst.append(update_dc)
        return json.dumps(lst)

    @staticmethod
    def app_operate_list(lst, action, app_name, *args):
        """
        应用依赖添加，删除仅传app_name 修改添加修改
        """

        char = None
        if args:
            _, char = args[0], args[1]
        if action in ["del", "edit"]:
            # 去除不应该存在的服务
            lst = [
                item for item in lst if
                item["name"] != app_name
            ]
        if action in ["add", "edit"]:
            lst.append({"name": app_name, "version": char})
        return json.dumps(lst)

    @AddField()
    def service_dependence(self, **kwargs):
        """
        [
        {"name": "nacos", "cluster_name": null, "instance_name": "nacos-16-232"}，
        ]
        """
        data = json.loads(kwargs["data"])
        if kwargs.get("write"):
            child = list(self.field)[0].split('.')
            child.append(self.char)
            return self.operate_list(data, *child[1:])
        return data

    @AddField()
    def app_dependence(self, **kwargs):
        """
        [
        {"name": "nacos", "cluster_name": null, "instance_name": "nacos-16-232"}，
        ]
        """
        data = json.loads(kwargs["data"])
        data = data if data else []
        if kwargs.get("write"):
            child = list(self.field)[0].split('.')
            if child[1] == "del":
                self.char = [""]
            child.append(self.char[0])
            return self.app_operate_list(data, *child[1:])
        return data

    @AddField(available=False)
    def id(self, **kwargs):
        return kwargs["data"]

    def check_and_init(self):
        write = False if self.s_type == "get" else True
        for filed in self.field:
            func = filed.split(".")[0]
            if not hasattr(self, func):
                raise ValidationError(f"字段不存在{filed}:请确保输入字段的正确性")
            getattr(self, func)(write=write, filed=filed)

    @staticmethod
    def head_filed(db_field):
        """
        db_field ["a","b.x.c","c"]
        return:
        [{"name":"a",key:"a",type:"x"},
        {"name":"b.x",key:"b.x",type:"x"},
        {"name":"b.c",key:"b.c",type:"x"}
        {"name":"c",key:"c",type:"x"}
        ],
        {1:["x","c"]}(index)
        """
        head_name = {
            "install_detail_args": ["安装参数", "obj"],
            "app_install_args": ["安装参数", "obj"],
            "app_port": ["服务端口", "obj"],
            "app_dependence": ["服务依赖", "pkg_de"],
            "app_name": ["服务包名称", "str"],
            "app_version": ["服务包版本", "str"],
            "service_port": ["服务端口", "obj"],
            "service_controllers": ["脚本控制", "obj"],
            "service_role": ["服务角色", "str"],
            "service_status": ["数据库服务状态", "str"],
            "vip": ["虚ip", "str"],
            "deploy_mode": ["部署模式", "str"],
            "service_instance_name": ["实例名称", "str"],
            "ip": ["地址", "str"],
            "service_dependence": ["服务依赖", "de"],
            "id": ["id", "str"]
        }
        new_head = []
        new_index = []
        for index, field in enumerate(db_field):
            fields = field.split(".")
            head_info = head_name[fields[0]]
            if head_info[1] == "obj" and len(fields) >= 2:
                # new_index[index] = fields[1:]
                for child in fields[1:]:
                    new_head.append({
                        "name": f"{head_info[0]}-{child}",
                        "key": f"{fields[0]}.{child}",
                        "type": "str"
                    })
                    new_index.append(f"{fields[0]}.{child}")
            else:
                new_head.append({
                    "name": head_info[0],
                    "key": field,
                    "type": head_info[1]
                })
                new_index.append(field)
        return new_head, new_index

    @staticmethod
    def body_filed(body_field, field_index):
        """  ToDo需要dc
        body_field:[{"base_dir":"a"},"xxa"]
        field_index:{0:["base_dir","log_dir"]}
        两种格式转换
        1.{"base_dir":"a"} -> {"name":"base_dir","value":"b"}
        2.["base_dir","data_dir","log_dir"] {"base_dir":"A","log_dir":"b"} ->
        ["A","","b"]
        return:
        ["a","","xxa"]
        """
        # ToDo 需要dc
        new_body = {}
        pre_key = None
        body_index = -1
        for filed in field_index:
            filed_ls = filed.split(".")
            # 如果当前字段前置与之前不一样则 body的id就会前进一步
            if filed_ls[0] != pre_key:
                body_index += 1
            pre_key = filed_ls[0]
            body = body_field[body_index]
            if len(filed_ls) == 2:
                new_body[filed] = body_field[body_index].get(filed_ls[1], '')
            elif isinstance(body, dict):
                new_body[filed] = [{"name": k, "value": v} for k, v in body.items()]
            else:
                new_body[filed] = body
        return new_body

    def get_data(self):

        # ToDO对于异常字段处理
        default = {"app_port": [],
                   "app_install_args": [],
                   "install_detail_args": [],
                   "service_port": []}

        # [{"ip":"127.0.0.1","installargs"{}"}]
        # service
        # 真实库表的字段 service.a service.b
        data, db_field = self.db.merge()

        # 表头字段排序
        for n in self.field:
            n_field = n.split(".")[0]
            for index, db in enumerate(db_field):
                if n_field == db:
                    db_field[index] = n

        db_field.insert(0, "id")

        head, child_head_index = self.head_filed(db_field)
        body = []
        for line in data:
            for d_index, func_name in enumerate(db_field):
                func_ls = func_name.split(".")
                child = func_ls[1:] if len(func_ls) > 1 else []
                line[d_index] = getattr(self, func_ls[0])(data=line[d_index], child=child)
                if line[d_index] is None:
                    line[d_index] = default.get(func_ls[0])
            body.append(self.body_filed(line, child_head_index))
        return {"head": head, "body": body}

    def post_data(self):
        """
        dependence.add.nacos.cluster_name(instance_name) char: instance_name
        """
        func_ls = list(self.field)[0].split(".")
        need_get = ["service_status", "install_detail_args", "service_port",
                    "service_controllers", "service_dependence", "app_dependence", "app_port", "app_install_args"
                    ]
        multiple = False
        if func_ls[0] in need_get:
            multiple = True
            data = self.db.save(update=False)
            if not data:
                # 无该id查询的服务
                raise ValidationError("请勾选想要修改的服务实例")
            child = [func_ls[1]] if len(func_ls) == 2 else []
            post_data = []
            for i in data:
                one_conf = getattr(self, func_ls[0])(data=i[0], write=True, child=child)
                post_data.append(one_conf)
        else:
            post_data = self.char
        self.db.save(kwargs={func_ls[0]: post_data, "multiple": multiple})


# 先把field执行一次 ，校验
# 然后通过装饰器告诉要查的对象
# 然后通过merge分发给各个字段进行处理。如果是空可以理解就是无相关数据。直接返字段下未空即可

# 写入逻辑。首先不需要做合并，
# 先筛选出合适的obj。进行校验。（有些字段不可修改，修改的有的字段必须包含child，且child的len为1）
# 读取含有child的字段进行更新 。返回数据层进行更新

def get_background(res):
    current_time = int(datetime.now().strftime("%d%H%M"))
    redis_obj = RedisDB()
    flag, re = redis_obj.get(f"ser_conf_{current_time}")
    if flag:
        return re
    ip_port = []
    install_dc = {}
    for instance in res.get("body", []):
        for install_args in instance["install_detail_args"]:
            install_dc[install_args['name']] = install_args['value']
        ip_port.append("{0}:{1}".format(instance["ip"], install_dc.get('service_port', '')))
    install_dc.update({
        "ip_port": ",".join(ip_port)
    })
    redis_obj.set(f"ser_conf_{current_time}", install_dc, timeout=3600)
    return install_dc
