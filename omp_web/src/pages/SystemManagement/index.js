import { OmpContentWrapper, OmpMessageModal } from "@/components";
import { message, Switch, Button, Input, Form, Spin } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit } from "@/utils/utils";
import { fetchGet, fetchPost, fetchPatch } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import styles from "./index.module.less";
import {
  ToolFilled,
  ExclamationCircleOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { getMaintenanceChangeAction } from "./store/actionsCreators";
import { useSelector, useDispatch } from "react-redux";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    whMsg:
      "After activation, data backup, log cleaning, alarms, and self-healing will be paused. It is commonly used during upgrade and change operations to avoid false alarms.",
  },
  "zh-CN": {
    whMsg:
      "开启维护模式后，将暂停平台备份、日志清理、告警和自愈功能；此功能适用于计划性升级、变更操作期间，避免造成误报带来的影响。",
  },
};

const SystemManagement = ({ locale }) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  //是否展示维护模式提示词
  const isMaintenance = useSelector(
    (state) => state.systemManagement.isMaintenance
  );
  const [closeMaintenanceModal, setCloseMaintenanceModal] = useState(false);
  const [openMaintenanceModal, setOpenMaintenanceModal] = useState(false);
  // 监控平台数据
  const [dataSource, setDataSource] = useState([]);
  const [form] = Form.useForm();
  const context = locales[locale].common;

  // 更改维护模式
  const changeMaintain = (e) => {
    setLoading(true);
    fetchPost(apiRequest.environment.queryMaintainState, {
      body: {
        matcher_name: "env",
        matcher_value: "default",
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            if (e) {
              message.success(context.open + context.ln + context.succeeded);
              dispatch(getMaintenanceChangeAction(true));
            } else {
              message.success(context.close + context.ln + context.succeeded);
              dispatch(getMaintenanceChangeAction(false));
            }
          }
          if (res.code == 1) {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setOpenMaintenanceModal(false);
        setCloseMaintenanceModal(false);
      });
  };

  const fetchData = () => {
    setLoading(true);
    fetchGet(apiRequest.MonitoringSettings.monitorurl)
      .then((res) => {
        handleResponse(res, (res) => {
          // console.log(res.data);
          res.data.map((item) => {
            switch (item.name) {
              case "prometheus":
                form.setFieldsValue({
                  prometheus: item.monitor_url,
                });
                return;
              case "alertmanager":
                form.setFieldsValue({
                  alertmanager: item.monitor_url,
                });
                return;
              case "grafana":
                form.setFieldsValue({
                  grafana: item.monitor_url,
                });
                return;
              default:
                return;
            }
          });
          let dir = {};
          res.data.map((item) => {
            dir[item.name] = item.id;
          });
          setDataSource(dir);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  const multipleUpdate = () => {
    const data = form.getFieldsValue();
    const arr = Object.keys(data).map((key) => {
      return {
        id: dataSource[key],
        monitor_url: data[key],
      };
    });
    setLoading(true);
    fetchPatch(apiRequest.MonitoringSettings.multiple_update, {
      body: {
        data: arr,
      },
    })
      .then((res) => {
        if (res && res.data) {
          if (res.data.code == 1) {
            message.warning(res.data.message);
          }
          if (res.data.code == 0) {
            message.success(context.edit + context.ln + context.succeeded);
            fetchData();
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 定义监控地址校验函数
  const validateMonitorAddress = (rule, value, callback, title) => {
    if (value) {
      var reg = /[^a-zA-Z0-9\-\_\.\~\!\*\'\(\)\;\:\@\&\=\+\$\,\/\?\#\[\]]/g;
      if (!reg.test(value)) {
        return Promise.resolve("success");
      } else {
        return Promise.reject(`${title}地址存在非法字符`);
      }
    } else {
      return Promise.resolve("success");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 维护模式 -- */}
      <div className={styles.header}>
        <ToolFilled style={{ paddingRight: 5 }} />
        {context.maintainMode}
      </div>
      <div className={styles.content}>
        <span className={styles.label}>{context.open + " : "}</span>
        <Switch
          checked={isMaintenance}
          onChange={(e) => {
            if (e) {
              setOpenMaintenanceModal(true);
            } else {
              setCloseMaintenanceModal(true);
            }
          }}
        />
      </div>
      <p className={styles.tips}>
        <ExclamationCircleOutlined
          style={{
            position: "relative",
            top: 1,
            paddingRight: 10,
            fontSize: 18,
          }}
        />
        {msgMap[locale].whMsg}
      </p>

      {/* -- 监控组件配置 -- */}
      <div className={styles.header}>
        <SettingOutlined style={{ paddingRight: 5 }} />
        {context.monitor +
          context.ln +
          context.component +
          context.ln +
          context.config}
        <Button
          type="link"
          size="small"
          style={{
            color: "rgb(55, 144, 255)",
            float: "right",
          }}
          onClick={() => multipleUpdate()}
        >
          {context.save}
        </Button>
      </div>
      <Spin spinning={loading}>
        <Form
          name="setting"
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 6 }}
          style={{ paddingTop: 30, paddingLeft: 20 }}
          onFinish={multipleUpdate}
          form={form}
        >
          <Form.Item
            label="Prometheus"
            name="prometheus"
            rules={[
              {
                required: true,
                message: context.input + context.ln + "Prometheus Url",
              },
              {
                validator: (rule, value, callback) => {
                  return validateMonitorAddress(
                    rule,
                    value,
                    callback,
                    "Prometheus"
                  );
                },
              },
            ]}
          >
            <Input
              addonBefore="Http://"
              placeholder={context.input + context.ln + "Prometheus Url"}
              style={{
                width: 360,
              }}
            />
          </Form.Item>

          <Form.Item
            label="Grafana"
            name="grafana"
            rules={[
              {
                required: true,
                message: context.input + context.ln + "Grafana Url",
              },
              {
                validator: (rule, value, callback) => {
                  return validateMonitorAddress(
                    rule,
                    value,
                    callback,
                    "Grafana"
                  );
                },
              },
            ]}
          >
            <Input
              addonBefore="Http://"
              placeholder={context.input + context.ln + "Grafana Url"}
              style={{
                width: 360,
              }}
            />
          </Form.Item>

          <Form.Item
            label="AlertManager"
            name="alertmanager"
            rules={[
              {
                required: true,
                message: context.input + context.ln + "AlertManager Url",
              },
              {
                validator: (rule, value, callback) => {
                  return validateMonitorAddress(
                    rule,
                    value,
                    callback,
                    "Alert Manager"
                  );
                },
              },
            ]}
          >
            <Input
              addonBefore="Http://"
              placeholder={context.input + context.ln + "AlertManager Url"}
              style={{
                width: 360,
              }}
            />
          </Form.Item>
        </Form>
      </Spin>

      {/* -- 开启维护模式 -- */}
      <OmpMessageModal
        visibleHandle={[openMaintenanceModal, setOpenMaintenanceModal]}
        context={context}
        loading={loading}
        onFinish={() => changeMaintain(true)}
      >
        <div style={{ padding: "20px" }}>
          {context.open +
            context.ln +
            context.global +
            context.ln +
            context.maintainMode}{" "}
          ?
        </div>
      </OmpMessageModal>

      {/* -- 关闭维护模式 -- */}
      <OmpMessageModal
        visibleHandle={[closeMaintenanceModal, setCloseMaintenanceModal]}
        context={context}
        loading={loading}
        onFinish={() => changeMaintain(false)}
      >
        <div style={{ padding: "20px" }}>
          {context.close +
            context.ln +
            context.global +
            context.ln +
            context.maintainMode}{" "}
        </div>
      </OmpMessageModal>
    </OmpContentWrapper>
  );
};

export default SystemManagement;
