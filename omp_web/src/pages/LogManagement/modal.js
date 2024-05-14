import { Form, Input, Select } from "antd";
import { FormOutlined } from "@ant-design/icons";
import { OmpModal } from "@/components";

const UpdateModal = ({
  row,
  visibleHandle,
  loading,
  setLoading,
  updateLogLevel,
  context,
}) => {
  const [modalForm] = Form.useForm();

  return (
    <OmpModal
      loading={loading}
      setLoading={setLoading}
      visibleHandle={visibleHandle}
      context={context}
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <FormOutlined />
          </span>
          <span>
            {context.edit +
              context.ln +
              context.log +
              context.ln +
              context.level}
          </span>
        </span>
      }
      form={modalForm}
      onFinish={(data) => updateLogLevel(data, row)}
      initialValues={{
        service_instance_name: row.service_instance_name,
        log_level: row.log_level,
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
        label={context.log + context.ln + context.level}
        name="log_level"
        key="log_level"
        rules={[
          {
            required: true,
            message: context.select + context.ln + context.level,
          },
        ]}
      >
        <Select placeholder={context.select + context.ln + context.level}>
          <Select.Option value="trace">TRACE</Select.Option>
          <Select.Option value="debug">DEBUG</Select.Option>
          <Select.Option value="info">INFO</Select.Option>
          <Select.Option value="warn">WARN</Select.Option>
          <Select.Option value="error">ERROR</Select.Option>
          <Select.Option value="fatal">FATAL</Select.Option>
        </Select>
      </Form.Item>
    </OmpModal>
  );
};

export default UpdateModal;
