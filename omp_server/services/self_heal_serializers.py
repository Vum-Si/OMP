import logging

from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, Serializer
from db_models.models import SelfHealingSetting, SelfHealingHistory
from rest_framework_bulk import BulkSerializerMixin, BulkListSerializer
from rest_framework.exceptions import ValidationError

logger = logging.getLogger("server")


class SelfHealingSettingSerializer(BulkSerializerMixin, ModelSerializer):
    class Meta:
        model = SelfHealingSetting
        fields = "__all__"
        list_serializer_class = BulkListSerializer

    def validate(self, attrs):
        repair_instance = attrs.get("repair_instance", [])
        request = self.context.get('request')
        repair_objs = SelfHealingSetting.objects.all()
        if request.method in ['PUT', 'PATCH']:
            ignore_id = request.path.split("/")[-2]
            repair_ls = repair_objs.exclude(id=ignore_id).values_list("repair_instance", flat=True)
        else:
            repair_ls = repair_objs.values_list("repair_instance", flat=True)
        repairs = []
        for _ in repair_ls:
            repairs.extend(_)
        repeat = set(repairs) & set(repair_instance)
        if repeat:
            raise ValidationError(f"服务不可重复{repeat}")
        return attrs


class ListSelfHealingHistorySerializer(ModelSerializer):
    class Meta:
        model = SelfHealingHistory
        fields = "__all__"


class UpdateSelfHealingHistorySerializer(Serializer):
    """自愈历史记录批量更新"""
    ids = serializers.ListField(help_text="自愈历史记录ID列表", required=True, error_messages={"required": "必须包含ID列表字段"})
    is_read = serializers.IntegerField(help_text="是否已读", required=True, error_messages={"required": "必须包含是否已读字段"})

    def create(self, validated_data):
        SelfHealingHistory.objects.filter(id__in=validated_data.get("ids")).update(
            is_read=validated_data.get("is_read"))
        return validated_data
