import { Button, Modal, Form, InputNumber, Spin, Switch, Select } from "antd";
import { PlusSquareOutlined, FormOutlined } from "@ant-design/icons";

export const AddStrategyModal = ({
  strategyModalType,
  addStrategy,
  updateStrategy,
  loading,
  modalForm,
  addModalVisibility,
  setAddModalVisibility,
  canHealingIns,
  strategyFormInit,
  keyArr,
  setKeyArr,
  context,
}) => {
  return (
    <Modal
      style={{ marginTop: 10 }}
      width={600}
      onCancel={() => {
        setAddModalVisibility(false);
        setKeyArr([]);
        modalForm.setFieldsValue(strategyFormInit);
      }}
      visible={addModalVisibility}
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            {strategyModalType === "add" ? (
              <PlusSquareOutlined />
            ) : (
              <FormOutlined />
            )}
          </span>
          <span>
            {strategyModalType === "add"
              ? context.add + context.ln + context.strategy
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
          name="strategy"
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 17 }}
          onFinish={(data) => {
            if (strategyModalType === "add") {
              addStrategy(data);
            } else {
              updateStrategy(data);
            }
          }}
          form={modalForm}
          initialValues={strategyFormInit}
        >
          <Form.Item
            label={context.repair + context.ln + context.mode}
            name="repair_instance"
            key="repair_instance"
            rules={[
              {
                required: true,
                message:
                  context.select +
                  context.ln +
                  context.repair +
                  context.ln +
                  context.mode,
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder={
                context.select +
                context.ln +
                context.repair +
                context.ln +
                context.mode
              }
              allowClear
              maxTagCount="responsive"
            >
              <Select.Option key="host" value="host">
                {context.monitorAgent}
              </Select.Option>
              <Select.Option key="component" value="component">
                {context.all + context.ln + context.component}
              </Select.Option>
              <Select.Option key="service" value="service">
                {context.all + context.ln + context.selfService}
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label={context.scan + context.ln + context.period}
            name="fresh_rate"
            key="fresh_rate"
            rules={[
              {
                required: true,
                message:
                  context.input +
                  context.ln +
                  context.scan +
                  context.ln +
                  context.period,
              },
            ]}
          >
            <InputNumber
              min={1}
              max={60}
              style={{ width: 140 }}
              addonAfter="min"
            />
          </Form.Item>

          <Form.Item
            label={context.repair + context.ln + context.type}
            name="instance_tp"
            key="instance_tp"
            rules={[
              {
                required: true,
                message:
                  context.select +
                  context.ln +
                  context.repair +
                  context.ln +
                  context.type,
              },
            ]}
          >
            <Select style={{ width: 140 }}>
              <Select.Option key="start" value={0}>
                {context.start}
              </Select.Option>
              <Select.Option key="restart" value={1}>
                {context.restart}
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={context.retry + context.ln + context.count}
            name="max_healing_count"
            key="max_healing_count"
            rules={[
              {
                required: true,
                message:
                  context.input +
                  context.ln +
                  context.retry +
                  context.ln +
                  context.count,
              },
            ]}
          >
            <InputNumber
              min={1}
              max={20}
              style={{ width: 140 }}
              addonAfter={context.ci}
            />
          </Form.Item>

          <Form.Item label={context.open}>
            <Form.Item name="used" noStyle valuePropName="checked">
              <Switch style={{ borderRadius: "10px" }} />
            </Form.Item>
          </Form.Item>

          <Form.Item
            wrapperCol={{ span: 24 }}
            style={{ textAlign: "center", position: "relative", top: 10 }}
          >
            <Button
              style={{ marginRight: 16 }}
              onClick={() => {
                setAddModalVisibility(false);
                setKeyArr([]);
                modalForm.setFieldsValue(strategyFormInit);
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
