# Create your views here.
from django.shortcuts import get_object_or_404
import datetime
from django_filters.rest_framework.backends import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.generics import ListAPIView, CreateAPIView
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import RetrieveModelMixin, \
    ListModelMixin, UpdateModelMixin, CreateModelMixin
from db_models.models import (
    ToolExecuteMainHistory, ToolInfo,
    Host, Service,
    ToolExecuteDetailHistory)
from tool.tool_filters import ToolFilter, ToolInfoKindFilter
from tool.serializers import ToolListSerializer, ToolInfoDetailSerializer, \
    ToolTargetObjectServiceSerializer, ToolFormAnswerSerializer, \
    ToolExecuteHistoryListSerializer, TestTaskSerializer, \
    TestResultSerializer
from rest_framework.response import Response
from utils.common.paginations import PageNumberPager
from tool.serializers import ToolDetailSerializer, ToolFormDetailSerializer, \
    ToolTargetObjectHostSerializer, TestTaskHostSerializer
from tool.tasks import get_task
from rest_framework.exceptions import ValidationError


class ToolRetrieveAPIMixin:

    def load_tool_obj(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        tool = get_object_or_404(
            ToolInfo.objects.all(),
            **{self.lookup_field: self.kwargs[lookup_url_kwarg]}
        )
        self.kwargs.update(tool=tool)
        return tool


class GetToolDetailView(GenericViewSet, RetrieveModelMixin):
    """
    任务详情页
    """
    queryset = ToolExecuteMainHistory.objects.all()
    get_description = "任务详情页"
    serializer_class = ToolDetailSerializer


class ToolFormDetailAPIView(GenericViewSet, RetrieveModelMixin):
    """
        read:
        小工具执行表单页
    """
    queryset = ToolInfo.objects.all()
    get_description = "小工具执行表单页"
    serializer_class = ToolFormDetailSerializer


class ToolListView(GenericViewSet, ListModelMixin):
    """查询所有实用工具列表"""
    queryset = ToolInfo.objects.all().order_by("-created")
    serializer_class = ToolListSerializer
    pagination_class = PageNumberPager
    # 过滤排序字段
    filter_backends = (DjangoFilterBackend,)
    filter_class = ToolFilter
    # 操作信息描述
    get_description = "查询所有实用工具列表"


class ToolDetailView(GenericViewSet, RetrieveModelMixin):
    """获取实用工具详情"""
    queryset = ToolInfo.objects.all().order_by("-created")
    serializer_class = ToolInfoDetailSerializer
    # 操作描述信息
    get_description = "获取实用工具详情"


class ToolTargetObjectAPIView(ListAPIView, ToolRetrieveAPIMixin):
    get_description = "小工具执行对象展示页"
    pagination_class = PageNumberPager

    def get(self, request, *args, **kwargs):
        """ 小工具执行对象展示页 """
        self.load_tool_obj()
        return self.list(request, *args, **kwargs)

    def get_queryset(self):
        if self.kwargs["tool"].target_name == "host":
            return Host.objects.all()
        return Service.objects.filter(
            service__app_name=self.kwargs["tool"].target_name
        )

    def get_serializer_class(self):
        if self.kwargs["tool"].target_name == "host":
            return ToolTargetObjectHostSerializer
        return ToolTargetObjectServiceSerializer


class ToolFormAnswerAPIView(CreateAPIView, ToolRetrieveAPIMixin):
    get_description = "小工具执行表单页"
    serializer_class = ToolFormAnswerSerializer

    def post(self, request, *args, **kwargs):
        """ 小工具执行表单页 """
        self.load_tool_obj()
        return self.create(request, *args, **kwargs)


class ToolExecuteHistoryListApiView(ListAPIView):
    """
        list:
        小工具执行列表页
    """
    get_description = "小工具执行列表页"
    pagination_class = PageNumberPager
    serializer_class = ToolExecuteHistoryListSerializer
    queryset = ToolExecuteMainHistory.objects.all().select_related("tool")
    filter_backends = (SearchFilter, OrderingFilter, ToolInfoKindFilter)
    search_fields = ("task_name",)
    ordering_fields = ("start_time",)
    ordering = ('-start_time',)


class GetAttr:
    @staticmethod
    def get_type_value(t, args):
        v = args.get('default')
        k = args.get('key')
        if t in ["select", "checkbox"]:
            return {k: v.split(",")}
        return {k: v}

    @staticmethod
    def get_type(attr_ls):
        t = attr_ls[0]
        # 没有类型默认str
        if not t:
            return "str"
        # 有非cluster类别返回cluster
        if t != "cluster":
            return t
        # 有cluster顺位候补1位 如果没有默认str
        else:
            return attr_ls[1] if len(attr_ls) > 1 else "str"

    @staticmethod
    def get_attr(ips=None):
        ser_objs = Service.objects.filter(service__app_name="AutoTest")
        if ips:
            new_ser_objs = ser_objs.filter(ip__in=ips)
        else:
            if not ser_objs.first():
                raise ValidationError("请先安装AutoTest测试包再进行测试任务")
            new_ser_objs = [ser_objs.first()]
        body_ls = []
        for ser_obj in new_ser_objs:
            install_args = ser_obj.detailinstallhistory_set.first().install_detail_args
            body_dc = {}
            head_ls = []
            for args in install_args.get("install_args", []):
                # 取消 instance_name
                if args.get("key") == "instance_name" or args.get("key").endswith("port"):
                    continue
                # 获取type类型
                attr_ls = args.get("attr", "").split(",")
                t = GetAttr.get_type(attr_ls)
                # 第一页获取全局变量 ,第二次获取单个变量的
                if ("cluster" in attr_ls and not ips) or ("cluster" not in attr_ls and ips):
                    head_ls.append({
                        "name": args.get("name"),
                        "key": args.get("key"),
                        "type": t
                    }
                    )
                    body_dc.update(GetAttr.get_type_value(t, args))
            if body_dc:
                if ips:
                    body_dc.update({"ip": ser_obj.ip})
                body_ls.append(body_dc)
        if not ips:
            ips = ser_objs.values_list("ip", flat=True)
        return head_ls, body_ls, ips


class TestTaskView(ListAPIView, CreateAPIView):
    get_description = "查询可执行自动化任务列表"
    post_description = "自动化测试任务"
    serializer_class = TestTaskSerializer

    def get(self, request, *args, **kwargs):
        """ 查询可执行自动化任务列表 """
        # 定制化安装参数属性 disabled 不可编辑 cluster 集群配置 select 队列单选 checkbox 队列多选
        head_ls, body_ls, ips = GetAttr.get_attr()
        if head_ls:
            head_ls.append({
                "name": "ip地址列表",
                "key": "ips",
                "type": "checkbox"
            })
            body_ls[0].update({
                "ips": ips
            })
        return Response({"head": head_ls, "body": body_ls})

    def create(self, request, *args, **kwargs):
        """ 自动化测试任务 """
        res = super(TestTaskView, self).create(
            request, *args, **kwargs)
        return Response(res.data.get("h_id"))


class TestTaskHostView(GenericViewSet, CreateModelMixin):
    """
        create:
        自动化测试任务
    """
    post_description = "自动化测试任务"
    serializer_class = TestTaskHostSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.data.get("body", [])[0]
        ips = data.get('ips')
        if not ips:
            raise ValueError(f"请输入ip列表")
        head_ls, body_ls, ips = GetAttr.get_attr(ips=ips)
        if head_ls:
            head_ls.append({
                "name": "ip地址",
                "key": "ip",
                "type": "str"
            })
        # 写redis
        return Response({"head": head_ls, "body": body_ls})


class GetTaskUrlView(GenericViewSet, CreateModelMixin):
    """
        create:
        获取自动化测试任务目标URL
    """
    post_description = "自动化测试任务"

    def create(self, request, *args, **kwargs):
        ip = request.data.get("ip")
        auto_obj = Service.objects.filter(service__app_name="AutoTest", ip=ip).first()
        if not auto_obj:
            raise ValidationError("未安装AutoTest，无法查看url")
        install_args = auto_obj.get_install_args
        get_task.delay(auto_obj.ip, install_args.get("base_dir"))
        return Response(
            f"http://{auto_obj.ip}:{install_args.get('jetty_port')}/reportInfo/all_AutoTest_Api_Report.html")


class TestResultView(GenericViewSet, UpdateModelMixin):
    """
        update:
        修改自动化测试任务状态

        partial_update:
        修改自动化测试任务状态的一个或多个字段
    """
    queryset = ToolExecuteDetailHistory.objects.all()
    post_description = "修改自动化测试任务状态"
    serializer_class = TestResultSerializer
    # 关闭权限、认证设置
    authentication_classes = ()
    permission_classes = ()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        execute_log = request.data.get("execute_log", "")
        request.data["execute_log"] = \
            instance.execute_log + "\n{1} {0} ".format(
                execute_log, datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        if int(request.data.get("status", 3)) == ToolExecuteDetailHistory.STATUS_SUCCESS:
            res_count = ToolExecuteDetailHistory.objects.filter(
                main_history=instance.main_history).exclude(
                status=ToolExecuteDetailHistory.STATUS_SUCCESS
            ).count()
            if res_count <= 1:
                instance.main_history.status = ToolExecuteMainHistory.STATUS_SUCCESS
                instance.main_history.save()

        self.perform_update(serializer)

        return Response("修改成功")
