# Generated by Django 3.1.4 on 2022-03-04 20:01

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('db_models', '0027_merge_20220304_2000'),
    ]

    operations = [
        migrations.AddField(
            model_name='upgradehistory',
            name='pre_upgrade_result',
            field=models.JSONField(default=dict, verbose_name='升级前置信息'),
        ),
        migrations.AddField(
            model_name='upgradehistory',
            name='pre_upgrade_state',
            field=models.IntegerField(choices=[(0, '等待升级'), (1, '正在升级'), (2, '升级成功'), (3, '升级失败')], default=0,
                                      verbose_name='升级前置结果'),
        ),
    ]