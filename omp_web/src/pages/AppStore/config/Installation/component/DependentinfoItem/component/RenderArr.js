import { Select, Form, Input } from "antd";
import { useEffect, useState } from "react";
import { randomNumber } from "@/utils/utils";

const RenderArr = ({ data, form, context }) => {
  const [deployValue, setDeployValue] = useState(data.deploy_mode[0]?.key);

  useEffect(() => {
    form.setFieldsValue({
      [`${data.name}=num`]: deployValue,
    });
    if (deployValue == "master-slave" || deployValue == "master-master") {
      form.setFieldsValue({
        [`${data.name}=name`]: `${data.name}-cluster-${randomNumber(7)}`,
      });
    }
  }, [deployValue]);
  return (
    <>
      <div style={{ flex: 3 }}>
        <Form.Item
          label={context.deployNum}
          name={`${data.name}=num`}
          style={{ marginBottom: 0, width: 100 }}
        >
          <Select
            onChange={(e) => {
              setDeployValue(e);
            }}
          >
            {data.deploy_mode.map((item) => {
              return (
                <Select.Option key={item.key} value={item.key}>
                  {item.name}
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>
      </div>
      <div
        style={{ flex: 3, display: "flex", justifyContent: "space-between" }}
      >
        {(deployValue == "master-slave" || deployValue == "master-master") && (
          <Form.Item
            label={context.cluster + context.ln + context.name}
            name={`${data.name}=name`}
            style={{ marginBottom: 0, width: 240 }}
            rules={[
              {
                required: true,
                message:
                  context.input +
                  context.ln +
                  context.cluster +
                  context.ln +
                  context.name,
              },
            ]}
          >
            <Input
              placeholder={
                context.input +
                context.ln +
                context.cluster +
                context.ln +
                context.name
              }
            />
          </Form.Item>
        )}
      </div>
      <div
        style={{ flex: 2, display: "flex", justifyContent: "space-between" }}
      >
        {deployValue == "master-master" && (
          <Form.Item
            label="vip"
            name={`${data.name}=vip`}
            style={{ marginBottom: 0, width: 180 }}
            rules={[
              {
                required: true,
                message: context.input + context.ln + "vip",
              },
            ]}
          >
            <Input placeholder={context.input + context.ln + "vip"} />
          </Form.Item>
        )}
      </div>
    </>
  );
};

export default RenderArr;
