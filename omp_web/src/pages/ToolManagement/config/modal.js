import {
  Button,
  Modal,
  Input,
  Select,
  Steps,
  Spin,
  message,
  Table,
  Form,
} from "antd";
import { useState } from "react";
import { ScanOutlined } from "@ant-design/icons";
import { fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse } from "@/utils/utils";

const AutoTestModal = ({
  modalVisibility,
  setModalVisibility,
  modalLoading,
  setModalLoading,
  planType,
  history,
  context,
}) => {
  const [stepNum, setStepNum] = useState(0);

  const [planInfo, setPlanInfo] = useState([]);

  // 结果信息
  const [resultSet, setResultSet] = useState({});

  // 表单控件
  const [modalForm] = Form.useForm();

  // 动态渲染数据
  const [oneData, setOneData] = useState(null);
  const [twoHead, setTwoHead] = useState([]);
  const [selectSet, setSelectSet] = useState({});

  // 动态渲染第一页
  const renderOne = (item, planType) => {
    switch (item.type) {
      case "str":
        if (planType.body && !modalForm.getFieldValue(item.key)) {
          modalForm.setFieldsValue({
            [`${item.key}`]: planType.body[0][`${item.key}`],
          });
        }
        return (
          <Form.Item
            label={item.name}
            name={item.key}
            key={item.key}
            rules={[
              {
                required: true,
                message: `请输入${item.name}`,
              },
            ]}
          >
            <Input
              placeholder={`请输入${item.name}`}
              maxLength={128}
              style={{ width: 200 }}
            />
          </Form.Item>
        );
        break;
      case "select":
      case "checkbox":
        return (
          <Form.Item
            label={item.name}
            name={item.key}
            key={item.key}
            rules={[
              {
                required: true,
                message: `请选择${item.name}`,
              },
            ]}
          >
            <Select
              mode={item.type === "select" ? null : "multiple"}
              placeholder={`请选择${item.name}`}
              style={{ width: 280 }}
            >
              {planType?.body[0][item.key].map((e) => {
                return (
                  <Select.Option key={e} value={e}>
                    {e}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
        );
        break;
      default:
        break;
    }
  };

  // 构建动态列
  const createColumn = () => {
    const resColumn = [
      {
        title: "序号",
        key: "num",
        dataIndex: "num",
        align: "center",
        ellipsis: true,
        width: 40,
        render: (text, record) => {
          return text;
        },
      },
      {
        title: "IP",
        key: "ip",
        dataIndex: "ip",
        align: "center",
        ellipsis: true,
        width: 160,
        render: (text, record) => {
          return text;
        },
      },
    ];

    for (let i = 0; i < twoHead.length; i++) {
      const element = twoHead[i];
      if (element.type === "disabled") continue;
      if (element.key === "ip") continue;
      if (element.type === "str") {
        resColumn.push({
          title: element.name,
          key: element.key,
          dataIndex: element.key,
          align: "center",
          width: 180,
          render: (text, record) => {
            return {
              children: (
                <Input
                  key={element.key}
                  // style={{ width: 80 }}
                  value={resultSet[record.ip][element.key]}
                  onChange={(e) => {
                    const newResultValue = { ...resultSet };
                    newResultValue[record.ip][element.key] = e.target.value;
                    setResultSet(newResultValue);
                  }}
                />
              ),
              props: {},
            };
          },
        });
      } else if (element.type === "checkbox" || element.type === "select") {
        resColumn.push({
          title: element.name,
          key: element.key,
          dataIndex: element.key,
          align: "center",
          render: (text, record) => {
            return {
              children: (
                <Select
                  value={resultSet[record.ip][element.key]}
                  mode={element.type === "select" ? null : "multiple"}
                  maxTagCount={element.type === "select" ? null : "responsive"}
                  allowClear
                  placeholder={`请选择${element.name}`}
                  style={{ width: 280 }}
                  onChange={(e) => {
                    const newResultValue = { ...resultSet };
                    newResultValue[record.ip][element.key] = e;
                    setResultSet(newResultValue);
                  }}
                >
                  {selectSet[record.ip][element.key].map((e) => {
                    return (
                      <Select.Option key={e} value={e}>
                        {e}
                      </Select.Option>
                    );
                  })}
                </Select>
              ),
              props: {},
            };
          },
        });
      } else {
        continue;
      }
    }
    return resColumn;
  };

  // 获取第二页面数据
  const getTwoData = (data) => {
    setModalLoading(true);
    fetchPost(apiRequest.utilitie.autoTestHost, {
      body: {
        body: [modalForm.getFieldsValue()],
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0) {
            setPlanInfo(
              res.data.body.map((e, idx) => {
                return { ...e, num: idx + 1 };
              })
            );

            // 渲染表头 key 和 type 映射
            const headMap = {};
            for (let i = 0; i < res.data.head.length; i++) {
              const element = res.data.head[i];
              headMap[element.key] = element.type;
            }

            // 渲染结果集、选择集
            const resSet = {};
            const selectSet = {};
            for (let i = 0; i < res.data.body.length; i++) {
              const element = res.data.body[i];
              resSet[element.ip] = {};
              selectSet[element.ip] = {};
              for (const key in element) {
                if (Object.hasOwnProperty.call(element, key)) {
                  const value = element[key];
                  if (headMap[key] !== "checkbox") {
                    resSet[element.ip][key] = value;
                  } else {
                    resSet[element.ip][key] = [];
                    selectSet[element.ip][key] = value;
                  }
                }
              }
            }
            setTwoHead(res.data.head);
            setSelectSet(selectSet);
            setResultSet(resSet);
            // 记录第一页数据
            setOneData(modalForm.getFieldsValue());

            setStepNum(1);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setModalLoading(false);
      });
  };

  const performTask = () => {
    const bodyTwoData = [];
    for (const key in resultSet) {
      if (Object.hasOwnProperty.call(resultSet, key)) {
        const element = resultSet[key];
        bodyTwoData.push(element);
      }
    }
    setModalLoading(true);
    fetchPost(apiRequest.utilitie.autoTest, {
      body: {
        body_1: [oneData],
        body_2: bodyTwoData,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          message.success("执行命令下发成功");
          history.push(
            `/utilitie/tool-management/tool-execution-results/${res.data}`
          );
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setModalLoading(false);
      });
  };

  return (
    <Modal
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <ScanOutlined />
          </span>
          <span>
            {stepNum == 0 && "选择服务器"}
            {stepNum == 1 && "选择测试参数"}
          </span>
        </span>
      }
      afterClose={() => {
        setStepNum(0);
      }}
      onCancel={() => {
        modalForm.resetFields();
        setModalVisibility(false);
      }}
      visible={modalVisibility}
      footer={null}
      zIndex={1000}
      width={1000}
      bodyStyle={{
        paddingLeft: 30,
        paddingRight: 30,
        marginTop: -10,
      }}
      destroyOnClose
    >
      <Steps
        type="navigation"
        size="small"
        current={stepNum}
        //onChange={this.onChange}
      >
        <Steps.Step title="选择服务器数量" />
        <Steps.Step title="选择测试计划" />
      </Steps>
      <Spin spinning={modalLoading}>
        {stepNum == 0 && (
          <div style={{ paddingLeft: 10, paddingTop: 30 }}>
            <div
              style={{
                overflow: "hidden",
                paddingBottom: 20,
              }}
            >
              <Form
                name="strategy"
                labelCol={{ span: 3 }}
                wrapperCol={{ span: 16 }}
                form={modalForm}
                onFinish={(data) => getTwoData(data)}
              >
                {planType?.head?.map((e) => renderOne(e, planType))}
                <Form.Item
                  wrapperCol={{ span: 24 }}
                  style={{ textAlign: "center", position: "relative", top: 10 }}
                >
                  <Button
                    style={{ marginRight: 16 }}
                    onClick={() => {
                      modalForm.resetFields();
                      setModalVisibility(false);
                    }}
                  >
                    取消
                  </Button>
                  <Button type="primary" htmlType="submit">
                    确认选择
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        )}
        {stepNum == 1 && (
          <div style={{ paddingLeft: 10, paddingTop: 30 }}>
            <div
              style={{
                overflow: "hidden",
                paddingBottom: 20,
              }}
            >
              <Table
                style={{
                  border: "1px solid #e3e3e3",
                }}
                pagination={false}
                dataSource={planInfo}
                columns={createColumn()}
                size="small"
                scroll={{ y: 200 }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 30,
                }}
              >
                <div
                  style={{
                    width: 170,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Button
                    onClick={() => {
                      setStepNum(0);
                    }}
                  >
                    上一步
                  </Button>
                  <Button
                    type="primary"
                    style={{ marginLeft: 16 }}
                    onClick={() => performTask()}
                  >
                    分发任务
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default AutoTestModal;
