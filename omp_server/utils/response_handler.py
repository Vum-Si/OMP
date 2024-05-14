# -*- coding: utf-8 -*-
# Project: response_handler
# Author: jon.liu@yunzhihui.com
# Create time: 2021-09-10 21:36
# IDE: PyCharm
# Version: 1.0
# Introduction:

"""
重新封装的响应数据类
"""

from rest_framework.renderers import JSONRenderer

CODE_MESSAGE = {
    "400": "错误请求",
    "401": "未认证",
    "403": "无访问权限",
    "404": "未找到",
    "405": "暂不支持此请求",
    "500": "服务器错误",
}

class APIRenderer(JSONRenderer):
    """自定义响应数据类"""

    def render(self, data=None, accepted_media_type=None, renderer_context=None):
        """
        自定义render返回数据
        :param data: 返回数据
        :param accepted_media_type:
        :param renderer_context:
        :return:
        """
        dic = {"code": 0, "message": "success", "data": None}
        if isinstance(data, dict):
            if data.get("code") == 1:
                dic = {"code": 1, "message": data.get("message"), "data": None}
            elif "non_field_errors" in data:
                if isinstance(data.get("non_field_errors"), list):
                    _message = ""
                    for item in data.get("non_field_errors"):
                        _message += f"{item} "
                    dic = {"code": 1, "message": _message, "data": None}
            else:
                dic = {"code": 0, "message": "success", "data": data}
        else:
            dic = {"code": 0, "message": "success", "data": data}

        # 异常状态码捕获
        response = renderer_context.get("response")
        if renderer_context:
            code = str(response.status_code)
            if code.startswith("4") or code.startswith("5"):
                dic.update({
                    "code": 1,
                    "message": CODE_MESSAGE.get(code, "状态码异常")
                })
        return super().render(
            data=dic,
            accepted_media_type=accepted_media_type,
            renderer_context=renderer_context)
