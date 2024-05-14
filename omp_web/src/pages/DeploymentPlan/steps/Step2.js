import { fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse } from "@/utils/utils";
import {
  Button,
  Form,
  Spin,
  InputNumber,
  Tooltip,
  Space,
  Collapse,
  Table,
  message,
} from "antd";
import { useState } from "react";
import {
  QuestionCircleOutlined,
  MinusCircleOutlined,
  CaretRightOutlined,
} from "@ant-design/icons";

const { Panel } = Collapse;

const msgMap = {
  "en-US": {
    memoryMsg: "The default value for memory not provided by the service",
    redundancyMsg:
      "Allow for the skewness of memory resources, which only needs to be adjusted when actual memory is insufficient. Single host actual allocated memory=full service memory/full host memory * single host memory * (+redundancy factor)",
  },
  "zh-CN": {
    memoryMsg: "服务未提供内存的缺省值",
    redundancyMsg:
      "允许内存资源的倾斜程度，仅当实际内存不足时需要调整，单主机实际分配内存=全服务内存/全主机内存*单主机内存*(+冗余系数)",
  },
};

const Step2 = ({
  setStepNum,
  twoData,
  setThreeData,
  viewHeight,
  secndForm,
  secndHostForm,
  setProInfo,
  setAppInfo,
  proInfo,
  appInfo,
  proInfoInit,
  appInfoInit,
  context,
  locale,
}) => {
  // 加载
  const [loading, setLoading] = useState(false);

  // 产品表格
  const proColumns = [
    {
      title: context.product + context.ln + context.name,
      key: "pro_name",
      dataIndex: "pro_name",
      align: "center",
      ellipsis: true,
    },
    {
      title: context.version,
      key: "pro_version",
      dataIndex: "pro_version",
      align: "center",
      ellipsis: true,
    },
    {
      title: context.quantity,
      key: "pro_count",
      dataIndex: "pro_count",
      align: "center",
      ellipsis: true,
      width: 160,
      render: (text, record) => {
        return {
          children: (
            <InputNumber
              key={record.pro_name}
              value={proInfo[record.pro_name]}
              min={1}
              onChange={(e) => {
                const newInfo = { ...proInfo };
                newInfo[record.pro_name] =
                  e === null ? proInfoInit[record.pro_name] : e;
                setProInfo(newInfo);
              }}
            />
          ),
          props: {},
        };
      },
    },
  ];

  // 组件表格
  const compColumns = [
    {
      title: context.component + context.ln + context.name,
      key: "app_name",
      dataIndex: "app_name",
      align: "center",
      ellipsis: true,
    },
    {
      title: context.version,
      key: "app_version",
      dataIndex: "app_version",
      align: "center",
      ellipsis: true,
    },
    {
      title: context.quantity,
      key: "app_count",
      dataIndex: "app_count",
      align: "center",
      ellipsis: true,
      width: 160,
      render: (text, record) => {
        return {
          children: (
            <InputNumber
              key={record.app_name}
              value={appInfo[record.app_name]}
              min={1}
              onChange={(e) => {
                const newInfo = { ...appInfo };
                newInfo[record.app_name] =
                  e === null ? appInfoInit[record.app_name] : e;
                setAppInfo(newInfo);
              }}
            />
          ),
          props: {},
        };
      },
    },
  ];

  // 生成模板
  const createTemp = () => {
    setLoading(true);
    fetchPost(apiRequest.deloymentPlan.isntallTempSecond, {
      body: {
        pro_info: twoData?.pro_info.map((e) => {
          return {
            pro_name: e.pro_name,
            pro_version: e.pro_version,
            pro_count: proInfo[e.pro_name],
          };
        }),
        deploy_app: twoData?.deploy_app.map((e) => {
          return {
            app_name: e.app_name,
            app_version: e.app_version,
            mem: e.mem,
            app_count: appInfo[e.app_name],
          };
        }),
        redundant_mem: secndForm.getFieldValue("redundant_mem"),
        default_mem: secndForm.getFieldValue("default_mem"),
        omp_mem: secndForm.getFieldValue("omp_mem"),
        host_info: secndHostForm.getFieldValue("host_info"),
        uuid: twoData.uuid,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.message === "success") {
            setThreeData(res.data);
            setStepNum(2);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div style={{ backgroundColor: "#fff" }}>
      <Spin spinning={loading}>
        {/* -- 顶部选择区域 -- */}
        <div
          style={{
            marginTop: 15,
            display: "flex",
            width: "calc(100%)",
            padding: 12,
          }}
        >
          <div style={{ display: "flex", height: 32, overflow: "hidden" }}>
            <Form
              name="secondForm"
              form={secndForm}
              layout="inline"
              initialValues={{
                redundant_mem: twoData?.redundant_mem,
                default_mem: twoData?.default_mem,
                omp_mem: twoData?.omp_mem,
              }}
            >
              <Form.Item
                label={context.default + context.ln + context.memory}
                name="default_mem"
                rules={[{ required: true }]}
              >
                <Form.Item
                  noStyle
                  name="default_mem"
                  rules={[
                    {
                      required: true,
                      message: context.input + context.ln + context.memory,
                    },
                  ]}
                >
                  <InputNumber style={{ width: 140 }} addonAfter="M" min="0" />
                </Form.Item>

                <span
                  name="default_mem_tishi"
                  style={{
                    paddingLeft: 10,
                    position: "relative",
                    top: 6,
                  }}
                >
                  <Tooltip title={msgMap[locale].memoryMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.redundancy}
                name="redundant_mem"
                rules={[{ required: true }]}
                style={{ marginLeft: 40 }}
              >
                <Form.Item
                  noStyle
                  name="redundant_mem"
                  rules={[
                    {
                      required: true,
                      message: context.input + context.ln + context.redundancy,
                    },
                  ]}
                >
                  <InputNumber style={{ width: 120 }} min="0" step="0.10" />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 10,
                    position: "relative",
                    top: 1,
                  }}
                >
                  <Tooltip title={msgMap[locale].redundancyMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={"OMP" + context.ln + context.memory}
                name="omp_mem"
                style={{ marginLeft: 40 }}
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.memory,
                  },
                ]}
              >
                <InputNumber style={{ width: 120 }} min="0" />
              </Form.Item>
            </Form>
          </div>
        </div>

        {/* -- 中部数量信息区域 -- */}
        <div
          style={{
            padding: 20,
            paddingLeft: 10,
            paddingTop: 0,
            paddingBottom: 0,
            height: viewHeight - 305,
            display: "flex",
          }}
        >
          {/* -- 左侧主机信息 -- */}
          <div
            style={{
              width: 280,
              overflowY: "auto",
            }}
          >
            <div>
              <Form
                name="twoHostInfo"
                autoComplete="off"
                style={{ paddingRight: 8 }}
                form={secndHostForm}
                initialValues={{
                  host_info: [
                    {
                      count: 5,
                      mem: 64,
                    },
                  ],
                }}
              >
                <Form.List name="host_info">
                  {(fields, { add, remove }) => (
                    <>
                      <Form.Item
                        style={{
                          paddingLeft: 10,
                          paddingRight: 10,
                          backgroundColor: "rgb(240, 240, 240)",
                          borderRadius: 5,
                        }}
                      >
                        {context.host + context.ln + context.info}
                        <span
                          style={{
                            color: "rgb(74, 133, 247)",
                            float: "right",
                            cursor: "pointer",
                          }}
                          onClick={() => add()}
                        >
                          {context.add}
                        </span>
                      </Form.Item>
                      {fields.map(({ key, name, ...restField }) => (
                        <Space key={key} style={{ paddingLeft: 6 }}>
                          <Form.Item {...restField} name={[name, "count"]}>
                            <InputNumber
                              placeholder={context.quantity}
                              addonAfter={context.tai}
                              style={{ width: 105 }}
                            />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, "mem"]}>
                            <InputNumber
                              placeholder={context.memory}
                              addonAfter="G"
                              style={{ width: 115 }}
                            />
                          </Form.Item>
                          {secndHostForm.getFieldValue("host_info").length >
                            1 &&
                            key !== 0 && (
                              <MinusCircleOutlined
                                onClick={() => remove(name)}
                                style={{
                                  float: "right",
                                  marginBottom: 12,
                                  color: "rgb(74, 133, 247)",
                                }}
                              />
                            )}
                        </Space>
                      ))}
                    </>
                  )}
                </Form.List>
              </Form>
            </div>
          </div>

          {/* -- 右侧 -- */}
          <div
            style={{
              flex: 1,
              borderLeft: "1px solid #d9d9d9",
              overflowY: "auto",
            }}
          >
            <Collapse
              bordered={false}
              defaultActiveKey={["pro", "comp"]}
              expandIcon={({ isActive }) => (
                <CaretRightOutlined rotate={isActive ? 90 : 0} />
              )}
            >
              {/* -- 产品数量信息 -- */}
              <Panel
                header={context.product + context.ln + context.quantity}
                key="pro"
                className={"panelItem"}
                style={{ backgroundColor: "#f6f6f6" }}
              >
                <Table
                  style={{ border: "1px solid #e3e3e3" }}
                  pagination={false}
                  dataSource={twoData?.pro_info}
                  columns={proColumns}
                />
              </Panel>

              {/* -- 组件数量信息 -- */}
              <Panel
                header={context.component + context.ln + context.quantity}
                key="comp"
                className={"panelItem"}
                style={{ backgroundColor: "#f6f6f6" }}
              >
                <Table
                  style={{ border: "1px solid #e3e3e3" }}
                  pagination={false}
                  dataSource={twoData?.deploy_app}
                  columns={compColumns}
                />
              </Panel>
            </Collapse>
          </div>
        </div>
      </Spin>

      {/* -- 底部区域 -- */}
      <div
        style={{
          position: "fixed",
          backgroundColor: "#fff",
          width: "calc(100% - 230px)",
          bottom: 4,
          padding: "10px 0px",
          display: "flex",
          justifyContent: "space-between",
          paddingRight: 30,
          boxShadow: "0px 0px 10px #999999",
          alignItems: "center",
          borderRadius: 2,
        }}
      >
        <div style={{ paddingLeft: 20 }}></div>
        <div>
          <Button
            style={{ marginLeft: 10 }}
            type="primary"
            loading={loading}
            onClick={() => setStepNum(0)}
          >
            {context.previous}
          </Button>
          <Button
            style={{ marginLeft: 10 }}
            type="primary"
            // disabled={true}
            loading={loading}
            onClick={() => {
              if (secndForm.getFieldValue("default_mem") === null) {
                message.warning("缺省内存不可为空");
              } else if (secndForm.getFieldValue("redundant_mem") === null) {
                message.warning("冗余系数不可为空");
              } else if (secndForm.getFieldValue("omp_mem") === null) {
                message.warning("OMP内存不可为空");
              } else {
                if (secndHostForm.getFieldValue("host_info").length === 0) {
                  message.warning("请补充主机信息");
                  return;
                }
                if (
                  secndHostForm.getFieldValue("host_info").includes(undefined)
                ) {
                  message.warning("请完善主机信息，数量和内存不可为空");
                  return;
                }
                for (
                  let i = 0;
                  i < secndHostForm.getFieldValue("host_info").length;
                  i++
                ) {
                  const element = secndHostForm.getFieldValue("host_info")[i];
                  if (!(element.count && element.mem)) {
                    message.warning("请完善主机信息，数量和内存不可为空");
                    return;
                  }
                }

                // 数据校验通过，生成模板
                createTemp();
              }
            }}
          >
            {context.generate}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step2;
