import { OmpTable } from "@/components";
import {
  Button,
  Modal,
  Input,
  Tooltip,
  Form,
  Select,
  Spin,
  TimePicker,
  InputNumber,
} from "antd";
import { useEffect, useState } from "react";
import { CopyOutlined, SearchOutlined, FormOutlined } from "@ant-design/icons";
import moment from "moment";

let formInitValue = {
  strategy: {
    frequency: "day",
    time: moment("00:00", "HH:mm"),
    week: "0",
    month: "1",
    hour: 1,
  },
};

export const UpdateHostModal = ({
  loading,
  modalForm,
  updateModalVisibility,
  setUpdateModalVisibility,
  updateHost,
  frequency,
  setFrequency,
  modeType,
  batchUpdateHost,
  weekData,
  context,
}) => {
  return (
    <Modal
      width={580}
      onCancel={() => {
        setUpdateModalVisibility(false);
        modalForm.setFieldsValue(formInitValue);
      }}
      visible={updateModalVisibility}
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <FormOutlined />
          </span>
          <span>
            {modeType === "batch"
              ? context.batch +
                context.ln +
                context.edit +
                context.ln +
                context.strategy
              : context.edit + context.ln + context.strategy}
          </span>
        </span>
      }
      zIndex={1004}
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Form
          name="custom"
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 18 }}
          onFinish={(data) => {
            modeType === "batch" ? batchUpdateHost(data) : updateHost(data);
          }}
          form={modalForm}
          initialValues={formInitValue}
        >
          {modeType !== "batch" && (
            <Form.Item label={context.ip} name="ip" key="ip">
              <Input style={{ width: 160 }} disabled />
            </Form.Item>
          )}

          <Form.Item
            label={context.check + context.ln + context.period}
            style={{ height: 32 }}
          >
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

              {frequency == "week" && (
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

              {frequency == "month" && (
                <Form.Item
                  name={["strategy", "month"]}
                  style={{ display: "inline-block", marginLeft: "10px" }}
                >
                  <Select
                    style={{
                      width: 120,
                    }}
                  >
                    {new Array(28).fill(0).map((item, idx) => {
                      return (
                        <Select.Option key={`${idx + 1}`} value={`${idx + 1}`}>
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

          <Form.Item
            wrapperCol={{ span: 24 }}
            style={{ textAlign: "center", position: "relative", top: 10 }}
          >
            <Button
              style={{ marginRight: 16 }}
              onClick={() => {
                setUpdateModalVisibility(false);
                modalForm.setFieldsValue(formInitValue);
              }}
            >
              {context.cancel}
            </Button>
            <Button type="primary" htmlType="submit">
              {context.ok}
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export const HostModal = ({
  modalVisibility,
  setModalVisibility,
  modalLoading,
  hostData,
  setHostData,
  initData,
  setUpdateModalVisibility,
  modalForm,
  setRow,
  setFrequency,
  hostCheckedList,
  setHostCheckedList,
  setModalType,
  weekData,
  context,
}) => {
  const [searchName, setSearchName] = useState("");

  const columns = [
    {
      title: context.row,
      key: "_idx",
      dataIndex: "_idx",
      align: "center",
      ellipsis: true,
      width: 40,
    },
    {
      title: context.ip,
      key: "ip",
      dataIndex: "ip",
      align: "center",
      ellipsis: true,
      width: 80,
      render: (text, record) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.check + context.ln + context.period,
      key: "crontab_detail",
      dataIndex: "crontab_detail",
      align: "center",
      width: 150,
      ellipsis: true,
      render: (text) => {
        if (text.day_of_month !== "*") {
          return (
            <span>
              {context.monthly} {text.day_of_month} {context.day} {text.hour}:
              {text.minute}
            </span>
          );
        } else if (text.day_of_week !== "*") {
          return (
            <span>
              {context.weekly} {weekData[text.day_of_week].name} {text.hour}:
              {text.minute}
            </span>
          );
        } else if (text.hour.includes("/")) {
          return (
            <span>
              {context.every} {text.hour.split("/")[1]} {context.hour}
            </span>
          );
        } else {
          return (
            <span>
              {context.daily} {text.hour}:{text.minute}
            </span>
          );
        }
      },
    },
    {
      title: context.action,
      width: 60,
      key: "",
      dataIndex: "",
      align: "center",
      render: (text, record) => {
        return (
          <div
            onClick={() => setRow(record)}
            style={{ display: "flex", justifyContent: "space-around" }}
          >
            <div style={{ margin: "auto" }}>
              <a
                onClick={() => {
                  setModalType("default");
                  const frType = record.crontab_detail.hour.includes("/")
                    ? "hour"
                    : record.crontab_detail.day_of_month !== "*"
                    ? "month"
                    : record.crontab_detail.day_of_week !== "*"
                    ? "week"
                    : "day";
                  setFrequency(frType);
                  const stRes = {
                    frequency: frType,
                  };
                  if (frType === "month")
                    stRes["month"] = record.crontab_detail.day_of_month;
                  if (frType === "week")
                    stRes["week"] = record.crontab_detail.day_of_week;
                  if (frType === "hour") {
                    stRes["hour"] = record.crontab_detail.hour.split("/")[1];
                  } else {
                    stRes["time"] = moment(
                      `${record.crontab_detail.hour}:${record.crontab_detail.minute}`,
                      "HH:mm"
                    );
                  }
                  modalForm.setFieldsValue({
                    ip: record.ip,
                    strategy: stRes,
                  });
                  setUpdateModalVisibility(true);
                }}
              >
                {context.edit}
              </a>
            </div>
          </div>
        );
      },
    },
  ];

  useEffect(() => {}, []);

  return (
    <Modal
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <CopyOutlined />
          </span>
          <span>
            {context.host +
              context.ln +
              context.check +
              context.ln +
              context.period}
          </span>
        </span>
      }
      width={860}
      onCancel={() => setModalVisibility(false)}
      visible={modalVisibility}
      footer={null}
      bodyStyle={{
        paddingLeft: 30,
        paddingRight: 30,
        marginTop: -10,
      }}
      destroyOnClose
      zIndex={1002}
    >
      <Spin spinning={modalLoading}>
        <div
          style={{
            display: "flex",
            marginBottom: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <Input
              placeholder={context.input + context.ln + context.ip}
              suffix={<SearchOutlined style={{ color: "#b6b6b6" }} />}
              style={{ width: 220 }}
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                if (e.target.value === "") {
                  setHostData(initData);
                }
              }}
              onPressEnter={() => {
                setHostData(initData.filter((i) => i.ip.includes(searchName)));
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flex: 1,
              textAlign: "right",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "100%",
                justifyContent: "flex-end",
              }}
            >
              <Button
                type="primary"
                disabled={hostCheckedList.length === 0}
                onClick={() => {
                  setModalType("batch");
                  setUpdateModalVisibility(true);
                }}
              >
                {context.batch + context.ln + context.edit}
              </Button>
            </div>
          </div>
        </div>
        <div>
          <div style={{ border: "1px solid rgb(235, 238, 242)" }}>
            <OmpTable
              size="small"
              scroll={{ y: 270 }}
              columns={columns}
              dataSource={hostData}
              rowKey={(record) => record.id}
              pagination={false}
              checkedState={[hostCheckedList, setHostCheckedList]}
            />
          </div>
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 20 }}
          >
            <Button onClick={() => setModalVisibility(false)}>
              {context.back}
            </Button>
          </div>
        </div>
      </Spin>
    </Modal>
  );
};
