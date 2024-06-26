import { Select, Form, Checkbox } from "antd";
import { useEffect, useState } from "react";
import RenderArr from "./RenderArr";
import RenderNum from "./RenderNum";

const DeployInstanceRow = ({ data, form, context }) => {
  const [check, setCheck] = useState(true);

  useEffect(() => {
    if (check) {
      form.setFieldsValue({
        [`${data.name}`]: JSON.stringify({
          name: data.exist_instance[0]?.name,
          id: data.exist_instance[0]?.id,
          type: data.exist_instance[0]?.type,
        }),
      });
    }
  }, [check]);

  return (
    <>
      <div style={{ flex: 1 }}>{data.name}</div>
      <div style={{ flex: 1 }}>{data.version}</div>
      {check ? (
        <>
          <div style={{ flex: 3 }}>
            <Form.Item
              label={context.select + context.ln + context.instance}
              name={`${data.name}`}
              style={{ marginBottom: 0, width: 180 }}
            >
              <Select>
                {data.exist_instance.map((item) => (
                  <Select.Option
                    key={item.name}
                    value={JSON.stringify({
                      name: item.name,
                      id: item.id,
                      type: item.type,
                    })}
                  >
                    {item.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <div
            style={{
              flex: 5,
              display: "flex",
              justifyContent: "space-between",
            }}
          ></div>
        </>
      ) : Array.isArray(data.deploy_mode) ? (
        <RenderArr data={data} form={form} context={context} />
      ) : (
        <RenderNum data={data} form={form} context={context} />
      )}

      <div
        style={{ flex: 2, display: "flex", justifyContent: "space-between" }}
      >
        <div />
        <div
          style={{
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            flexDirection: "row-reverse",
            paddingRight: 70,
          }}
        >
          <Checkbox
            checked={check}
            onChange={(e) => setCheck(e.target.checked)}
            disabled={data.error_msg?.includes("安装包不存在") || false}
          >
            {context.reuse}
          </Checkbox>
        </div>
      </div>
    </>
  );
};

export default DeployInstanceRow;
