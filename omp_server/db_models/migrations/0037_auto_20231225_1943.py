# Generated by Django 3.1.4 on 2023-12-25 19:43

import os
from django.conf import settings
from django.db import migrations, models
from uuid import uuid4
import hashlib
from tool.find_tools import find_tools_package
from db_models.models import UserProfile, Service
from db_models.receivers.execution_record import create_execution_record


def update_tool_logo(apps, schema_editor):
    ToolInfo = apps.get_model('db_models', 'ToolInfo')
    tools = ToolInfo.objects.all()
    for tool in tools:
        folder_path = os.path.join(
            settings.PROJECT_DIR, "package_hub", tool.tool_folder_path
        )
        if os.path.exists(os.path.join(folder_path, 'logo.svg')):
            tool.logo = os.path.join(tool.tool_folder_path, 'logo.svg')
            tool.save()
    find_tools_package()


def get_hash_value(expr, severity):
    data = expr + severity
    hash_data = hashlib.md5(data.encode(encoding='UTF-8')).hexdigest()
    return hash_data


def update_hash_data(apps, schema_editor):
    AlertRule = apps.get_model('db_models', 'AlertRule')
    alert_rulers = AlertRule.objects.all()
    for alert in alert_rulers:
        hash_data = get_hash_value(alert.expr, alert.severity)
        alert.hash_data = hash_data
        alert.save()


def update_execution_record(apps, schema_editor):
    main_install_history = apps.get_model('db_models', 'MainInstallHistory')
    upgrade_history = apps.get_model('db_models', 'UpgradeHistory')
    roll_back_history = apps.get_model('db_models', 'RollbackHistory')
    for model in [main_install_history, upgrade_history, roll_back_history]:
        histories = model.objects.all()
        for history in histories:
            create_execution_record(history)


def create_default_user(apps, schema_editor):
    """
    创建基础用户
    :return:
    """
    username = "admin"
    password = "Yunweiguanli@OMP_123"
    if UserProfile.objects.filter(username=username).count() != 0:
        UserProfile.objects.filter(username=username).update(role="SuperUser")
    else:
        UserProfile.objects.create_superuser(
            username=username,
            password=password,
            email="omp@cloudwise.com",
            role="SuperUser"
        )
    read_only_username = "omp"
    read_only_password = "Yunweiguanli@OMP_123"
    if UserProfile.objects.filter(username=read_only_username).count() != 0:
        return
    UserProfile.objects.create_user(
        username=read_only_username,
        password=read_only_password,
        email="omp@cloudwise.com",
        role="ReadOnlyUser"
    )


def combine_names(apps, schema_editor):
    for service in Service.objects.all():
        if service.service.app_name == "hadoop" and service.service_split == 0:
            if service.service_instance_name.startswith("hadoop"):
                service.service_split = 1
            else:
                service.service_split = 2
            service.save()


class Migration(migrations.Migration):
    dependencies = [
        ('db_models', '0036_auto_20231115_0959'),
    ]

    operations = [
        migrations.AlterField(
            model_name='backupcustom',
            name='notes',
            field=models.CharField(default='', max_length=64, verbose_name='备注'),
        ),
        migrations.AlterField(
            model_name='grafanamainpage',
            name='instance_url',
            field=models.CharField(help_text='实例文根地址', max_length=255, verbose_name='实例地址'),
        ),
        migrations.RunPython(update_tool_logo),
        migrations.RunPython(update_hash_data),
        migrations.RunPython(update_execution_record),
        migrations.RunPython(create_default_user),
        migrations.RunPython(combine_names)
    ]