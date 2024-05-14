import requests
import json
import logging
import time
from operator import itemgetter
from db_models.models import AlertSettings
from utils.parse_config import LOCAL_IP

logger = logging.getLogger("server")


class RequestAlert:

    @staticmethod
    def get_content(payload):
        content = []
        text_dc = {}

        translate_level = {"critical": "严重",
                           "warning": "告警"}
        translate_dc = {
            "alert_type": "【故障类型】",
            "alert_host_ip": "【发生故障的节点】",
            "alert_level": "【严重级别】",
            "alertname": "【告警监控项】",
            "alert_time": "【故障发生时间】",
            "alert_instance_name": "【实例名称】",
            "alert_describe": "【故障描述】",
            "monitor": "【面板地址】"
        }
        for alert in payload:
            for alert_type, alert_value in alert.items():
                alert_ch = translate_dc.get(alert_type)
                if alert_value and alert_ch:
                    if alert_type == "monitor":
                        alert_value = f"http://{LOCAL_IP}:19001{alert_value}"
                        text_dc.update({"monitor": alert_value})

                    text_dc.update({alert_ch: translate_level.get(alert_value, alert_value)})
                    content.append(
                        [
                            {"tag": "text",
                             "text": f"{alert_ch}：{translate_level.get(alert_value, alert_value)}"
                             }
                        ]
                    )
        return content, text_dc

    @staticmethod
    def request_feishu(payload, alert_setting):

        headers = {
            'Content-Type': 'application/json'
        }
        content, _ = RequestAlert.get_content(payload)

        body = {
            "msg_type": "post",
            "content": {
                "post": {
                    "zh_cn": {
                        "title": "OMP告警通知",
                        "content": content
                    }
                }
            }
        }
        if not content:
            return

        try:
            response = requests.request("POST", alert_setting.get("url"), headers=headers, data=json.dumps(body))
            logger.info(f"发送飞书告警消息:{body},结果:{response.text}")
        except Exception as e:
            logger.error(f"发送告警消息异常,url:{alert_setting.get('url')}, 详情: {e}")

    @staticmethod
    def request_doem(payload, alert_setting):
        """
        'url'
        'token'
        """

        headers = {
            'Content-Type': 'application/json',
            'appkey': alert_setting.get('token')
        }
        try:
            for alert in payload:
                send_dc = dict()
                omp_alert = ['alert_host_ip', 'alertname', 'alert_instance_name', 'alert_describe']
                em_alert = ['host', 'check', 'targetName', 'description']
                send_dc['level'] = 'Major' if alert['status'] == 'critical' else 'Moderate'
                send_dc['timestamp'] = int(time.mktime(time.strptime(alert['alert_time'], "%Y-%m-%d %H:%M:%S"))) * 1000
                send_dc.update(dict(zip(em_alert, itemgetter(*omp_alert)(alert))))
                response = requests.request("POST", alert_setting.get('url'), headers=headers, data=json.dumps(send_dc))
                logger.info(f"发送告警消息:{send_dc},结果:{response.text}")
        except Exception as e:
            logger.error(f"发送告警消息异常,url:{alert_setting.get('url')}, token:{alert_setting.get('token')}, 详情: {e}")

    @staticmethod
    def request_douc(payload, alert_setting):
        """
            'accountId': '110',
            'userId': '3',
            'appId': '1',
            'url': 'http://127.0.0.1:18241/message/api/v1/app/sendMessage'
        """
        url = alert_setting.pop("url")
        headers = {
            'Content-Type': 'application/json'
        }
        headers.update(alert_setting)
        _, text_dc = RequestAlert.get_content(payload)
        if not text_dc:
            return
        monitor = text_dc.pop('monitor')
        text = ""
        for k, v in text_dc.items():
            text += f"{k}: {v}\n"

        body = json.dumps([
            {
                "moduleCode": "112",
                "level": "URGENT",
                "content": {
                    "type": "OTHER",
                    "contentType": "TEXT",
                    "title": "OMP告警通知",
                    "message": text,
                    "enclosures": [],
                    "multiButton": [
                        {
                            "url": f"${{_inner.url}}{monitor}",
                            "name": "接口",
                            "type": 1
                        }
                    ]
                },
                "receivers": {
                    "userIds": [
                        3
                    ],
                    "userGroupIds": [],
                    "roleIds": [],
                    "departmentIds": [],
                    "allUserInDepartment": False,
                    "extendUsers": {}
                },
                "channels": [
                    {
                        "code": "INNER",
                        "id": None
                    }
                ],
                "sendMode": {
                    "type": 1,
                    "beforeTime": None,
                    "retryTime": None
                },
                "language": {
                    "respLanguage": "zh_CN",
                    "msgLanguage": "zh_CN",
                    "multiLang": None
                },
                "version": "2"
            }
        ])
        try:
            response = requests.request("POST", url, headers=headers, data=body)
            logger.info(f"发送douc告警消息:{body},结果:{response.text}，状态码:{response.status_code}")
        except Exception as e:
            logger.error(f"发送告警消息异常,url:{url}, 详情: {e}")

    @staticmethod
    def requests_alert(payload):
        alert_types = {status[0]: status[1] for status in AlertSettings.ALERT_TYPES}
        for obj in AlertSettings.objects.filter(switch=AlertSettings.IS_ON):
            getattr(RequestAlert, f"request_{alert_types[obj.alert_type]}")(payload, obj.alert_setting)
