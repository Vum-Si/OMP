from rest_framework.filters import BaseFilterBackend
from utils.common.exceptions import OperateError
import logging

logger = logging.getLogger('server')


class BulkDeleteFilter(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        if request.method == "DELETE":
            ids = request.data.get("id")
            if not ids or not isinstance(ids, list):
                raise OperateError("请输入删除id")
            queryset = queryset.filter(id__in=ids)
            if queryset.count() != len(ids):
                raise OperateError("该id不存在数据库中")
        return queryset
