import { Collapse, Form, Input, Tooltip, Spin } from "antd";
import { CaretRightOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useEffect } from "react";
import { useSelector } from "react-redux";

const { Panel } = Collapse;

const msgMap = {
  "en-US": {
    dataFolderMsg: "Data Folder: data folder when adding hosts",
  },
  "zh-CN": {
    dataFolderMsg: "数据分区：添加主机时设置的数据分区",
  },
};

const ServiceConfigItem = ({ form, loading, ip, idx, context, locale }) => {
  let data = useSelector((state) => state.installation.step3Data)[ip][idx];
  let portData = data.ports || [];
  let installArgsData = data.install_args || [];
  const renderData = [...installArgsData, ...portData];
  const errInfo = useSelector((state) => state.installation.step3ErrorData);

  useEffect(() => {
    // 设置默认值
    // form.setFieldsValue({
    //   [`${data.name}=instance_name`]: data.instance_name,
    // });
    renderData.map((i) => {
      form.setFieldsValue({
        [`${data.name}=${i.key}`]: i.default,
      });
    });
  }, [data]);

  useEffect(() => {
    if (errInfo[ip] && errInfo[ip][data.name]) {
      for (const key in errInfo[ip][data.name]) {
        if (errInfo[ip][data.name][key]) {
          form.setFields([
            {
              name: `${data.name}=${key}`,
              errors: [errInfo[ip][data.name][key]],
            },
          ]);
        }
      }
    }
    return () => {
      form.resetFields();
    };
  }, [errInfo[ip]]);

  return (
    <div style={{ padding: 10 }}>
      <Spin spinning={loading}>
        <Collapse
          bordered={false}
          defaultActiveKey={["1"]}
          expandIcon={({ isActive }) => (
            <CaretRightOutlined rotate={isActive ? 90 : 0} />
          )}
        >
          <Panel
            header={data.name}
            key="1"
            className={"panelItem"}
            style={{ backgroundColor: "#f6f6f6" }}
          >
            {renderData.map((item) => {
              return (
                <Form.Item
                  key={item.key}
                  label={locale === "zh-CN" ? item?.name : item?.key}
                  name={`${data.name}=${item?.key}`}
                  style={{ marginTop: 10, width: 600 }}
                  rules={[
                    {
                      required: item.key !== "vip",
                      message: context.input + context.ln + item.name,
                    },
                  ]}
                >
                  <Input
                    disabled={!item.editable}
                    addonBefore={
                      item.dir_key ? (
                        <span style={{ color: "#b1b1b1" }}>
                          / {context.dataFolder}
                        </span>
                      ) : null
                    }
                    placeholder={context.input + context.ln + context.directory}
                    suffix={
                      item.dir_key ? (
                        <Tooltip title={msgMap[locale].dataFolderMsg}>
                          <InfoCircleOutlined
                            style={{ color: "rgba(0,0,0,.45)" }}
                          />
                        </Tooltip>
                      ) : null
                    }
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

export default ServiceConfigItem;
