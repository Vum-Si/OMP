# -*- coding:utf-8 -*-
# Project: urls
# Create time: 2022/2/10 6:23 下午
from django.urls import path
from rest_framework.routers import DefaultRouter
from tool.views import ToolListView, ToolDetailView, GetToolDetailView, \
    ToolFormDetailAPIView, ToolTargetObjectAPIView, ToolFormAnswerAPIView, \
    ToolExecuteHistoryListApiView, TestTaskView, TestTaskHostView, TestResultView, \
    GetTaskUrlView

router = DefaultRouter()
router.register("toolList", ToolListView, basename="toolList")
router.register("toolList", ToolDetailView, basename="toolList")
router.register(r'result', GetToolDetailView, basename="result")
router.register(r'form', ToolFormDetailAPIView, basename="form")
router.register(r'test-result', TestResultView, basename="test-result")
router.register(r'test-task-host', TestTaskHostView, basename="test-task-host")
router.register(r'test-url', GetTaskUrlView, basename="test-url")

urlpatterns = [
    path(
        'form/<int:pk>/target-object',
        ToolTargetObjectAPIView.as_view(),
        name="target-object"
    ),
    path(
        'form/<int:pk>/answer',
        ToolFormAnswerAPIView.as_view(),
        name="answer"
    ),
    path(
        'execute-history',
        ToolExecuteHistoryListApiView.as_view(),
        name="execute-history"
    ),
    path(
        'test-task',
        TestTaskView.as_view(),
        name="test-task"
    ),
]

urlpatterns += router.urls
