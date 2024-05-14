import json
import time
import traceback

import requests

from db_models.models import MonitorUrl, GrafanaMainPage
from utils.parse_config import GRAFANA_AUTH


def make_request(url, headers, payload):
    """
    请求
    :param url:
    :param headers:
    :param payload:
    :return:
    """
    flag = 0
    auth = (GRAFANA_AUTH.get("grafana_admin_auth").get("username", "admin"),
            GRAFANA_AUTH.get("grafana_admin_auth").get("plaintext_password", "Yunweiguanli@OMP_123"))
    while flag < 5:
        response = requests.get(url=url, headers=headers,
                                data=payload, auth=auth)
        r = json.loads(response.text)
        for url in r:
            if not isinstance(url, dict):
                break
        else:
            return True, r
        flag += 1
        time.sleep(30)
    return False, None


def synch_grafana_info():
    """如果存在则不再添加,修改会追加一条数据"""

    monitor_ip = MonitorUrl.objects.filter(name="grafana")
    monitor_url = monitor_ip[0].monitor_url if len(
        monitor_ip) else "127.0.0.1:19014"

    url = "http://{0}/proxy/v1/grafana/api/search?" \
          "sort=name_sort&type=dash-db".format(monitor_url)
    payload = {}
    headers = {'Content-Type': 'application/json'}
    try_times = 0
    while try_times <= 3:
        try:
            try_times += 1
            # print(f"start request to: {url}")
            flag, r = make_request(url=url, headers=headers, payload=payload)
            if not flag:
                return
            break
        except requests.exceptions.MissingSchema as e:
            print(f"grafana error: {str(e)}, try again after 10s!")
        except Exception as e:
            print(e)
            print(traceback.format_exc())
            return
    else:
        return
    url_type = {"log": "applogs"}
    url_dict = {}
    for url in r:
        url_name = url.get("uri").rsplit("/", 1)[1].split("-", 1)[0]
        url_dict[url_name.lower()] = url.get("url")

    for key, value in url_type.items():
        try:
            url_dict.update({key: url_dict.pop(value)})
        except KeyError:
            pass

    # omp v2.2 redis、redisgraph；zookeeper、zookeeperCH共用一个面板
    # omp v2.3 postgresql、cloudpangudb共用一个面板
    add_service_dict = {"redisgraph": "redis", "zookeeperch": "zookeeper", "cloudpangudb": "postgresql"}
    for k, v in add_service_dict.items():
        url_dict.update({k: url_dict.get(v)})

    if GrafanaMainPage.objects.all().count() != len(url_dict):
        dbname = [i.instance_name for i in GrafanaMainPage.objects.all()]
        difference = list(set(url_dict.keys()).difference(set(dbname)))
        grafana_obj = [GrafanaMainPage(
            instance_name=i, instance_url=url_dict.get(i)) for i in difference]
        GrafanaMainPage.objects.bulk_create(grafana_obj)
