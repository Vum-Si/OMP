import { Form, Input, InputNumber, Switch, Tooltip } from "antd";
import { FormOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { OmpModal } from "@/components";

const msgMap = {
  "en-US": {
    openMsg:
      "After opening, clear strategy will be regularly executed according to check period",
  },
  "zh-CN": {
    openMsg: "开启后，将按照检查周期执行清理任务",
  },
};

const UpdateModal = ({
  row,
  visibleHandle,
  loading,
  setLoading,
  updateLogClear,
  context,
  locale,
}) => {
  const [modalForm] = Form.useForm();

  return (
    <OmpModal
      loading={loading}
      setLoading={setLoading}
      visibleHandle={visibleHandle}
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <FormOutlined />
          </span>
          <span>{context.edit + context.ln + context.strategy}</span>
        </span>
      }
      form={modalForm}
      onFinish={(data) => updateLogClear(data)}
      initialValues={{
        service_instance_name: row.service_instance_name,
        exec_dir: row.exec_dir,
        exec_type: row.exec_type,
        exec_rule: row.exec_rule,
        exec_value: row.exec_value,
        switch: row.switch === 1,
      }}
    >
      <Form.Item
        label={context.instance + context.ln + context.name}
        name="service_instance_name"
        key="service_instance_name"
      >
        <Input disabled />
      </Form.Item>

      <Form.Item
        label={context.execute + context.ln + context.path}
        name="exec_dir"
        key="exec_dir"
      >
        <Input disabled />
      </Form.Item>
      <Form.Item
        label={context.strategy + context.ln + context.type}
        name="exec_type"
        key="exec_type"
      >
        <Input disabled />
      </Form.Item>
      <Form.Item
        label={context.file + context.ln + context.rule}
        name="exec_rule"
        key="exec_rule"
        rules={[
          {
            required: true,
            message: context.input + context.ln + context.rule,
          },
        ]}
      >
        <Input
          maxLength={64}
          placeholder={context.input + context.ln + context.rule}
        />
      </Form.Item>
      <Form.Item
        label={context.strategy + context.ln + context.value}
        name="exec_value"
        key="exec_value"
        rules={[
          {
            required: true,
            message: context.input + context.ln + context.value,
          },
        ]}
      >
        <InputNumber
          addonAfter={row.exec_type === "byFileDay" ? context.day : "M"}
          style={{ width: 120 }}
        />
      </Form.Item>

      <Form.Item label={context.open}>
        <Input.Group compact>
          <Form.Item name="switch" noStyle valuePropName="checked">
            <Switch style={{ borderRadius: "10px" }} />
          </Form.Item>
          <Form.Item noStyle>
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
    </OmpModal>
  );
};

export default UpdateModal;
