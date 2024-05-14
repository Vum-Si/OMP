from rest_framework.permissions import BasePermission
from utils.plugin.crypto import rsa_utils
from utils.parse_config import OMP_MYSQL_PASSWORD


class HostPermission(BasePermission):
    def has_permission(self, request, view):
        plain_text = request.data.pop("plain_text", "")
        if not plain_text:
            return bool(request.user and request.user.is_authenticated)
        pass_str = rsa_utils(plain_text, action="private")
        if pass_str == OMP_MYSQL_PASSWORD:
            return True
        return False
