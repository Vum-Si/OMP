import { Button, Modal, Input, Table, Tooltip, Form, Spin } from "antd";
import { useEffect, useState } from "react";
import {
  CopyOutlined,
  SearchOutlined,
  PlusSquareOutlined,
  FormOutlined,
} from "@ant-design/icons";

// 添加自定义参数
export const AddCustomModal = ({
  customModalType,
  addCustom,
  loading,
  modalForm,
  addModalVisibility,
  setAddModalVisibility,
  updateCustomInfo,
  setUpdateCustomData,
  context,
}) => {
  return (
    <Modal
      width={580}
      onCancel={() => {
        setAddModalVisibility(false);
        setUpdateCustomData({});
        modalForm.setFieldsValue({ field_k: "", field_v: "", notes: "" });
      }}
      visible={addModalVisibility}
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            {customModalType === "add" ? (
              <PlusSquareOutlined />
            ) : (
              <FormOutlined />
            )}
          </span>
          <span>
            {customModalType === "add"
              ? context.add +
                context.ln +
                context.custom +
                context.ln +
                context.param
              : context.edit +
                context.ln +
                context.custom +
                context.ln +
                context.param}
          </span>
        </span>
      }
      zIndex={1004}
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Form
          name="custom"
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 16 }}
          onFinish={(data) => {
            if (customModalType === "add") {
              addCustom(data);
            } else {
              updateCustomInfo(data);
            }
          }}
          form={modalForm}
          initialValues={{
            field_k: "",
            field_v: "",
            notes: "",
          }}
        >
          <Form.Item
            label={context.param + context.ln + context.name}
            name="field_k"
            key="field_k"
            rules={[
              {
                required: true,
                message: context.input + context.ln + context.name,
              },
            ]}
          >
            <Input
              placeholder={context.input + context.ln + context.name}
              disabled={customModalType === "update"}
              maxLength={64}
            />
          </Form.Item>

          <Form.Item
            label={context.param + context.ln + context.value}
            name="field_v"
            key="field_v"
            rules={[
              {
                required: true,
                message: context.param + context.ln + context.value,
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              style={{ width: 480 }}
              placeholder={context.param + context.ln + context.value}
              maxLength={256}
            />
          </Form.Item>

          <Form.Item label={context.notes} name="notes" key="notes">
            <Input
              placeholder={context.input + context.ln + context.notes}
              maxLength={32}
            />
          </Form.Item>

          <Form.Item
            wrapperCol={{ span: 24 }}
            style={{ textAlign: "center", position: "relative", top: 10 }}
          >
            <Button
              style={{ marginRight: 16 }}
              onClick={() => {
                setAddModalVisibility(false);
                setUpdateCustomData({});
                modalForm.setFieldsValue({
                  field_k: "",
                  field_v: "",
                  notes: "",
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

// 定义参数
export const CustomModal = ({
  modalVisibility,
  setModalVisibility,
  modalLoading,
  customData,
  setCustomData,
  initData,
  setCustomModalType,
  setAddModalVisibility,
  deleteCustomInfo,
  modalForm,
  setRow,
  context,
}) => {
  const [searchName, setSearchName] = useState("");

  const columns = [
    {
      title: context.row,
      key: "_idx",
      dataIndex: "_idx",
      align: "center",
      ellipsis: true,
      width: 40,
    },
    {
      title: context.name,
      key: "field_k",
      dataIndex: "field_k",
      align: "center",
      ellipsis: true,
      width: 80,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.value,
      key: "field_v",
      dataIndex: "field_v",
      align: "center",
      ellipsis: true,
      width: 120,
    },
    {
      title: context.notes,
      key: "notes",
      dataIndex: "notes",
      align: "center",
      ellipsis: true,
      width: 140,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.action,
      width: 60,
      key: "",
      dataIndex: "",
      align: "center",
      render: (text, record) => {
        return (
          <div
            onClick={() => setRow(record)}
            style={{ display: "flex", justifyContent: "space-around" }}
          >
            <div style={{ margin: "auto" }}>
              <a
                onClick={() => {
                  setCustomModalType("update");
                  setAddModalVisibility(true);
                  modalForm.setFieldsValue({
                    field_k: record.field_k,
                    field_v: record.field_v,
                    notes: record.notes,
                  });
                }}
              >
                {context.edit}
              </a>

              <a
                style={{ marginLeft: 10 }}
                onClick={() => deleteCustomInfo(record.id)}
              >
                {context.delete}
              </a>
            </div>
          </div>
        );
      },
    },
  ];

  useEffect(() => {}, []);

  return (
    <Modal
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <CopyOutlined />
          </span>
          <span>{context.custom + context.ln + context.parameter}</span>
        </span>
      }
      width={860}
      onCancel={() => setModalVisibility(false)}
      visible={modalVisibility}
      footer={null}
      bodyStyle={{
        paddingLeft: 30,
        paddingRight: 30,
        marginTop: -10,
      }}
      destroyOnClose
      zIndex={1002}
    >
      <Spin spinning={modalLoading}>
        <div
          style={{
            display: "flex",
            marginBottom: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <Input
              placeholder={context.input + context.ln + context.name}
              suffix={<SearchOutlined style={{ color: "#b6b6b6" }} />}
              style={{ width: 220 }}
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                if (e.target.value === "") {
                  setCustomData(initData);
                }
              }}
              onPressEnter={() => {
                setCustomData(
                  initData.filter((i) => i.field_k.includes(searchName))
                );
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flex: 1,
              textAlign: "right",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "100%",
                justifyContent: "flex-end",
              }}
            >
              <Button
                type="primary"
                onClick={() => {
                  setCustomModalType("add");
                  setAddModalVisibility(true);
                }}
              >
                {context.add + context.ln + context.param}
              </Button>
            </div>
          </div>
        </div>
        <div>
          <div style={{ border: "1px solid rgb(235, 238, 242)" }}>
            <Table
              size="small"
              scroll={{ y: 270 }}
              columns={columns}
              dataSource={customData}
              rowKey={(record) => {
                return record.id;
              }}
              pagination={false}
            />
          </div>
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 20 }}
          >
            <Button onClick={() => setModalVisibility(false)}>
              {context.back}
            </Button>
          </div>
        </div>
      </Spin>
    </Modal>
  );
};
