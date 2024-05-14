"""
公共分页器
"""

from rest_framework.pagination import (
    PageNumberPagination,
    LimitOffsetPagination,
    CursorPagination
)
from django.core.paginator import Paginator
from collections import OrderedDict
from rest_framework.response import Response
from rest_framework.utils.urls import remove_query_param, replace_query_param


class PageNumberPager(PageNumberPagination):
    """ 容量分页 """
    page_size = 10
    max_page_size = 100
    page_query_param = 'page'
    page_size_query_param = 'size'


class LimitOffsetPager(LimitOffsetPagination):
    """ 偏移分页 """
    default_limit = 10
    max_limit = 100
    limit_query_param = 'limit'
    offset_query_param = 'offset'


class CursorPager(CursorPagination):
    """ 游标分页 """
    page_size = 10
    cursor_query_param = 'cursor'


class RawPage(Paginator):
    """python 原生数据分页器,如：字典列表"""
    size = 10
    page_query_param = 'page'
    size_query_param = 'size'

    def __init__(self, iter_list, request):
        self.size = int(request.query_params.get(self.size_query_param, 10))
        super().__init__(iter_list, self.size)
        self.url = request.build_absolute_uri()
        self.request = request
        self.page_number = int(request.query_params.get(self.page_query_param, 1))
        self.page_obj = self.get_page(self.page_number)

    def get_page(self, number):
        try:
            number = self.validate_number(number)
        except Exception as e:
            number = 1
        return self.page(number)

    def get_next_link(self):
        if not self.page_obj.has_next():
            return None
        next_page_number = self.page_obj.next_page_number()
        return replace_query_param(self.url, self.page_query_param, next_page_number)

    @property
    def start_index(self):
        if self.count == 0:
            return 0
        return self.size * (self.page_obj.number - 1)

    @property
    def end_index(self):
        if self.page_number == self.num_pages:
            return self.count
        return self.page_obj.number * self.size

    def get_previous_link(self):
        if not self.page_obj.has_previous():
            return None
        url = self.request.build_absolute_uri()
        previous_page_number = self.page_obj.previous_page_number()
        if previous_page_number == 1:
            return remove_query_param(url, self.page_query_param)
        return replace_query_param(url, self.page_query_param, previous_page_number)

    @property
    def get_paginated_data(self):
        return self.object_list[self.start_index:self.end_index]

    def get_paginated_response(self):
        return Response(OrderedDict([
            ('count', self.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', self.get_paginated_data)
        ]))
