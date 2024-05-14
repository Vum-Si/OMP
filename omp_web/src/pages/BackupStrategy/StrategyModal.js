import {
  Button,
  Modal,
  Input,
  Tooltip,
  Form,
  TimePicker,
  Spin,
  Switch,
  Select,
} from "antd";
import {
  PlusSquareOutlined,
  FormOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const msgMap = {
  "en-US": {
    openMsg:
      "After opening, backup tasks will be regularly executed according to regular rules",
  },
  "zh-CN": {
    openMsg: "开启后，将按照定时规则自动执行备份任务",
  },
};

export const AddStrategyModal = ({
  strategyModalType,
  addStrategy,
  updateStrategy,
  loading,
  modalForm,
  addModalVisibility,
  setAddModalVisibility,
  canBackupIns,
  strategyFormInit,
  keyArr,
  setKeyArr,
  weekData,
  frequency,
  setFrequency,
  appName,
  setAppName,
  noteText,
  setNoteText,
  customValue,
  setCustomValue,
  strategyForm,
  setNoteVisibility,
  context,
  locale,
}) => {
  return (
    <Modal
      style={{ marginTop: 10 }}
      width={660}
      onCancel={() => {
        setAddModalVisibility(false);
        setKeyArr([]);
        modalForm.setFieldsValue(strategyFormInit);
        setAppName(null);
        setNoteText(null);
        setCustomValue(null);
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
          wrapperCol={{ span: 16 }}
          form={modalForm}
          initialValues={strategyFormInit}
        >
          <Form.Item
            label={context.backup + context.ln + context.instance}
            name="backup_instances"
            key="backup_instances"
            rules={[
              {
                required: true,
                message: context.select + context.ln + context.instance,
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder={context.select + context.ln + context.instance}
              allowClear
              maxTagCount="responsive"
              onChange={(e) => {
                if (e.length === 1) {
                  const targetAppName = e[0].split("-")[0];
                  setAppName(targetAppName);
                  for (let i = 0; i < canBackupIns.length; i++) {
                    const element = canBackupIns[i];
                    if (element.app_name === targetAppName) {
                      setNoteText(element.note);
                      setCustomValue(element.backup_custom);
                      break;
                    }
                  }
                } else if (e.length === 0) {
                  setKeyArr([]);
                  strategyForm.setFieldsValue({
                    backup_custom: [],
                  });
                  setAppName(null);
                  setNoteText(null);
                  setCustomValue(null);
                }
              }}
            >
              {canBackupIns?.map((e) => {
                return e.backup_instances.map((c) => {
                  return (
                    <Select.Option
                      key={c}
                      value={c}
                      disabled={appName !== null && e.app_name !== appName}
                    >
                      {c}
                    </Select.Option>
                  );
                });
              })}
            </Select>
          </Form.Item>

          <Form.Item
            label={context.save + context.ln + context.path}
            key="retain_path"
            name="retain_path"
            rules={[
              {
                required: true,
                message: context.input + context.ln + context.path,
              },
              {
                validator: (rule, value, callback) => {
                  if (value) {
                    if (value.match(/^[ ]*$/)) {
                      return Promise.reject("请输入备份路径");
                    }
                    return Promise.resolve("success");
                  } else {
                    return Promise.resolve("success");
                  }
                },
              },
            ]}
          >
            <Input placeholder={context.input + context.ln + context.path} />
          </Form.Item>

          <Form.Item
            label={context.save + context.ln + context.time}
            name="retain_day"
            rules={[
              {
                required: true,
                message: context.select + context.ln + context.time,
              },
            ]}
          >
            <Select style={{ width: 100 }}>
              <Select.Option key={-1} value={-1}>
                {context.forever}
              </Select.Option>
              <Select.Option key={1} value={1}>
                1{context.day}
              </Select.Option>
              <Select.Option key={7} value={7}>
                7{context.days}
              </Select.Option>
              <Select.Option key={30} value={30}>
                30{context.days}
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label={context.open}>
            <Input.Group compact>
              <Form.Item name="is_on" noStyle valuePropName="checked">
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

          <Form.Item
            label={context.regular + context.ln + context.rule}
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
                  <Select style={{ width: 120 }}>
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

              <Form.Item
                name={["strategy", "time"]}
                style={{ display: "inline-block", marginLeft: "10px" }}
              >
                <TimePicker format={"HH:mm"} allowClear={false} />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item
            label={context.custom + context.ln + context.param}
            name="backup_custom"
            key="backup_custom"
          >
            <Select
              mode="multiple"
              placeholder={context.select + context.ln + context.parameter}
              allowClear
              maxTagCount="responsive"
              onChange={(e) => {
                setKeyArr(
                  e.map((i) => {
                    return i.label[0].props.children[1];
                  })
                );
              }}
              labelInValue
              disabled={customValue === null}
            >
              {customValue?.map((e) => {
                return (
                  <Select.Option
                    key={e.id}
                    value={e.id}
                    disabled={
                      keyArr.includes(e.field_k) &&
                      !modalForm
                        .getFieldValue("backup_custom")
                        ?.map((i) => i.key)
                        .includes(e.id)
                    }
                  >
                    <span
                      style={{
                        color: "#096dd9",
                        fontWeight: 600,
                        marginRight: 10,
                      }}
                    >
                      [{e.field_k}]
                    </span>
                    {e.field_v}
                  </Select.Option>
                );
              })}
            </Select>
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
                setAppName(null);
                setNoteText(null);
                setCustomValue(null);
              }}
            >
              {context.cancel}
            </Button>
            <Button
              type="primary"
              onClick={() => {
                if (noteText !== null) {
                  setNoteVisibility(true);
                } else {
                  if (strategyModalType === "add") {
                    addStrategy(strategyForm.getFieldsValue());
                  } else {
                    updateStrategy(strategyForm.getFieldsValue());
                  }
                }
              }}
            >
              {context.ok}
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};
