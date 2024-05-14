import { Button, Form, Collapse, Input, Spin, message } from "antd";
import { useEffect, useState } from "react";
import { CaretRightOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse } from "@/utils/utils";

const { Panel } = Collapse;

const ClusterItem = ({ form, itemData, loading, context }) => {
  let renderData = itemData.install_args || [];

  useEffect(() => {
    renderData.map((i) => {
      form.setFieldsValue({
        [`${itemData.app_name}=${i.key}`]: i.default,
      });
    });
  }, []);

  return (
    <div style={{ padding: 10, paddingTop: 0 }}>
      <Spin spinning={loading}>
        <Collapse
          bordered={false}
          defaultActiveKey={["1"]}
          expandIcon={({ isActive }) => (
            <CaretRightOutlined rotate={isActive ? 90 : 0} />
          )}
        >
          <Panel
            header={itemData.app_name}
            key="1"
            className={"panelItem"}
            style={{ backgroundColor: "#f6f6f6" }}
          >
            {renderData.map((item) => {
              return (
                <Form.Item
                  key={item.key}
                  label={item?.name}
                  name={`${itemData.app_name}=${item?.key}`}
                  style={{ marginTop: 10, width: 600 }}
                  rules={[
                    {
                      required: true,
                      message: context.input + context.ln + item.name,
                    },
                  ]}
                >
                  <Input
                    disabled={!item.editable}
                    placeholder={context.input + context.ln + item.name}
                  />
                </Form.Item>
              );
            })}
          </Panel>
        </Collapse>
      </Spin>
    </div>
  );
};

const Step3 = ({ setStepNum, context }) => {
  const dispatch = useDispatch();
  const clusterData = useSelector((state) => state.installation.clusterData);
  const [clusterConfigForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const uniqueKey = useSelector((state) => state.appStore.uniqueKey);
  const viewHeight = useSelector((state) => state.layouts.viewSize.height);

  const getCurrentClusterData = () => {
    return clusterData.map((item) => {
      return {
        app_name: item.app_name,
        install_args: item.install_args.map((i) => {
          return {
            ...i,
            default: clusterConfigForm.getFieldValue(
              `${item.app_name}=${i.key}`
            ),
          };
        }),
      };
    });
  };

  // 发送集群配置信息数据
  const sendClusterData = () => {
    setLoading(true);
    fetchPost(apiRequest.appStore.installCluster, {
      body: {
        unique_key: uniqueKey,
        data: getCurrentClusterData(),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.message === "success") {
            setStepNum(3);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div>
      <div
        style={{
          marginTop: 15,
          paddingTop: 10,
          backgroundColor: "#fff",
        }}
      >
        <div style={{ height: viewHeight - 270, overflowY: "auto" }}>
          <Form
            form={clusterConfigForm}
            name="cluster"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 40 }}
          >
            {clusterData?.map((item) => {
              return (
                <ClusterItem
                  key={item.app_name}
                  form={clusterConfigForm}
                  itemData={item}
                  loading={loading}
                  context={context}
                />
              );
            })}
          </Form>
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          backgroundColor: "#fff",
          width: "calc(100% - 230px)",
          bottom: 10,
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
          <Button type="primary" onClick={() => setStepNum(1)}>
            {context.previous}
          </Button>
          <Button
            style={{ marginLeft: 10 }}
            type="primary"
            loading={loading}
            onClick={() => {
              clusterConfigForm.validateFields().then(
                (e) => {
                  sendClusterData();
                },
                (e) => {
                  message.warn("校验未通过，请检查");
                }
              );
            }}
          >
            {context.next}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step3;
