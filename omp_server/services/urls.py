from django.urls import path
from rest_framework.routers import DefaultRouter

from services.views import (
    ServiceListView, ServiceDetailView,
    ServiceActionView, ServiceDeleteView,
    ServiceStatusView, ServiceDataJsonView,
    AppListView, AppConfCheckView,
    LogRuleCollectView, LogClearRuleView,
    HostCronView,GetSerUrlView
)
from services.self_heal_view import (
    SelfHealingSettingView, ListSelfHealingHistoryView,
    UpdateSelfHealingHistoryView
)

router = DefaultRouter()
router.register("services", ServiceListView, basename="services")
router.register("services", ServiceDetailView, basename="services")
router.register("action", ServiceActionView, basename="action")
router.register("delete", ServiceDeleteView, basename="delete")
# 自愈
router.register("SelfHealingSetting", SelfHealingSettingView,
                basename="SelfHealingSetting")
router.register("ListSelfHealingHistory",
                ListSelfHealingHistoryView, basename="ListSelfHealingHistory")
router.register("UpdateSelfHealingHistory",
                UpdateSelfHealingHistoryView,
                basename="UpdateSelfHealingHistory")

router.register("serviceStatus", ServiceStatusView, basename="serviceStatus")

# Accept_manager 纳管
router.register("appList", AppListView, basename="appList")
router.register("appConfCheck", AppConfCheckView, basename="appConfCheck")

# log_clear_rule 服务日志清理
router.register("logRuleCollect", LogRuleCollectView, basename="logRuleCollect")
router.register("logClearRule", LogClearRuleView, basename="logClearRule")
router.register("hostCron", HostCronView, basename="hostCron")
router.register("getSerUrl", GetSerUrlView, basename="getSerUrl")

urlpatterns = [
    path('data_json', ServiceDataJsonView.as_view(), name="serviceDataJson")
]

urlpatterns += router.urls
