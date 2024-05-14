from django.db.models.signals import pre_delete, post_delete, post_save
from django.dispatch import receiver

from db_models.mixins import UpgradeStateChoices, RollbackStateChoices
from db_models.models import Service, MainInstallHistory, \
    ExecutionRecord, UpgradeHistory, RollbackHistory, UpgradeDetail, \
    RollbackDetail, DetailInstallHistory, ServiceHistory, Host, \
    ClusterInfo, Product, SelfHealingSetting, SelfHealingHistory
from utils.plugin.crontab_utils import change_task


def update_upgrade_history(history, union_server):
    UpgradeDetail.objects.filter(
        union_server=union_server).delete()
    details = history.upgradedetail_set.exclude(
        upgrade_state=UpgradeStateChoices.UPGRADE_SUCCESS
    ).exclude(union_server=union_server)
    if not details.exists():
        history.upgrade_state = UpgradeStateChoices.UPGRADE_SUCCESS
        history.save()


def update_rollback_history(history, union_server):
    RollbackDetail.objects.filter(
        upgrade__union_server=union_server).delete()
    details = history.rollbackdetail_set.exclude(
        rollback_state=RollbackStateChoices.ROLLBACK_SUCCESS
    ).exclude(upgrade__union_server=union_server)
    if not details.exists():
        history.rollback_state = RollbackStateChoices.ROLLBACK_SUCCESS
        history.save()


@receiver(pre_delete, sender=Service)
def update_execution_record(sender, instance, *args, **kwargs):
    # models.SET_NULL必须改！
    filter_keys = [
        (MainInstallHistory, "detailinstallhistory__service"),
        (RollbackHistory, "rollbackdetail__upgrade__service"),
        (UpgradeHistory, "upgradedetail__service"),
    ]
    if instance.service.app_name == "hadoop" and instance.service_split == 2:
        Service.split_objects.filter(
            ip=instance.ip,
            service__app_name="hadoop"
        ).delete()
    union_server = f"{instance.ip}-{instance.service.app_name}"
    for model_cls, filter_key in filter_keys:
        history = model_cls.objects.filter(**{filter_key: instance}).first()
        if not history:
            continue
        execution_record = ExecutionRecord.objects.filter(
            module=history.__class__.__name__,
            module_id=history.module_id
        ).first()
        if not execution_record:
            continue
        execution_record.count = history.operate_count([instance.id])
        execution_record.save()
        if model_cls.__name__ == "RollbackHistory" and \
                history.rollback_state != RollbackStateChoices.ROLLBACK_SUCCESS:
            update_rollback_history(history, union_server)
        if model_cls.__name__ == "UpgradeHistory" and \
                history.upgrade_state != UpgradeStateChoices.UPGRADE_SUCCESS:
            update_upgrade_history(history, union_server)
    # 删除安装记录, 修复卸载产品再重试安装
    DetailInstallHistory.objects.filter(service=instance).delete()
    service_history_obj = ServiceHistory.objects.filter(
        service=instance)
    if len(service_history_obj) != 0:
        service_history_obj.delete()


@receiver(post_delete, sender=Service)
def update_service_cluster(sender, instance, *args, **kwargs):
    count = Service.objects.filter(ip=instance.ip).count()
    Host.objects.filter(ip=instance.ip).update(
        service_num=count)
    # 当服务被删除时，应该将其所在的集群都连带删除
    # ToDo 并发删除时报错
    try:
        if instance.cluster and Service.objects.filter(
                cluster=instance.cluster
        ).count() == 0:
            ClusterInfo.objects.filter(
                id=instance.cluster.id
            ).delete()
        # 当服务被删除时，如果他所属的产品下已没有其他服务，那么应该删除产品实例
        if Service.objects.filter(
                service__product=instance.service.product
        ).count() == 0:
            Product.objects.filter(
                product=instance.service.product
            ).delete()
    except Exception as e:
        return


@receiver(post_save, sender=SelfHealingSetting)
def update_self_health(sender, instance, *args, **kwargs):
    data = {'is_on': instance.used,
            'task_func': 'services.self_healing.self_healing',
            'task_name': f'self_health_cron_task_{instance.id}',
            'crontab_detail': dict(day_of_month='*', day_of_week='*', hour="*", minute=f"*/{instance.fresh_rate}",
                                   month_of_year='*')}

    change_task(instance.id, data=data)


@receiver(pre_delete, sender=SelfHealingSetting)
def delete_self_health(sender, instance, *args, **kwargs):
    data = {
        "is_on": False,
        'task_func': 'services.self_healing.self_healing',
        'task_name': f'self_health_cron_task_{instance.id}',
    }
    change_task(instance.id, data=data)


@receiver(post_save, sender=SelfHealingHistory)
def update_service_status(sender, instance, *args, **kwargs):
    ser_obj = Service.objects.filter(service_instance_name=instance.instance_name).first()
    if not ser_obj:
        return
    ser_obj.service_status = Service.SERVICE_STATUS_NORMAL if \
        instance.state == SelfHealingHistory.HEALING_SUCCESS else Service.SERVICE_STATUS_STOP
    ser_obj.save()
