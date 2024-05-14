import { OmpContentWrapper } from "@/components";
import {
  Switch,
  Spin,
  Form,
  Input,
  Button,
  Select,
  Tooltip,
  TimePicker,
  message,
  InputNumber,
} from "antd";
import { useState, useEffect } from "react";
import { handleResponse } from "@/utils/utils";
import { fetchGet, fetchPost, fetchPut } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import styles from "./index.module.less";
import {
  SettingOutlined,
  InfoCircleOutlined,
  MailOutlined,
} from "@ant-design/icons";
import moment from "moment";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    typeMsg: "Current version only supports deep inspection",
    nameMsg:
      "The task name is displayed in the 'Report List' and 'Report Content', and automatically supplement date info",
    openMsg:
      "After opening, the inspection task will be automatically executed at the set time",
  },
  "zh-CN": {
    typeMsg: "当前版本只支持深度分析类型",
    nameMsg: "任务名称显示在'报告列表'及'报告内容'中，系统自动补充日期信息",
    openMsg: "开启定时巡检后，将在设定的时间，自动执行巡检任务",
  },
};

const PatrolStrategy = ({ locale }) => {
  const [loading, setLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [form] = Form.useForm();
  const [pushForm] = Form.useForm();
  const [dataSource, setDataSource] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const [pushIsOpen, setPushIsOpen] = useState(false);
  const [frequency, setFrequency] = useState("day");
  const context = locales[locale].common;

  let weekData = [
    {
      name: context.monday,
      value: "星期一",
    },
    {
      name: context.tuesday,
      value: "星期二",
    },
    {
      name: context.wednesday,
      value: "星期三",
    },
    {
      name: context.thursday,
      value: "星期四",
    },
    {
      name: context.friday,
      value: "星期五",
    },
    {
      name: context.saturday,
      value: "星期六",
    },
    {
      name: context.sunday,
      value: "星期日",
    },
  ];

  const queryPatrolStrategyData = () => {
    fetchGet(apiRequest.inspection.queryPatrolStrategy, {
      params: {
        job_type: 0,
      },
    })
      .then((res) => {
        if (res && res.data && res.data.data) {
          setDataSource(res.data.data);
          let data = res.data.data;
          let crontab_detail = data.crontab_detail;
          form.setFieldsValue({
            name: {
              value: data.job_name,
            },
            type: {
              value: data.job_type + "",
            },
            isOpen: {
              value: !Boolean(data.is_start_crontab),
            },
          });

          if (crontab_detail.day_of_week !== "*") {
            setFrequency("week");
            form.setFieldsValue({
              strategy: {
                frequency: "week",
                time: moment(
                  `${crontab_detail.hour}:${crontab_detail.minute}`,
                  "HH:mm"
                ),
                week: crontab_detail.day_of_week,
              },
            });
          }

          if (crontab_detail.day !== "*") {
            setFrequency("month");
            form.setFieldsValue({
              strategy: {
                frequency: "month",
                time: moment(
                  `${crontab_detail.hour}:${crontab_detail.minute}`,
                  "HH:mm"
                ),
                month: crontab_detail.day,
              },
            });
          }

          if (crontab_detail.hour.includes("/")) {
            setFrequency("hour");
            form.setFieldsValue({
              strategy: {
                frequency: "hour",
                hour: crontab_detail.hour.split("/")[1],
              },
            });
          } else if (
            crontab_detail.day === "*" &&
            crontab_detail.day_of_week === "*"
          ) {
            setFrequency("day");
            form.setFieldsValue({
              strategy: {
                frequency: "day",
                time: moment(
                  `${crontab_detail.hour}:${crontab_detail.minute}`,
                  "HH:mm"
                ),
              },
            });
          }

          setIsOpen(!Boolean(res.data.data.is_start_crontab));
        }
      })
      .catch((e) => {
        console.log(e);
      })
      .finally();
  };

  // 修改策略的方法，当前无策略时使用post请求，当前有策略时使用put
  const changeStrategy = (data) => {
    let queryData = form.getFieldsValue();
    let timeInfo = form.getFieldValue("strategy");
    if (queryData.strategy) timeInfo = queryData.strategy;
    if (timeInfo.frequency === "hour") {
      if (!timeInfo.hour) {
        message.warning("请填写小时间隔");
        return;
      }
    }
    setLoading(true);
    if (dataSource.job_name) {
      // 本来有任务，使用更新put
      fetchPut(apiRequest.inspection.updatePatrolStrategy, {
        body: {
          job_type: 0,
          job_name: queryData.name.value,
          is_start_crontab: queryData.isOpen.value ? 0 : 1,
          crontab_detail: {
            hour:
              timeInfo.frequency === "hour"
                ? `*/${timeInfo.hour}`
                : timeInfo.time.format("HH:mm").split(":")[0] || "*",
            minute:
              timeInfo.frequency === "hour"
                ? "1"
                : timeInfo.time.format("HH:mm").split(":")[1] || "*",
            month: "*",
            day_of_week: timeInfo.week || "*",
            day: timeInfo.month || "*",
          },
          env: 1,
        },
      })
        .then((res) => {
          if (res && res.data) {
            if (res.data.code == 1) {
              message.warning(res.data.message);
            }
            if (res.data.code == 0) {
              message.success(context.edit + context.ln + context.succeeded);
            }
          }
        })
        .catch((e) => console.log(e))
        .finally(() => {
          setLoading(false);
          queryPatrolStrategyData();
        });
    } else {
      // 无任务使用post
      fetchPost(apiRequest.inspection.createPatrolStrategy, {
        body: {
          job_type: 0,
          job_name: queryData.name.value,
          is_start_crontab: queryData.isOpen.value ? 0 : 1,
          crontab_detail: {
            hour:
              timeInfo.frequency === "hour"
                ? `*/${timeInfo.hour}`
                : timeInfo.time.format("HH:mm").split(":")[0] || "*",
            minute:
              timeInfo.frequency === "hour"
                ? "1"
                : timeInfo.time.format("HH:mm").split(":")[1] || "*",
            month: "*",
            day_of_week: timeInfo.week || "*",
            day: timeInfo.month || "*",
          },
          env: 1,
        },
      })
        .then((res) => {
          if (res && res.data) {
            if (res.data.code == 1) {
              message.warning(res.data.message);
            }
            if (res.data.code == 0) {
              message.success(context.add + context.ln + context.succeeded);
            }
          }
        })
        .catch((e) => console.log(e))
        .finally(() => {
          setLoading(false);
          queryPatrolStrategyData();
        });
    }
  };

  // 查询推送数据
  const fetchPushDate = () => {
    setPushLoading(true);
    fetchGet(apiRequest.inspection.queryPushConfig)
      .then((res) => {
        handleResponse(res, (res) => {
          if (res && res.data) {
            const { send_email, to_users } = res.data;
            pushForm.setFieldsValue({
              pushIsOpen: send_email,
              email: to_users,
            });
            setPushIsOpen(send_email);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setPushLoading(false);
      });
  };

  // 改变推送
  const changePush = (data) => {
    setPushLoading(true);
    fetchPost(apiRequest.inspection.updatePushConfig, {
      body: {
        env_id: 1,
        to_users: pushForm.getFieldValue("email"),
        send_email: data.pushIsOpen,
      },
    })
      .then((res) => {
        if (res && res.data) {
          if (res.data.code == 1) {
            message.warning(res.data.message);
          }
          if (res.data.code == 0) {
            message.success(context.edit + context.ln + context.succeeded);
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setPushLoading(false);
        fetchPushDate();
      });
  };

  useEffect(() => {
    queryPatrolStrategyData();
    fetchPushDate();
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 定时执行巡检 -- */}
      <div className={styles.header}>
        <SettingOutlined style={{ paddingRight: 5 }} />
        {context.regularly + context.ln + context.inspection}
      </div>
      <Spin spinning={loading}>
        <Form
          name="setting"
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 8 }}
          style={{ paddingTop: 40 }}
          onFinish={changeStrategy}
          form={form}
          initialValues={{
            type: { value: "0" },
            name: {
              value: context.deep + context.ln + context.inspection,
            },
            isOpen: { value: false },
            strategy: {
              frequency: "day",
              time: moment("00:00", "HH:mm"),
              week: "0",
              month: "1",
            },
          }}
        >
          <Form.Item label={context.task + context.ln + context.type}>
            <Input.Group compact>
              <Form.Item
                name={["type", "value"]}
                noStyle
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.type,
                  },
                ]}
              >
                <Select
                  style={{ width: 200 }}
                  placeholder={context.select + context.ln + context.type}
                >
                  <Select.Option value="0" key="0">
                    {context.deep + context.ln + context.inspection}
                  </Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name={["type", "icon"]} noStyle>
                <Tooltip placement="top" title={msgMap[locale].typeMsg}>
                  <InfoCircleOutlined
                    name="icon"
                    style={{
                      color: "rgba(0,0,0,.45)",
                      position: "relative",
                      top: 8,
                      left: 15,
                      fontSize: 15,
                    }}
                  />
                </Tooltip>
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item label={context.task + context.ln + context.name}>
            <Input.Group compact>
              <Form.Item
                name={["name", "value"]}
                noStyle
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.name,
                  },
                  {
                    validator: (rule, value, callback) => {
                      if (value) {
                        if (value.match(/^[ ]*$/)) {
                          return Promise.reject("请输入巡检任务名称");
                        }
                        return Promise.resolve("success");
                      } else {
                        return Promise.resolve("success");
                      }
                    },
                  },
                ]}
              >
                <Input
                  placeholder={context.input + context.ln + context.name}
                  style={{ width: 200 }}
                  maxLength={16}
                />
              </Form.Item>
              <Form.Item name={["name", "icon"]} noStyle>
                <Tooltip placement="top" title={msgMap[locale].nameMsg}>
                  <InfoCircleOutlined
                    name="icon"
                    style={{
                      color: "rgba(0,0,0,.45)",
                      position: "relative",
                      top: 8,
                      left: 15,
                      fontSize: 15,
                    }}
                  />
                </Tooltip>
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item label={context.open}>
            <Input.Group compact>
              <Form.Item
                name={["isOpen", "value"]}
                noStyle
                valuePropName="checked"
              >
                <Switch
                  onChange={(e) => setIsOpen(e)}
                  style={{ borderRadius: "10px" }}
                />
              </Form.Item>
              <Form.Item name={["name", "icon"]} noStyle>
                <Tooltip placement="top" title={msgMap[locale].openMsg}>
                  <InfoCircleOutlined
                    name="icon"
                    style={{
                      color: "rgba(0,0,0,.45)",
                      position: "relative",
                      top: 4,
                      left: 15,
                      fontSize: 15,
                    }}
                  />
                </Tooltip>
              </Form.Item>
            </Input.Group>
          </Form.Item>
          {isOpen && (
            <Form.Item label={context.rule}>
              <Input.Group compact>
                <Form.Item name={["strategy", "frequency"]} noStyle>
                  <Select
                    style={{ width: 100 }}
                    onChange={(e) => setFrequency(e)}
                  >
                    <Select.Option value="day" key="day">
                      {context.daily}
                    </Select.Option>
                    <Select.Option value="week" key="week">
                      {context.weekly}
                    </Select.Option>
                    <Select.Option value="month" key="month">
                      {context.monthly}
                    </Select.Option>
                    <Select.Option value="hour" key="hour">
                      {context.hourly}
                    </Select.Option>
                  </Select>
                </Form.Item>

                {frequency === "week" && (
                  <Form.Item
                    name={["strategy", "week"]}
                    style={{ display: "inline-block", marginLeft: "10px" }}
                  >
                    <Select style={{ width: 120 }}>
                      {weekData.map((item, idx) => {
                        return (
                          <Select.Option value={`${idx}`} key={item.value}>
                            {item.name}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                )}

                {frequency === "month" && (
                  <Form.Item
                    name={["strategy", "month"]}
                    style={{ display: "inline-block", marginLeft: "10px" }}
                  >
                    <Select style={{ width: 120 }}>
                      {new Array(28).fill(0).map((item, idx) => {
                        return (
                          <Select.Option
                            key={`${idx + 1}`}
                            value={`${idx + 1}`}
                          >
                            {idx + 1}
                            {context.ri}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                )}

                {frequency === "hour" && (
                  <Form.Item
                    name={["strategy", "hour"]}
                    style={{ display: "inline-block", marginLeft: "10px" }}
                  >
                    <InputNumber
                      placeholder="1 ~ 23"
                      style={{ width: 120 }}
                      min={1}
                      max={23}
                    />
                  </Form.Item>
                )}

                {frequency !== "hour" && (
                  <Form.Item
                    name={["strategy", "time"]}
                    style={{ display: "inline-block", marginLeft: "10px" }}
                  >
                    <TimePicker format={"HH:mm"} allowClear={false} />
                  </Form.Item>
                )}
              </Input.Group>
            </Form.Item>
          )}
          <Form.Item className={styles.saveButtonWrapper}>
            <Button
              type="primary"
              htmlType="submit"
              className={styles.saveButton}
            >
              {context.save}
            </Button>
          </Form.Item>
        </Form>
      </Spin>

      {/* -- 巡检报告推送 -- */}
      <div className={styles.header}>
        <MailOutlined style={{ paddingRight: 5 }} />
        {context.inspection +
          context.ln +
          context.report +
          context.ln +
          context.push}
      </div>
      <Spin spinning={pushLoading}>
        <Form
          name="pushSetting"
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 8 }}
          style={{ paddingTop: 40 }}
          onFinish={changePush}
          form={pushForm}
          initialValues={{ pushIsOpen: false }}
        >
          <Form.Item
            label={context.open}
            name="pushIsOpen"
            valuePropName="checked"
          >
            <Switch
              onChange={(e) => setPushIsOpen(e)}
              style={{ borderRadius: "10px" }}
            />
          </Form.Item>
          {pushIsOpen && (
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
                style={{ width: 360 }}
              />
            </Form.Item>
          )}
          <Form.Item className={styles.saveButtonWrapper}>
            <Button
              type="primary"
              htmlType="submit"
              className={styles.saveButton}
            >
              {context.save}
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </OmpContentWrapper>
  );
};

export default PatrolStrategy;
