# Generated by Django 3.1.4 on 2022-03-03 13:28

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('db_models', '0025_alertrule_forbidden'),
    ]

    operations = [
        migrations.AddField(
            model_name='alertrule',
            name='hash_data',
            field=models.CharField(null=True, blank=True, unique=True, verbose_name='唯一hash值', max_length=255),
        ),
    ]