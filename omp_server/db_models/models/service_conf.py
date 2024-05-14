from django.db import models


class ServiceConfHistory(models.Model):
    DEPENDENCE = 2
    SER_CONF = 1
    CHANGE_T = (
        (SER_CONF, "配置"),
        (DEPENDENCE, "依赖")
    )
    instance_name = models.CharField("服务实例名称", max_length=128, default="", help_text="服务实例名称")
    create_time = models.DateTimeField("记录创建时间", null=True)
    change_type = models.IntegerField("修改类别", choices=CHANGE_T, default=SER_CONF)
    change_field = models.CharField("修改字段", max_length=128, default="", help_text="修改字段")
    change_value = models.CharField("修改值", max_length=512, default="", help_text="修改值")

    class Meta:
        db_table = "omp_service_conf_history"
        verbose_name = verbose_name_plural = "配置修改记录"
