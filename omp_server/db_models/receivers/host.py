from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver

from db_models.models import Host
from utils.plugin.crontab_utils import change_task


@receiver(pre_delete, sender=Host)
def delete_host_cron(sender, instance, *args, **kwargs):
    data = {
        "is_on": False,
        "task_func": "services.tasks.log_clear_exec",
        "task_name": f"service_log_cron_task_{instance.id}"
    }
    change_task(instance.id, data=data)


@receiver(post_save, sender=Host)
def update_host_cron(sender, instance, *args, **kwargs):
    data = {
        "crontab_detail": instance.crontab_detail,
        "is_on": True,
        "task_func": "services.tasks.log_clear_exec",
        "task_name": f"service_log_cron_task_{instance.id}"
    }

    change_task(instance.id, data=data)
