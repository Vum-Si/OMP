import os
import sys
import json
import django
import argparse

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
PACKAGE_DIR = os.path.join(PROJECT_DIR, "package_hub")
PYTHON_PATH = os.path.join(PROJECT_DIR, 'component/env/bin/python3')
sys.path.append(os.path.join(PROJECT_DIR, 'omp_server'))

# 加载django环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omp_server.settings")
django.setup()


def parameters():
    """
    传递参数
    :return: 脚本接收到的参数
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", "-app", default="mysql", help="要修改的服务")
    parser.add_argument("--target_app", "-target_app", default="dameng", help="目标服务")
    parser.add_argument("--version", "-version", help="要修改的版本")
    parser.add_argument("--target_version", "-target_version", help="目标版本")
    param = parser.parse_args()
    return param


if __name__ == '__main__':
    from db_models.models import ApplicationHub

    param = parameters()
    app_dc = {
        "app_name": param.app,
    }
    if param.target_version:
        app_dc.update({
            "app_version": param.version
        })

    app_obj = ApplicationHub.objects.filter(**app_dc).first()
    tar_dc = {
        "app_name": param.target_app,
    }
    if param.target_version:
        tar_dc.update({
            "app_version": param.target_version
        })
    tar_obj = ApplicationHub.objects.filter(**tar_dc).first()
    if not app_obj or not tar_obj:
        print(f"不存在应用{param.app},{param.version}或{param.target_app},{param.target_version}")
        sys.exit(1)
    app_name, app_version, \
    target_name, target_version = \
        app_obj.app_name, app_obj.app_version, \
        tar_obj.app_name, tar_obj.app_version
    for obj in ApplicationHub.objects.all():
        if not obj.app_dependence:
            continue
        dependence_list = json.loads(obj.app_dependence)
        change = False
        for i in dependence_list:
            if i.get("name") == app_name and app_version.startswith(i.get("version", "")):
                i["name"] = target_name
                i["version"] = target_version
                change = True
        if change:
            obj.app_dependence = json.dumps(dependence_list)
            obj.save()
