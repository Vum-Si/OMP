import json
from db_models.models import ApplicationHub, ProductHub
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver


@receiver(pre_delete, sender=ApplicationHub)
def del_change_pro_service(sender, instance, *args, **kwargs):
    if not instance.product:
        return
    pro_ser = json.loads(instance.product.pro_services)

    new_pro_ser = []
    name_ls = []

    for ser in pro_ser:
        if ser.get("name") in name_ls:
            continue
        name_ls.append(ser.get("name"))
        if ser.get("name") == instance.app_name and \
                ser.get("version") == instance.app_version:
            ser_version_set = set(
                ApplicationHub.objects.filter(
                    app_name=instance.app_name).values_list(
                    "app_version", flat=True)
            )
            compare_version = ser_version_set - {instance.app_version}
            if compare_version:
                ser["version"] = list(compare_version)[0]
                new_pro_ser.append(ser)
        else:
            new_pro_ser.append(ser)
    instance.product.pro_services = json.dumps(new_pro_ser)
    instance.product.save()


@receiver(post_save, sender=ApplicationHub)
def add_change_pro_service(sender, instance, *args, **kwargs):
    if not instance.product:
        return
    pro_ser = json.loads(instance.product.pro_services)
    append_ser = True
    for ser in pro_ser:
        if ser.get("name") == instance.app_name:
            ser["version"] = instance.app_version
            append_ser = False
    if append_ser:
        pro_ser.append({"name": instance.app_name, "version": instance.app_version})
    instance.product.pro_services = json.dumps(pro_ser)
    instance.product.save()
