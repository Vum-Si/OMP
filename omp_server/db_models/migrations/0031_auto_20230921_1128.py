# Generated by Django 3.1.4 on 2022-11-22 11:25

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('db_models', '0030_auto_20230711_1739'),
    ]

    operations = [
        migrations.CreateModel(
            name='BackupCustom',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('field_k', models.CharField(max_length=64, verbose_name='自定义字段k')),
                ('field_v', models.CharField(max_length=256, verbose_name='自定义字段v')),
                ('notes', models.CharField(max_length=32, verbose_name='备注')),
            ],
            options={
                'verbose_name': '自定义备份',
                'verbose_name_plural': '自定义备份',
                'db_table': 'omp_backup_custom',
            },
        ),
        migrations.RemoveField(
            model_name='backuphistory',
            name='email_fail_reason',
        ),
        migrations.RemoveField(
            model_name='backuphistory',
            name='env_id',
        ),
        migrations.RemoveField(
            model_name='backuphistory',
            name='operation',
        ),
        migrations.RemoveField(
            model_name='backuphistory',
            name='send_email_result',
        ),
        migrations.RemoveField(
            model_name='backupsetting',
            name='env_id',
        ),
        migrations.AddField(
            model_name='backuphistory',
            name='extend_field',
            field=models.JSONField(default=dict, verbose_name='冗余字段'),
        ),
        migrations.AddField(
            model_name='backuphistory',
            name='remote_path',
            field=models.CharField(blank=True, max_length=256, null=True, verbose_name='远端备份路径'),
        ),
        migrations.AlterField(
            model_name='backuphistory',
            name='content',
            field=models.CharField(default='', max_length=256, verbose_name='备份实例'),
        ),
        migrations.AlterField(
            model_name='backuphistory',
            name='message',
            field=models.TextField(default='', max_length=512, verbose_name='返回信息'),
        ),
        migrations.AlterField(
            model_name='backuphistory',
            name='result',
            field=models.IntegerField(choices=[(1, '成功'), (2, '备份中'), (0, '失败')], default=2, verbose_name='结果'),
        ),
        migrations.AlterField(
            model_name='backuphistory',
            name='retain_path',
            field=models.TextField(default='/data/omp/data/backup/', max_length=256, verbose_name='文件保存路径'),
        ),
        migrations.AlterField(
            model_name='backupsetting',
            name='retain_path',
            field=models.CharField(default='/data/omp/data/backup/', max_length=256, verbose_name='文件保存路径'),
        ),
        migrations.AddField(
            model_name='backupsetting',
            name='backup_custom',
            field=models.ManyToManyField(to='db_models.BackupCustom'),
        ),
    ]
