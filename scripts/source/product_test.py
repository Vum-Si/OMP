# -*- coding:utf-8 -*-
import os
import sys
import requests
import django

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
sys.path.append(os.path.join(PROJECT_DIR, 'omp_server'))
# 加载django环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "omp_server.settings")
django.setup()

from db_models.models import Host, \
    ToolExecuteMainHistory, ToolInfo, \
    ToolExecuteDetailHistory
from tool.tasks import exec_tools_main
from utils.parse_config import LOCAL_IP


def get_hosts_info():
    try:
        res = requests.get(f"http://{LOCAL_IP}:12382/getAutoTestDispatch")
        if res.status_code != 200:
            print(f"请求状态码异常:{res.status_code}")
            sys.exit(1)
        host_info = res.json()
    except Exception as e:
        print(f"接口请求异常！错误信息：{str(e)}")
        sys.exit(1)
    return host_info


def produce_values(host_pro_info, test_plan="pocTest"):
    host_info = list(Host.objects.all().values_list("ip", "data_folder"))
    count = min(int(len(host_pro_info)), int(len(host_info)))
    ip_pro_dc = {}
    product_distribution = host_pro_info[count - 1][f"hostNums{count}"]
    for index, product_list in enumerate(product_distribution):
        ip = host_info[index][0]
        product_ls = product_list.get("productList", [])
        ip_pro_dc[ip] = {
            "data_folders": host_info[index][1],
            "pro_info": product_ls
        }
    return {
        "task_info": ip_pro_dc,
        "test_plan": test_plan
    }


def run(test_plan):
    try:
        values = produce_values(get_hosts_info(), test_plan)
    except Exception as e:
        print(f"生成json信息异常{e}")
        sys.exit(1)

    history = ToolExecuteMainHistory.objects.create(
        task_name="自动测试任务",
        operator="admin",
        form_answer=values,
        tool=ToolInfo.objects.all().first()
    )
    execute_details = []
    for ip, pro_info in values["task_info"].items():
        target_detail = {
            "target_ip": ip,
            "main_history": history,
            "time_out": 3600,
            "run_user": "root"
        }
        execute_details.append(
            ToolExecuteDetailHistory(**target_detail)
        )
    ToolExecuteDetailHistory.objects.bulk_create(execute_details)
    exec_tools_main.delay(history.id, values)


if __name__ == '__main__':

    if len(sys.argv) < 2:
        test_plan = "pocTest"
    else:
        test_plan = sys.argv[1]

    run(test_plan)
    print("任务执行完成")
