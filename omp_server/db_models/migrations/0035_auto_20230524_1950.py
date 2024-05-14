# -*- coding:utf-8 -*-
# Project: 0035_auto_20230524_1950
# Create time: 2023/5/25 下午4:09
# Generated by Django 3.1.4 on 2023-05-24 19:50

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('db_models', '0034_auto_20230510_1653'),
    ]

    operations = [
        migrations.CreateModel(
            name='ServiceLogLevel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True, help_text='创建时间', null=True, verbose_name='创建时间')),
                ('modified', models.DateTimeField(auto_now=True, help_text='更新时间', null=True, verbose_name='更新时间')),
                ('used', models.BooleanField(default=False, verbose_name='是否启用日志等级复原')),
                ('time_interval', models.IntegerField(default=30, verbose_name='更新日志后复原超时时间间隔')),
                ('raw_log_level_str',
                 models.CharField(blank=True, max_length=512, null=True, verbose_name='服务实例原来的日志等级字符串')),
                ('new_log_level_str',
                 models.CharField(blank=True, max_length=512, null=True, verbose_name='服务实例更新后的日志等级字符串')),
                ('service', models.ForeignKey(blank=True, help_text='关联服务实例', null=True,
                                              on_delete=django.db.models.deletion.SET_NULL, to='db_models.service')),
            ],
            options={
                'verbose_name': '服务日志更新设置',
                'verbose_name_plural': '服务日志更新设置',
                'db_table': 'omp_service_log_level',
            },
        ),
        migrations.CreateModel(
            name='ServiceConfHistory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('instance_name',
                 models.CharField(default='', help_text='服务实例名称', max_length=128, verbose_name='服务实例名称')),
                ('create_time', models.DateTimeField(null=True, verbose_name='记录创建时间')),
                ('change_type', models.IntegerField(choices=[(1, '配置'), (2, '依赖')], default=1, verbose_name='修改类别')),
                ('change_field', models.CharField(default='', help_text='修改字段', max_length=128, verbose_name='修改字段')),
                ('change_value', models.CharField(default='', help_text='修改值', max_length=128, verbose_name='修改值')),
            ],
            options={
                'verbose_name': '配置修改记录',
                'verbose_name_plural': '配置修改记录',
                'db_table': 'omp_service_conf_history',
            },
        ),
    ]
