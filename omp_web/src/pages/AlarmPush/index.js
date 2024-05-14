import { OmpContentWrapper } from "@/components";
import {
  Button,
  Input,
  Form,
  message,
  Spin,
  Switch,
  Tabs,
  InputNumber,
} from "antd";
import { useState, useEffect } from "react";
import { handleResponse } from "@/utils/utils";
import { fetchGet, fetchPost, fetchPut } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { PushpinOutlined, MailOutlined } from "@ant-design/icons";
import styles from "./index.module.less";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    smtpMsg: "Email SMTP server",
  },
  "zh-CN": {
    smtpMsg: "邮箱SMTP服务器",
  },
};

const AlarmPush = ({ locale }) => {
  // 邮件推送
  const [smtpForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [isEmailPush, setIsEmailPush] = useState(false);
  // 告警推送信息
  const [doucForm] = Form.useForm();
  const [doucInfo, setDoucInfo] = useState(null);
  const [feishuForm] = Form.useForm();
  const [feishuInfo, setFeiShuInfo] = useState(null);
  const [doemForm] = Form.useForm();
  const [doemInfo, setDoemInfo] = useState(null);
  // 通用 loading 对象
  const [loading, setLoading] = useState(false);
  const context = locales[locale].common;

  // 查询邮件服务器信息
  const fetchSmtp = () => {
    setSmtpLoading(true);
    fetchGet(apiRequest.emailSetting.querySetting)
      .then((res) => {
        handleResponse(res, (res) => {
          smtpForm.setFieldsValue({
            address: res.data.host,
            port: res.data.port,
            email: res.data.username,
            token: res.data.password,
          });
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setSmtpLoading(false);
      });
  };

  // 更新 SMTP 邮箱服务器
  const updateSmtp = () => {
    setSmtpLoading(true);
    fetchPost(apiRequest.emailSetting.updateSetting, {
      body: {
        host: smtpForm.getFieldValue("address"),
        port: smtpForm.getFieldValue("port"),
        username: smtpForm.getFieldValue("email"),
        password: smtpForm.getFieldValue("token"),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0) {
            message.success(context.edit + context.ln + context.succeeded);
            fetchSmtp();
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setSmtpLoading(false);
      });
  };

  // 查询推送数据
  const fetchEmailPush = () => {
    setEmailLoading(true);
    fetchGet(apiRequest.MonitoringSettings.queryPushConfig)
      .then((res) => {
        handleResponse(res, (res) => {
          if (res && res.data) {
            const { used, server_url } = res.data.email;
            emailForm.setFieldsValue({
              pushIsOpen: used,
              email: server_url,
            });
            setIsEmailPush(used);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setEmailLoading(false);
      });
  };

  // 改变告警邮件推送
  const updateEmail = () => {
    setEmailLoading(true);
    fetchPost(apiRequest.MonitoringSettings.updatePushConfig, {
      body: {
        way_name: "email",
        env_id: 1,
        server_url: emailForm.getFieldValue("email"),
        used: isEmailPush,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0) {
            message.success(context.edit + context.ln + context.succeeded);
            fetchEmailPush();
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setEmailLoading(false);
      });
  };

  // 查询告警推送数据
  const fetchAlarmPushData = () => {
    setLoading(true);
    fetchGet(apiRequest.emailSetting.alertSetting)
      .then((res) => {
        handleResponse(res, (res) => {
          for (let i = 0; i < res.data.length; i++) {
            const element = res.data[i];
            const settings = element.alert_setting;
            switch (element.alert_type) {
              case 0:
                doucForm.setFieldsValue({
                  switch: Boolean(element.switch),
                  url: settings.url,
                  token: settings.token,
                  appId: settings.appId,
                  userId: settings.userId,
                  accountId: settings.accountId,
                });
                setDoucInfo(element);
                break;
              case 1:
                feishuForm.setFieldsValue({
                  switch: Boolean(element.switch),
                  url: settings.url,
                });
                setFeiShuInfo(element);
                break;
              case 2:
                doemForm.setFieldsValue({
                  switch: Boolean(element.switch),
                  url: settings.url,
                  token: settings.token,
                });
                setDoemInfo(element);
                break;
              default:
                break;
            }
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 编辑告警推送
  const updatePush = (type) => {
    const reqData = {};
    if (type === "douc") {
      reqData["id"] = doucInfo.id;
      reqData["switch"] = doucForm.getFieldValue("switch") === true ? 1 : 0;
      reqData["alert_setting"] = {
        url: doucForm.getFieldValue("url"),
        appId: doucForm.getFieldValue("appId"),
        token: doucForm.getFieldValue("token"),
        userId: doucForm.getFieldValue("userId"),
        accountId: doucForm.getFieldValue("accountId"),
      };
    } else if (type === "feishu") {
      reqData["id"] = feishuInfo.id;
      reqData["switch"] = feishuForm.getFieldValue("switch") === true ? 1 : 0;
      reqData["alert_setting"] = {
        url: feishuForm.getFieldValue("url"),
      };
    } else if (type === "doem") {
      reqData["id"] = doemInfo.id;
      reqData["switch"] = doemForm.getFieldValue("switch") === true ? 1 : 0;
      reqData["alert_setting"] = {
        url: doemForm.getFieldValue("url"),
        token: doemForm.getFieldValue("token"),
      };
    } else {
      message.warning(context.save + context.ln + context.failed);
      return;
    }
    setLoading(true);
    fetchPut(
      apiRequest.emailSetting.alertSetting,
      {
        body: [reqData],
      },
      true
    )
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0) {
            message.success(
              context.edit + context.ln + type + context.ln + context.succeeded
            );
            fetchAlarmPushData();
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSmtp();
    fetchEmailPush();
    fetchAlarmPushData();
  }, []);

  return (
    <OmpContentWrapper>
      <Tabs type="card">
        {/* -- 邮件 -- */}
        <Tabs.TabPane tab={context.email} key="email">
          <div className={styles.header}>
            <MailOutlined style={{ paddingRight: 10 }} />
            {msgMap[locale].smtpMsg}
            <Button
              type="link"
              size="small"
              style={{
                color: "rgb(55, 144, 255)",
                float: "right",
              }}
              onClick={() => updateSmtp()}
            >
              {context.save}
            </Button>
          </div>
          <Spin spinning={smtpLoading}>
            <Form
              name="emailSetting"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 6 }}
              style={{ paddingTop: 12 }}
              form={smtpForm}
            >
              <Form.Item
                label={context.mailServer}
                name="address"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.mailServer,
                  },
                ]}
              >
                <Input
                  placeholder={context.example + " : 192.168.10.10"}
                  style={{ width: 360 }}
                />
              </Form.Item>

              <Form.Item
                label={context.port}
                name="port"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.port,
                  },
                ]}
              >
                <InputNumber
                  placeholder={context.example + " : 165"}
                  min={1}
                  max={65535}
                  style={{ width: 360 }}
                />
              </Form.Item>

              <Form.Item
                label={context.sender}
                name="email"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.sender,
                  },
                ]}
              >
                <Input
                  placeholder={context.example + " : emailname@163.com"}
                  style={{ width: 360 }}
                />
              </Form.Item>

              <Form.Item
                label="Token"
                name="token"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + "Token",
                  },
                ]}
              >
                <Input.Password
                  placeholder={context.input + context.ln + "Token"}
                  style={{ width: 360 }}
                />
              </Form.Item>
            </Form>
          </Spin>

          <div className={styles.header}>
            <PushpinOutlined style={{ paddingRight: 10 }} />
            {context.alarm +
              context.ln +
              context.push +
              context.ln +
              context.email}
            <Button
              type="link"
              size="small"
              style={{
                color: "rgb(55, 144, 255)",
                float: "right",
              }}
              onClick={() => updateEmail()}
            >
              {context.save}
            </Button>
          </div>

          <Spin spinning={emailLoading}>
            <Form
              name="emailPushSetting"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 6 }}
              style={{ paddingTop: 12 }}
              form={emailForm}
              initialValues={{
                pushIsOpen: false,
              }}
            >
              <Form.Item
                label={context.open}
                name="pushIsOpen"
                valuePropName="checked"
              >
                <Switch
                  onChange={(e) => setIsEmailPush(e)}
                  style={{ borderRadius: "10px" }}
                />
              </Form.Item>
              {isEmailPush && (
                <Form.Item
                  label={context.receiver}
                  name="email"
                  rules={[
                    {
                      type: "email",
                      message: context.input + context.ln + context.email,
                    },
                    {
                      required: true,
                      message: context.input + context.ln + context.email,
                    },
                  ]}
                >
                  <Input
                    placeholder={context.example + " : emailname@163.com"}
                    style={{
                      width: 360,
                    }}
                  />
                </Form.Item>
              )}
            </Form>
          </Spin>
        </Tabs.TabPane>

        {/* -- douc -- */}
        <Tabs.TabPane tab="DOUC" key="douc">
          <div className={styles.header}>
            <MailOutlined style={{ paddingRight: 10 }} />
            DOUC API
            <Button
              type="link"
              size="small"
              style={{
                color: "rgb(55, 144, 255)",
                float: "right",
              }}
              onClick={() => updatePush("douc")}
            >
              {context.save}
            </Button>
          </div>
          <Spin spinning={loading}>
            <Form
              name="doucSetting"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 6 }}
              style={{ paddingTop: 12 }}
              form={doucForm}
            >
              <Form.Item
                label={context.open}
                name="switch"
                valuePropName="checked"
              >
                <Switch style={{ borderRadius: "10px" }} />
              </Form.Item>
              <Form.Item label="Url" name="url">
                <Input
                  style={{ width: 440 }}
                  placeholder={context.input + " Url"}
                />
              </Form.Item>

              <Form.Item label="Token" name="token">
                <Input
                  style={{ width: 440 }}
                  placeholder={context.input + " Token"}
                />
              </Form.Item>

              <Form.Item label="AppId" name="appId">
                <Input
                  style={{ width: 180 }}
                  placeholder={context.input + " AppId"}
                />
              </Form.Item>

              <Form.Item label="UserId" name="userId">
                <Input
                  style={{ width: 180 }}
                  placeholder={context.input + " UserId"}
                />
              </Form.Item>

              <Form.Item label="AccountId" name="accountId">
                <Input
                  style={{ width: 180 }}
                  placeholder={context.input + " AccountId"}
                />
              </Form.Item>
            </Form>
          </Spin>
        </Tabs.TabPane>

        {/* -- 飞书 -- */}
        <Tabs.TabPane tab={context.feishu} key="feishu">
          <div className={styles.header}>
            <MailOutlined style={{ paddingRight: 10 }} />
            {context.feishu + " API"}
            <Button
              type="link"
              size="small"
              style={{
                color: "rgb(55, 144, 255)",
                float: "right",
              }}
              onClick={() => updatePush("feishu")}
            >
              {context.save}
            </Button>
          </div>
          <Spin spinning={loading}>
            <Form
              name="feishuSetting"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 6 }}
              style={{ paddingTop: 12 }}
              form={feishuForm}
            >
              <Form.Item
                label={context.open}
                name="switch"
                valuePropName="checked"
              >
                <Switch style={{ borderRadius: "10px" }} />
              </Form.Item>
              <Form.Item label="Url" name="url">
                <Input
                  style={{ width: 440 }}
                  placeholder={context.input + " Url"}
                />
              </Form.Item>
            </Form>
          </Spin>
        </Tabs.TabPane>

        {/* -- DOEM -- */}
        <Tabs.TabPane tab="DOEM" key="doem">
          <div className={styles.header}>
            <MailOutlined style={{ paddingRight: 10 }} />
            DOEM API
            <Button
              type="link"
              size="small"
              style={{
                color: "rgb(55, 144, 255)",
                float: "right",
              }}
              onClick={() => updatePush("doem")}
            >
              {context.save}
            </Button>
          </div>
          <Spin spinning={loading}>
            <Form
              name="doemSetting"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 6 }}
              style={{ paddingTop: 12 }}
              form={doemForm}
            >
              <Form.Item
                label={context.open}
                name="switch"
                valuePropName="checked"
              >
                <Switch style={{ borderRadius: "10px" }} />
              </Form.Item>
              <Form.Item label="Url" name="url">
                <Input
                  style={{ width: 440 }}
                  placeholder={context.input + " Url"}
                />
              </Form.Item>
              <Form.Item label="Token" name="token">
                <Input
                  style={{ width: 440 }}
                  placeholder={context.input + " Token"}
                />
              </Form.Item>
            </Form>
          </Spin>
        </Tabs.TabPane>
      </Tabs>
    </OmpContentWrapper>
  );
};

export default AlarmPush;
