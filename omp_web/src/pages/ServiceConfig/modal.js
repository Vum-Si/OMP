import {
  Button,
  Modal,
  Form,
  Input,
  Spin,
  Select,
  message,
  Cascader,
} from "antd";
import { FormOutlined } from "@ant-design/icons";
import { useState } from "react";

const msgMap = {
  "en-US": {
    uniqueMsg: "must be unique!",
    childMsg: "Support subfield modification, such as:",
  },
  "zh-CN": {
    uniqueMsg: "必须唯一!",
    childMsg: "支持子字段修改，如: ",
  },
};
// 编辑配置项
export const EditConfigModal = ({
  loading,
  editConfigField,
  setEditConfigField,
  modalVisibility,
  setModalVisibility,
  fieldValue,
  editConfig,
  postRsa,
  confForm,
  context,
  locale,
}) => {
  return (
    <Modal
      style={{ marginTop: 10 }}
      width={600}
      onCancel={() => {
        setModalVisibility(false);
        setEditConfigField([]);
        confForm.setFieldsValue({
          ser_field: [],
          char: "",
        });
      }}
      visible={modalVisibility}
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <FormOutlined />
          </span>
          <span>{context.edit + context.ln + context.config}</span>
        </span>
      }
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Form
          name="editConfig"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
          onFinish={(data) => {
            if (data.ser_field.length > 1) {
              message.info(
                context.configName + context.ln + msgMap[locale].uniqueMsg
              );
            } else {
              editConfig(data);
            }
          }}
          form={confForm}
        >
          <Form.Item
            label={context.configName}
            name="ser_field"
            key="ser_field"
            rules={[
              {
                required: true,
                message: context.select + context.ln + context.configName,
              },
            ]}
            extra={
              <span style={{ fontSize: 10 }}>
                {msgMap[locale].childMsg}
                <strong>install_detail_args.memory</strong>
              </span>
            }
          >
            <Select
              mode="multiple"
              placeholder={context.select + context.ln + context.configName}
              maxTagCount="responsive"
              style={{ width: 280 }}
              value={editConfigField}
              onChange={(e) => setEditConfigField(e)}
            >
              {fieldValue?.map((e) => {
                return (
                  <Select.Option
                    key={e}
                    value={e}
                    disabled={
                      editConfigField.length > 0 && !editConfigField.includes(e)
                    }
                  >
                    {e}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item
            label={context.configValue}
            name="char"
            key="char"
            extra={
              <span style={{ fontSize: 10 }}>
                <a onClick={() => postRsa("public")}>{context.encrypt}</a>

                <a
                  style={{ marginLeft: 10 }}
                  onClick={() => postRsa("private")}
                >
                  {context.decrypt}
                </a>
              </span>
            }
          >
            <Input.TextArea
              rows={4}
              style={{ width: 480 }}
              placeholder={context.input + context.ln + context.configValue}
              maxLength={256}
            />
          </Form.Item>

          <Form.Item
            wrapperCol={{ span: 24 }}
            style={{ textAlign: "center", position: "relative", top: 10 }}
          >
            <Button
              style={{ marginRight: 16 }}
              onClick={() => {
                setModalVisibility(false);
                setEditConfigField([]);
                confForm.setFieldsValue({
                  ser_field: [],
                  char: "",
                });
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

// 编辑依赖
export const EditDepModal = ({
  loading,
  modalVisibility,
  setModalVisibility,
  editDepConfig,
  action,
  depDataSource,
  depForm,
  depArr,
  setDepArr,
  realLabelValue,
  context,
}) => {
  const titleMap = {
    add: context.add + context.ln + context.dependence,
    edit: context.edit + context.ln + context.dependence,
    del: context.delete + context.ln + context.dependence,
  };
  const depFormInit = {
    configType: realLabelValue === "pkg" ? "pkg_name" : "instance_name",
    char: [],
  };

  const [depType, setDepType] = useState("instance_name");

  const instanceOpt = depDataSource
    .filter((e) => e.app_type === "instance_name")
    .map((e) => {
      const res = {
        value: e.name,
        label: e.name,
        children: e.char.map((i) => {
          return {
            value: i,
            label: i,
          };
        }),
      };
      if (action === "del") {
        res["disabled"] = depArr.length !== 0 && depArr[0][0] !== e.name;
      }
      return res;
    });

  const clusterOpt = depDataSource
    .filter((e) => e.app_type === "cluster_name")
    .map((e) => {
      const res = {
        value: e.name,
        label: e.name,
        children: e.char.map((i) => {
          return {
            value: i,
            label: i,
          };
        }),
      };
      if (action === "del") {
        res["disabled"] = depArr.length !== 0 && depArr[0][0] !== e.name;
      }
      return res;
    });

  const pkgOpt = depDataSource
    .filter((e) => e.app_type === "")
    .map((e) => {
      const res = {
        value: e.name,
        label: e.name,
        children: e.char.map((i) => {
          return {
            value: i,
            label: i,
          };
        }),
      };
      if (action === "del") {
        res["disabled"] = depArr.length !== 0 && depArr[0][0] !== e.name;
      }
      return res;
    });

  return (
    <Modal
      style={{ marginTop: 10 }}
      width={600}
      onCancel={() => {
        setModalVisibility(false);
        setDepArr([]);
        depForm.setFieldsValue(depFormInit);
      }}
      visible={modalVisibility}
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <FormOutlined />
          </span>
          <span>{titleMap[action] || context.dependence}</span>
        </span>
      }
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Form
          name="editDep"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
          onFinish={(data) => editDepConfig(action, data)}
          form={depForm}
          initialValues={depFormInit}
        >
          {realLabelValue === "pkg" ? (
            // -- 安装包依赖 --
            <>
              <Form.Item
                label={context.type}
                name="configType"
                key="configType"
              >
                <Select
                  style={{ width: 180 }}
                  onChange={(e) => {
                    setDepType(e);
                    setDepArr([]);
                    depForm.setFieldsValue({
                      char: [],
                    });
                  }}
                >
                  <Select.Option value="pkg_name">
                    {context.package}
                  </Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={context.package}
                name="char"
                key="char"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.package,
                  },
                ]}
              >
                <Cascader
                  style={{ width: 320 }}
                  options={pkgOpt}
                  multiple={action === "del"}
                  maxTagCount="responsive"
                  onChange={(value) => setDepArr(value)}
                  placeholder={context.select + context.ln + context.package}
                />
              </Form.Item>
            </>
          ) : (
            // -- 服务实例依赖 --
            <>
              <Form.Item
                label={context.type}
                name="configType"
                key="configType"
              >
                <Select
                  style={{ width: 180 }}
                  onChange={(e) => {
                    setDepType(e);
                    setDepArr([]);
                    depForm.setFieldsValue({
                      char: [],
                    });
                  }}
                >
                  <Select.Option value="instance_name">
                    {context.single}
                  </Select.Option>
                  <Select.Option value="cluster_name">
                    {context.cluster}
                  </Select.Option>
                </Select>
              </Form.Item>

              {depType === "instance_name" ? (
                <Form.Item
                  label={context.instance}
                  name="char"
                  key="char"
                  rules={[
                    {
                      required: true,
                      message: context.select + context.ln + context.instance,
                    },
                  ]}
                >
                  <Cascader
                    style={{ width: 320 }}
                    options={instanceOpt}
                    multiple={action === "del"}
                    maxTagCount="responsive"
                    onChange={(value) => setDepArr(value)}
                    placeholder={context.select + context.ln + context.instance}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  label={context.cluster}
                  name="char"
                  key="char"
                  rules={[
                    {
                      required: true,
                      message: context.select + context.ln + context.cluster,
                    },
                  ]}
                >
                  <Cascader
                    style={{ width: 320 }}
                    options={clusterOpt}
                    multiple={action === "del"}
                    maxTagCount="responsive"
                    onChange={(value) => setDepArr(value)}
                    placeholder={context.select + context.ln + context.cluster}
                  />
                </Form.Item>
              )}
            </>
          )}

          <Form.Item
            wrapperCol={{ span: 24 }}
            style={{ textAlign: "center", position: "relative", top: 10 }}
          >
            <Button
              style={{ marginRight: 16 }}
              onClick={() => {
                setModalVisibility(false);
                setDepArr([]);
                depForm.setFieldsValue(depFormInit);
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
