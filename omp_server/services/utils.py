from utils.parse_config import BASIC_ORDER
from app_store.new_install_utils import RedisDB
import json


def get_all_apps(queryset, need_id=False):
    """
    获取纳管应用列表 和应用编辑列表
    """
    app_dc = {}
    app_ls = []
    app_id_n_v_dc = {}
    app_de_n_v_dc = {}

    for query in queryset:
        app_dependence = [] if not query.app_dependence else query.app_dependence
        if query.pro_info:
            pro_name = query.pro_info["pro_name"]
            pro_version = query.pro_info["pro_version"]
            app_dc.setdefault(pro_name, {})
            app_dc[pro_name].setdefault("version", [])
            if pro_version not in app_dc[pro_name]["version"]:
                app_dc[pro_name]["version"].append(pro_version)
            app_dc[pro_name].setdefault("child", {})
            app_dc[pro_name]["child"].setdefault(pro_version, []).append(
                {"name": query.app_name, "version": query.app_version})
        else:
            app_dc.setdefault(query.app_name, {})
            app_dc[query.app_name].setdefault(
                "version", []).append(query.app_version)
        if need_id:
            app_id_n_v_dc[f"{query.app_name}-{query.app_version}"] = query.id
            app_de_n_v_dc[f"{query.app_name}-{query.app_version}"] = json.loads(app_dependence)
    if need_id:
        redis_obj = RedisDB()
        redis_obj.set(f"app_id_n_v_dc", app_id_n_v_dc)
        redis_obj.set(f"app_de_n_v_dc", app_de_n_v_dc)

    basic_ls = [list() for _ in range(len(BASIC_ORDER))]
    pro_ls = []
    for name, info in app_dc.items():
        tmp_dc = {
            "name": name,
            "version": info["version"]
        }
        if info.get("child"):
            tmp_dc.update({"child": info.get("child")})
            pro_ls.append(tmp_dc)
        else:
            for index, name_ls in BASIC_ORDER.items():
                if name in name_ls:
                    basic_ls[index].append(tmp_dc)
    for i in basic_ls:
        app_ls.extend(i)
    app_ls.extend(pro_ls)
    return app_ls


def check_repeat(app_data):
    """
    查询重复,含
    """
    for info in app_data:
        if len(info.get("version", [])) != 1:
            info.setdefault("error", f"{info.get('name')}不允许纳管不同版本")
            return True
        if info.get("child"):
            app_names = []
            for app_info in list(info["child"].values())[0]:
                app_name = app_info.get("name")
                if app_name not in app_names:
                    app_names.append(app_name)
                else:
                    info.setdefault(
                        "error", f"{info.get('name')}产品下{app_name}服务只允许选其中一个")
                    return True
