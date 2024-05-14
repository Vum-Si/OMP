#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import subprocess
import sys
import re
import os


class GetLogJson:
    def __init__(self, log_dir_dc):
        self.log_dir_dc = log_dir_dc
        self.res_dc = {}

    def sys_cmd(self, cmd, ignore_exception=True, **kwargs):
        """
        shell脚本输出
        :param cmd: linux命令
        :param ignore_exception: 取消异常
        :return:
        """
        shell = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        stdout, stderr = shell.communicate()
        stdout, stderr = bytes.decode(stdout), bytes.decode(stderr)
        if shell.poll() != 0 and not ignore_exception:
            print("执行cmd命令失败，执行cmd命令:{0},结果退出码:{1},执行详情:{2}".format(cmd, shell.poll(), stderr))
            sys.exit(shell.poll())
        getattr(self, kwargs.get("func"))(shell.poll(), stdout, **kwargs)

    def check_rule(self, msg, ser):
        """
        校验规则是否合法
        """
        out = msg.get("clear_rule")
        if not out:
            return 1, "无规则数据"
        for rule in out:
            if len(set(rule) & {"type", "clear_path", "filter"}) != 3:
                return 1, "rule类型存在缺失"
            if not rule.get("clear_expired_day") and not rule.get("clear_max_size"):
                return 1, "rule类型存在缺失"
            if rule["type"] not in ["byFileDay", "byFileSize"]:
                return 1, "type类型只允许byFileDay,yFileSize"
            rule["clear_path"] = os.path.join(self.log_dir_dc.get(ser)[1], rule["clear_path"])
            if not re.search("^\\/(\\w+\\/?)+$", rule["clear_path"]):
                return 1, "clear_path不符合目录规范"
            exec_value = rule.pop("clear_expired_day") if \
                rule.get("clear_expired_day") else rule.pop("clear_max_size")
            if not re.search("^[0-9]+$", str(exec_value)):
                return 1, "规则值不是int类型"
            rule["exec_dir"] = rule.pop("clear_path")
            rule["exec_type"] = rule.pop("type")
            rule["exec_value"] = exec_value
            rule["exec_rule"] = rule.pop("filter")
        return 0, out

    def get_json(self, status, out, **kwargs):
        err_msg = kwargs.get("err_msg", "")
        ser = kwargs.get("ser", "a")
        if status == 0:
            try:
                out = json.loads(out)
                status, out = self.check_rule(out, ser)
                if status != 0:
                    err_msg = out
                    out = ""
            except Exception as e:
                err_msg = "json Verification failed {0}".format(e)
                status = 1
        else:
            status = 1
        self.res_dc.setdefault(ser, {}).update(
            {
                "status": status,
                "msg": err_msg,
                "out": out,
                "md5": ""
            }

        )

    def get_md5(self, status, out, **kwargs):
        err_msg = kwargs.get("err_msg", "")
        ser = kwargs.get("ser", "a")
        if status == 0:
            err_msg = ""
            out = out.split()[0]
        else:
            status = 1
        self.res_dc[ser].update({
            "md5": out,
            "msg": err_msg,
            "status": status
        })

    def check_dir(self):
        for service, json_dir in self.log_dir_dc.items():
            self.sys_cmd("cat {0}".format(json_dir[0]), err_msg="No such file", ser=service, func="get_json")
            if self.res_dc[service].get("status") == 0:
                self.sys_cmd("md5sum {0}".format(json_dir[0]), err_msg="md5 Verification failed",
                             ser=service, func="get_md5")
        print(json.dumps(self.res_dc))


if __name__ == "__main__":
    PYTHON_VERSION = sys.version_info.major
    if PYTHON_VERSION == 2:
        reload(sys)
        sys.setdefaultencoding('utf-8')
    GetLogJson(json.loads(sys.argv[1])).check_dir()
