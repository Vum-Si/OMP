from django.urls import path
from rest_framework.routers import DefaultRouter
from service_conf.views import GetConfInfoView, PostConfInfoView, GetAndCheckView,ChangeConfView,PostRsaView

router = DefaultRouter()
router.register("get_conf", GetConfInfoView, basename="get_conf")
router.register("post_conf", PostConfInfoView, basename="post_conf")
router.register("change_conf", ChangeConfView, basename="change_conf")
router.register("get_dependence", GetAndCheckView, basename="get_dependence")
router.register("post_rsa", PostRsaView, basename="post_rsa")
