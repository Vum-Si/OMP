import React from "react";
import { OmpModal } from "@/components";
import {
  Button,
  Input,
  Select,
  Form,
  message,
  InputNumber,
  Row,
  Col,
  Tooltip,
  Modal,
  Steps,
  Upload,
  Switch,
} from "antd";
import {
  PlusSquareOutlined,
  FormOutlined,
  InfoCircleOutlined,
  ImportOutlined,
  DownloadOutlined,
  CloudUploadOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";
import {
  isChineseChar,
  isNumberChar,
  isValidIpChar,
  isExpression,
  isLetterChar,
  isSpace,
  handleResponse,
} from "@/utils/utils";
import { fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { useState, useRef } from "react";
import star from "./asterisk.svg";
import XLSX from "xlsx";
import { OmpTable } from "@/components";

const msgMap = {
  "en-US": {
    dataFolderMsg: "Please ensure sufficient disk space",
    usernameMsg: (
      <span style={{ fontSize: 10 }}>
        When using a
        <strong
          style={{
            fontWeight: 700,
            color: "#595959",
            margin: "0 2px 0 2px",
          }}
        >
          user without sudo
        </strong>
        , please click
        <a
          style={{
            fontWeight: 700,
            margin: "0 2px 0 2px",
          }}
          onClick={() => {
            let a = document.createElement("a");
            a.href = apiRequest.machineManagement.downInitScript;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
        >
          here
        </a>
        to download the init host script and execute it
      </span>
    ),
    userMsg: "After adding, users cannot modify it",
    uploadMsg: "Click or drag the file here to upload",
    verifyFiled: "Data verification failed",
    verifyPassd: "Data verification passed",
    pleaseEdit: "Please modify the template and upload again",
    addSuccess: "Successfully added host",
    addTotalLeft: "Add a total of",
    addTotalRight: "hosts",
    invalidMsg: "Data is invalid",
    existsMsg: "Already exists",
    lengthMsg: "Length from 4 to 64",
    fileTureMsg: "File parsing succeed",
    fileFalseMsg: "File parsing failed",
    fileSizeMsg: "File size must be less than 10M",
    fileFormatMsg: "File format must be xlsx",
    fileNoDataMsg:
      "There is no valid data in the file parsing result. Please check the file content",
  },
  "zh-CN": {
    dataFolderMsg: "请确保磁盘空间充足",
    usernameMsg: (
      <span style={{ fontSize: 10 }}>
        使用
        <strong
          style={{
            fontWeight: 700,
            color: "#595959",
            margin: "0 1px 0 1px",
          }}
        >
          无sudo权限普通用户
        </strong>
        时，请点击
        <a
          style={{
            fontWeight: 700,
            margin: "0 1px 0 1px",
          }}
          onClick={() => {
            let a = document.createElement("a");
            a.href = apiRequest.machineManagement.downInitScript;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
        >
          这里
        </a>
        下载主机初始化脚本，并手动执行
      </span>
    ),
    userMsg: "添加主机后用户不可修改",
    uploadMsg: "点击或将文件拖拽到这里上传",
    verifyFiled: "数据校验失败",
    verifyPassd: "数据校验通过",
    pleaseEdit: "请修改模板后重新上传",
    addSuccess: "添加主机成功",
    addTotalLeft: "添加共计",
    addTotalRight: "台主机",
    invalidMsg: "数据非法",
    existsMsg: "已存在",
    lengthMsg: "长度 4 ～ 64",
    fileTureMsg: "文件解析成功",
    fileFalseMsg: "文件解析失败",
    fileSizeMsg: "文件大小必须小于10M",
    fileFormatMsg: "文件格式必须为xlsx",
    fileNoDataMsg: "文件解析结果中无有效数据，请检查文件内容",
  },
};

// 添加主机 modal
export const AddMachineModal = ({
  loading,
  visibleHandle,
  createHost,
  setLoading,
  context,
  locale,
}) => {
  const [modalForm] = Form.useForm();
  const [modalLoading, setmodalLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const timer = useRef(null);
  const timer2 = useRef(null);
  return (
    <OmpModal
      loading={modalLoading ? modalLoading : loading}
      setLoading={setLoading}
      visibleHandle={visibleHandle}
      okBtnText={
        modalLoading ? context.verifying : loading ? context.creating : null
      }
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <PlusSquareOutlined />
          </span>
          <span>{context.add + context.ln + context.host}</span>
        </span>
      }
      form={modalForm}
      context={context}
      onFinish={(data) => {
        createHost(data);
        //onFinish("post", data);
      }}
      initialValues={{
        data_folder: "/data",
        port: 22,
        operate_system: "CentOS",
        username: "root",
        use_ntpd: false,
      }}
    >
      <div
        style={{
          transition: "all .2s ease-in",
          position: "relative",
        }}
      >
        <Form.Item
          label={context.instanceName}
          name="instance_name"
          key="instance_name"
          rules={[
            {
              required: true,
              message: context.input + context.ln + context.instanceName,
            },
            {
              validator: (rule, value, callback) => {
                if (!value) {
                  return Promise.resolve("success");
                }
                // 校验开头
                let startChar = value.slice(0, 1);
                if (
                  isNumberChar(startChar) ||
                  isLetterChar(startChar) ||
                  startChar == "-"
                ) {
                  if (!isExpression(value)) {
                    if (isChineseChar(value)) {
                      return Promise.reject(msgMap[locale].invalidMsg);
                    } else {
                      if (value.length > 16) {
                        return Promise.resolve("success");
                      } else {
                        if (isSpace(value)) {
                          return Promise.reject(msgMap[locale].invalidMsg);
                        }
                        return new Promise((resolve, rej) => {
                          if (timer.current) {
                            clearTimeout(timer.current);
                          }
                          timer.current = setTimeout(() => {
                            setmodalLoading(true);
                            fetchPost(apiRequest.machineManagement.checkHost, {
                              body: {
                                instance_name: value,
                              },
                            })
                              .then((res) => {
                                if (res && res.data) {
                                  if (res.data.data) {
                                    resolve("success");
                                  } else {
                                    rej(msgMap[locale].existsMsg);
                                  }
                                }
                              })
                              .catch((e) => console.log(e))
                              .finally(() => {
                                setmodalLoading(false);
                              });
                          }, 400);
                        });
                      }
                    }
                  } else {
                    return Promise.reject(msgMap[locale].invalidMsg);
                  }
                } else {
                  return Promise.reject(msgMap[locale].invalidMsg);
                }
              },
            },
          ]}
        >
          <Input
            maxLength={16}
            placeholder={context.input + context.ln + context.instanceName}
          />
        </Form.Item>

        <Form.Item
          label={context.system}
          name="operate_system"
          key="operate_system"
          rules={[
            {
              required: true,
              message: context.select + context.ln + context.system,
            },
          ]}
        >
          <Select placeholder={context.select + context.ln + context.system}>
            <Select.Option value="CentOS">CentOS</Select.Option>
            <Select.Option value="RedHat">RedHat</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={context.dataFolder}
          name="data_folder"
          key="data_folder"
          extra={
            <span style={{ fontSize: 10 }}>{msgMap[locale].dataFolderMsg}</span>
          }
          rules={[
            {
              required: true,
              message: context.input + context.ln + context.dataFolder,
            },
            {
              validator: (rule, value, callback) => {
                var reg = /[^a-zA-Z0-9\_\-\/]/g;
                if (!value) {
                  return Promise.resolve("success");
                } else {
                  if (value.startsWith("/")) {
                    if (!isChineseChar(value)) {
                      if (!reg.test(value)) {
                        return Promise.resolve("success");
                      } else {
                        return Promise.reject(msgMap[locale].invalidMsg);
                      }
                    } else {
                      return Promise.reject(msgMap[locale].invalidMsg);
                    }
                  } else {
                    return Promise.reject(msgMap[locale].invalidMsg);
                  }
                }
              },
            },
          ]}
        >
          <Input
            maxLength={255}
            placeholder={context.input + context.ln + context.dataFolder}
          />
        </Form.Item>

        <Form.Item
          name="ip"
          key="ip"
          label={
            <span>
              <img
                src={star}
                style={{ position: "relative", top: -2, left: -3 }}
              />
              {context.ip + " & " + context.port}
            </span>
          }
          useforminstanceinvalidator="true"
          rules={[
            {
              validator: (rule, v, callback) => {
                let value = modalForm.getFieldValue("IPtext");
                let portValue = modalForm.getFieldValue("port");
                if (!value) {
                  return Promise.reject(
                    context.input +
                      context.ln +
                      context.ip +
                      " & " +
                      context.port
                  );
                }
                if (!portValue) {
                  return Promise.reject(
                    context.input +
                      context.ln +
                      context.ip +
                      " & " +
                      context.port
                  );
                }
                if (isValidIpChar(value)) {
                  return new Promise((resolve, rej) => {
                    if (timer2.current) {
                      clearTimeout(timer2.current);
                    }
                    timer2.current = setTimeout(() => {
                      setmodalLoading(true);
                      fetchPost(apiRequest.machineManagement.checkHost, {
                        body: {
                          ip: value,
                        },
                      })
                        .then((res) => {
                          if (res && res.data) {
                            if (res.data.data) {
                              resolve("success");
                            } else {
                              rej(msgMap[locale].existsMsg);
                            }
                          }
                        })
                        .catch((e) => console.log(e))
                        .finally(() => {
                          setmodalLoading(false);
                        });
                    }, 600);
                  });
                } else {
                  return Promise.reject(msgMap[locale].invalidMsg);
                }
              },
            },
          ]}
        >
          <Row gutter={8}>
            <Col span={16}>
              <Form.Item
                name="IPtext"
                key="IPtext"
                noStyle
                seforminstanceinvalidator="true"
              >
                <Input placeholder={context.input + context.ln + context.ip} />
              </Form.Item>
            </Col>
            <span style={{ display: "flex", alignItems: "center" }}>:</span>
            <Col span={4}>
              <Form.Item name="port" key="port" noStyle>
                <InputNumber
                  onChange={() => modalForm.validateFields(["ip"])}
                  style={{ width: 82 }}
                  min={1}
                  max={65535}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={context.username}
          name="username"
          key="username"
          extra={msgMap[locale].usernameMsg}
          rules={[
            {
              required: true,
              message: context.input + context.ln + context.username,
            },
            {
              validator: (rule, value, callback) => {
                var reg = /[^a-zA-Z0-9\_\-]/g;
                var startReg = /[^a-zA-Z0-9\_]/g;
                if (value) {
                  let startChar = value.slice(0, 1);
                  if (!startReg.test(startChar)) {
                    if (isChineseChar(value)) {
                      return Promise.reject(msgMap[locale].invalidMsg);
                    } else {
                      if (!reg.test(value)) {
                        return Promise.resolve("success");
                      } else {
                        return Promise.reject(msgMap[locale].invalidMsg);
                      }
                    }
                  } else {
                    return Promise.reject(msgMap[locale].invalidMsg);
                  }
                } else {
                  return Promise.resolve("success");
                }
              },
            },
          ]}
        >
          <Input
            maxLength={16}
            placeholder={context.input + context.ln + context.username}
            suffix={
              <Tooltip title={msgMap[locale].userMsg}>
                <InfoCircleOutlined style={{ color: "rgba(0,0,0,.45)" }} />
              </Tooltip>
            }
          />
        </Form.Item>

        <Form.Item
          label={context.password}
          name="password"
          key="password"
          rules={[
            {
              required: true,
              message: context.input + context.ln + context.password,
            },
            {
              validator: (rule, value, callback) => {
                if (value) {
                  if (!isExpression(value)) {
                    if (isChineseChar(value)) {
                      return Promise.reject(msgMap[locale].invalidMsg);
                    } else {
                      if (value.length < 4) {
                        return Promise.reject(msgMap[locale].lengthMsg);
                      } else {
                        if (isSpace(value)) {
                          return Promise.reject(msgMap[locale].invalidMsg);
                        }
                        return Promise.resolve("success");
                      }
                    }
                  } else {
                    return Promise.reject(msgMap[locale].invalidMsg);
                  }
                } else {
                  return Promise.resolve("success");
                }
              },
            },
          ]}
        >
          <Input.Password
            maxLength={64}
            placeholder={context.input + context.ln + context.password}
          />
        </Form.Item>

        <Form.Item
          label={context.install + context.ln + context.ntpdate}
          name="use_ntpd"
          key="use_ntpd"
          valuePropName="checked"
        >
          <Switch
            style={{ borderRadius: "10px" }}
            onChange={(e) => setIsOpen(e)}
          />
        </Form.Item>

        {isOpen && (
          <Form.Item
            label={context.ntpdate + context.ln + context.ip}
            name="ntpd_server"
            key="ntpd_server"
            rules={[
              {
                required: true,
                message:
                  context.input +
                  context.ln +
                  context.ntpdate +
                  context.ln +
                  context.ip,
              },
              {
                validator: (rule, value, callback) => {
                  if (value) {
                    if (isValidIpChar(value)) {
                      return Promise.resolve("success");
                    } else {
                      return Promise.reject(msgMap[locale].invalidMsg);
                    }
                  } else {
                    return Promise.resolve("success");
                  }
                },
              },
            ]}
          >
            <Input
              placeholder={
                context.input +
                context.ln +
                context.ntpdate +
                context.ln +
                context.ip
              }
            />
          </Form.Item>
        )}
      </div>
    </OmpModal>
  );
};

// 编辑主机 modal
export const UpDateMachineModal = ({
  loading,
  visibleHandle,
  createHost,
  row,
  setLoading,
  context,
  locale,
}) => {
  const [modalForm] = Form.useForm();
  const [modalLoading, setmodalLoading] = useState(false);
  const timer = useRef(null);
  return (
    <OmpModal
      loading={modalLoading ? modalLoading : loading}
      setLoading={setLoading}
      okBtnText={
        modalLoading ? context.verifying : loading ? context.edit : null
      }
      visibleHandle={visibleHandle}
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <FormOutlined />
          </span>
          <span>{context.edit + context.ln + context.host}</span>
        </span>
      }
      form={modalForm}
      context={context}
      onFinish={(data) => createHost(data)}
      initialValues={{
        instance_name: row.instance_name,
        IPtext: row.ip,
        data_folder: row.data_folder,
        port: row.port,
        operate_system: row.operate_system,
        username: row.username,
        ip: row.ip,
        password: row.password && window.atob(row.password),
      }}
    >
      <div
        style={{
          transition: "all .2s ease-in",
          position: "relative",
        }}
      >
        <Form.Item
          label={context.instanceName}
          name="instance_name"
          key="instance_name"
          rules={[
            {
              required: true,
              message: context.input + context.ln + context.instanceName,
            },
            {
              validator: (rule, value, callback) => {
                if (!value) {
                  return Promise.resolve("success");
                }
                // 校验开头
                let startChar = value.slice(0, 1);
                if (
                  isNumberChar(startChar) ||
                  isLetterChar(startChar) ||
                  startChar == "-"
                ) {
                  if (!isExpression(value)) {
                    if (isChineseChar(value)) {
                      return Promise.reject(msgMap[locale].invalidMsg);
                    } else {
                      if (value.length > 16) {
                        return Promise.resolve("success");
                      } else {
                        if (isSpace(value)) {
                          return Promise.reject(msgMap[locale].invalidMsg);
                        }
                        return new Promise((resolve, rej) => {
                          if (timer.current) {
                            clearTimeout(timer.current);
                          }
                          timer.current = setTimeout(() => {
                            setmodalLoading(true);
                            fetchPost(apiRequest.machineManagement.checkHost, {
                              body: {
                                instance_name: value,
                                id: row.id,
                              },
                            })
                              .then((res) => {
                                if (res && res.data) {
                                  if (res.data.data) {
                                    resolve("success");
                                  } else {
                                    rej(msgMap[locale].existsMsg);
                                  }
                                }
                              })
                              .catch((e) => console.log(e))
                              .finally(() => {
                                setmodalLoading(false);
                              });
                          }, 400);
                        });
                      }
                    }
                  } else {
                    return Promise.reject(msgMap[locale].invalidMsg);
                  }
                } else {
                  return Promise.reject(msgMap[locale].invalidMsg);
                }
              },
            },
          ]}
        >
          <Input
            maxLength={16}
            placeholder={context.input + context.ln + context.instanceName}
          />
        </Form.Item>

        <Form.Item
          label={context.system}
          name="operate_system"
          key="operate_system"
          rules={[
            {
              required: true,
              message: context.select + context.ln + context.system,
            },
          ]}
        >
          <Select placeholder={context.select + context.ln + context.system}>
            <Select.Option value="CentOS">CentOS</Select.Option>
            <Select.Option value="RedHat">RedHat</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={context.dataFolder}
          name="data_folder"
          key="data_folder"
          extra={
            <span style={{ fontSize: 10 }}>{msgMap[locale].dataFolderMsg}</span>
          }
          rules={[
            {
              required: true,
              message: context.input + context.ln + context.dataFolder,
            },
            {
              validator: (rule, value, callback) => {
                var reg = /[^a-zA-Z0-9\_\-\/]/g;
                if (!value) {
                  return Promise.resolve("success");
                } else {
                  if (value.startsWith("/")) {
                    if (!isChineseChar(value)) {
                      if (!reg.test(value)) {
                        return Promise.resolve("success");
                      } else {
                        return Promise.reject(msgMap[locale].invalidMsg);
                      }
                    } else {
                      return Promise.reject(msgMap[locale].invalidMsg);
                    }
                  } else {
                    return Promise.reject(msgMap[locale].invalidMsg);
                  }
                }
              },
            },
          ]}
        >
          <Input
            maxLength={255}
            placeholder={context.input + context.ln + context.dataFolder}
          />
        </Form.Item>

        <Form.Item
          name="ip"
          key="ip"
          label={
            <span>
              <img
                src={star}
                style={{ position: "relative", top: -2, left: -3 }}
              />
              {context.ip + " & " + context.port}
            </span>
          }
          rules={[
            {
              validator: (rule, v, callback) => {
                let value = modalForm.getFieldValue("IPtext");
                let portValue = modalForm.getFieldValue("port");
                if (!value) {
                  return Promise.reject(
                    context.input +
                      context.ln +
                      context.ip +
                      " & " +
                      context.port
                  );
                }
                if (!portValue) {
                  return Promise.reject(
                    context.input +
                      context.ln +
                      context.ip +
                      " & " +
                      context.port
                  );
                }
                if (isValidIpChar(value)) {
                  return new Promise((resolve, rej) => {
                    setmodalLoading(true);
                    fetchPost(apiRequest.machineManagement.checkHost, {
                      body: {
                        ip: value,
                        id: row.id,
                      },
                    })
                      .then((res) => {
                        if (res && res.data) {
                          if (res.data.data) {
                            resolve("success");
                          } else {
                            rej(msgMap[locale].existsMsg);
                          }
                        }
                      })
                      .catch((e) => console.log(e))
                      .finally(() => {
                        setmodalLoading(false);
                      });
                  });
                } else {
                  return Promise.reject(msgMap[locale].invalidMsg);
                }
              },
            },
          ]}
        >
          <Row gutter={8}>
            <Col span={16}>
              <Form.Item name="IPtext" key="IPtext" noStyle>
                <Input disabled placeholder={"例如: 192.168.10.10"} />
              </Form.Item>
            </Col>
            <span style={{ display: "flex", alignItems: "center" }}>:</span>
            <Col span={4}>
              <Form.Item name="port" key="port" noStyle>
                <InputNumber
                  style={{ width: 82 }}
                  min={1}
                  max={65535}
                  onChange={() => modalForm.validateFields(["ip"])}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={context.username}
          name="username"
          key="username"
          rules={[
            {
              required: true,
              message: "请输入用户名",
            },
          ]}
        >
          <Input
            maxLength={16}
            placeholder={context.input + context.ln + context.username}
            disabled
            suffix={
              <Tooltip title={msgMap[locale].userMsg}>
                <InfoCircleOutlined style={{ color: "rgba(0,0,0,.45)" }} />
              </Tooltip>
            }
          />
        </Form.Item>

        <Form.Item
          label={context.password}
          name="password"
          key="password"
          rules={[
            {
              required: true,
              message: context.input + context.ln + context.password,
            },
            {
              validator: (rule, value, callback) => {
                if (value) {
                  if (!isExpression(value)) {
                    if (isChineseChar(value)) {
                      return Promise.reject(msgMap[locale].invalidMsg);
                    } else {
                      if (value.length < 4) {
                        return Promise.reject(msgMap[locale].lengthMsg);
                      } else {
                        if (isSpace(value)) {
                          return Promise.reject(msgMap[locale].invalidMsg);
                        }
                        return Promise.resolve("success");
                      }
                    }
                  } else {
                    return Promise.reject(msgMap[locale].invalidMsg);
                  }
                } else {
                  return Promise.resolve("success");
                }
              },
            },
          ]}
        >
          <Input.Password
            maxLength={64}
            placeholder={context.input + context.ln + context.password}
          />
        </Form.Item>
      </div>
    </OmpModal>
  );
};

const getHeaderRow = (sheet) => {
  const headers = [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  let C;
  const R = range.s.r;
  for (C = range.s.c; C <= range.e.c; ++C) {
    const cell = sheet[XLSX.utils.encode_cell({ c: C, r: R })];
    let hdr = "UNKNOWN " + C;
    if (cell && cell.t) hdr = XLSX.utils.format_cell(cell);
    headers.push(hdr);
  }
  return headers;
};

class UploadExcelComponent extends React.Component {
  state = {
    loading: false,
    excelData: {
      header: null,
      results: null,
    },
  };
  draggerProps = () => {
    let _this = this;
    return {
      name: "file",
      multiple: false,
      accept: ".xlsx",
      maxCount: 1,
      onRemove() {
        _this.props.onRemove();
        return true;
      },
      onChange(info) {
        const { status } = info.file;
        if (status === "done") {
          message.success(msgMap[_this.props.locale].fileTureMsg);
        } else if (status === "error") {
          message.error(msgMap[_this.props.locale].fileFalseMsg);
        }
      },
      beforeUpload(file, fileList) {
        // 校验文件大小
        const fileSize = file.size / 1024 / 1024; //单位是M
        if (Math.ceil(fileSize) > 10) {
          message.error(msgMap[_this.props.locale].fileSizeMsg);
          return Upload.LIST_IGNORE;
        }
        if (!/\.(xlsx)$/.test(file.name)) {
          message.error(msgMap[_this.props.locale].fileFormatMsg);
          return Upload.LIST_IGNORE;
        }
      },
      customRequest(e) {
        _this.readerData(e.file).then(
          (msg) => {
            e.onSuccess();
          },
          () => {
            e.onError();
          }
        );
      },
    };
  };
  readerData = (rawFile) => {
    // bmf.md5(rawFile,(err,md5)=>{
    //   console.log(err,md5,"=====?")
    // })
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const header = getHeaderRow(worksheet);
          const results = XLSX.utils.sheet_to_json(worksheet);
          this.generateData({ header, results });
          resolve();
        } catch (error) {
          reject();
        }
      };
      reader.readAsArrayBuffer(rawFile);
    });
  };
  generateData = ({ header, results }) => {
    this.setState({
      excelData: { header, results },
    });
    this.props.uploadSuccess && this.props.uploadSuccess(this.state.excelData);
  };
  render() {
    return (
      <div>
        <Upload.Dragger {...this.draggerProps()}>
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p style={{ textAlign: "center", color: "#575757" }}>
            {msgMap[this.props.locale].uploadMsg}
          </p>
          <p
            style={{
              textAlign: "center",
              color: "#8e8e8e",
              fontSize: 13,
              paddingTop: 10,
            }}
          >
            {this.props.context.fileExtension + ": .xlsx"}
          </p>
        </Upload.Dragger>
      </div>
    );
  }
}

// 批量添加主机
export const BatchImportMachineModal = ({
  batchImport,
  setBatchImport,
  refreshData,
  context,
  locale,
}) => {
  const [dataSource, setDataSource] = useState([]);
  const [columns, setColumns] = useState([]);
  // 校验后的表格的colums和dataSource也是不确定的
  // 因为不单是在表格展示中需要区分校验成功与否，在这里定义多个数据源用以区分是否成功
  const [tableCorrectData, setTableCorrectData] = useState([]);
  const [tableErrorData, setTableErrorData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [stepNum, setStepNum] = useState(0);
  const [loading, setLoading] = useState(false);

  // 失败的columns
  const errorColumns = [
    {
      title: context.row,
      key: "row",
      dataIndex: "row",
      align: "center",
      width: 60,
      ellipsis: true,
      fixed: "left",
    },
    {
      title: context.instanceName,
      key: "instance_name",
      dataIndex: "instance_name",
      align: "center",
      width: 140,
      ellipsis: true,
      //fixed: "left",
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.ip,
      key: "ip",
      dataIndex: "ip",
      align: "center",
      width: 140,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
      ellipsis: true,
    },
    {
      title: context.port,
      key: "port",
      dataIndex: "port",
      align: "center",
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
      title: context.dataFolder,
      key: "data_folder",
      dataIndex: "data_folder",
      align: "center",
      width: 180,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
      ellipsis: true,
    },
    {
      title: context.install + context.ln + context.ntpdate,
      key: "use_ntpd",
      dataIndex: "use_ntpd",
      align: "center",
      width: 120,
      render: (text) => {
        return (
          <span>
            {text === false ? context.no : text === true ? context.yes : "-"}
          </span>
        );
      },
      ellipsis: true,
    },
    {
      title: context.ntpdate + context.ln + context.ip,
      key: "ntpd_server",
      dataIndex: "ntpd_server",
      align: "center",
      width: 120,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
      ellipsis: true,
    },
    {
      title: context.error + context.ln + context.description,
      key: "validate_error",
      dataIndex: "validate_error",
      fixed: "right",
      align: "center",
      width: 240,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
      ellipsis: true,
    },
  ];

  // 成功的columns
  const correctColumns = [
    {
      title: context.instanceName,
      key: "instance_name",
      dataIndex: "instance_name",
      align: "center",
      width: 140,
      ellipsis: true,
      fixed: "left",
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.ip,
      key: "ip",
      dataIndex: "ip",
      align: "center",
      width: 140,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
      ellipsis: true,
    },
    {
      title: context.port,
      key: "port",
      dataIndex: "port",
      align: "center",
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
      title: context.dataFolder,
      key: "data_folder",
      dataIndex: "data_folder",
      align: "center",
      width: 180,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
      ellipsis: true,
    },
    {
      title: context.username,
      key: "username",
      dataIndex: "username",
      align: "center",
      width: 120,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
      ellipsis: true,
    },
    {
      title: context.password,
      key: "password",
      dataIndex: "password",
      align: "center",
      width: 130,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
      ellipsis: true,
    },
    {
      title: context.install + context.ln + context.ntpdate,
      key: "use_ntpd",
      dataIndex: "use_ntpd",
      align: "center",
      width: 120,
      render: (text) => {
        return (
          <span>{text === false ? "否" : text === true ? "是" : "-"}</span>
        );
      },
      ellipsis: true,
    },
    {
      title: context.ntpdate + context.ln + context.ip,
      key: "ntpd_server",
      dataIndex: "ntpd_server",
      align: "center",
      width: 120,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
      ellipsis: true,
    },
    {
      title: context.system,
      key: "operate_system",
      dataIndex: "operate_system",
      align: "center",
      width: 120,
      fixed: "right",
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
      ellipsis: true,
    },
  ];

  // 校验数据接口
  const fetchBatchValidate = () => {
    if (dataSource.length == 0) {
      message.warning(msgMap[locale].fileNoDataMsg);
      return;
    }
    setLoading(true);
    setTableCorrectData([]);
    setTableErrorData([]);
    let queryBody = dataSource.map((item) => {
      let result = {};
      for (const key in item) {
        switch (key) {
          case "IP[必填]":
            result.ip = item[key];
            break;
          case "实例名[必填]":
            result.instance_name = item[key];
            break;
          case "密码[必填]":
            result.password = item[key];
            break;
          case "操作系统[必填]":
            result.operate_system = item[key];
            break;
          case "数据分区[必填]":
            result.data_folder = item[key];
            break;
          case "用户名[必填]":
            result.username = item[key];
            break;
          case "端口[必填]":
            result.port = item[key];
            break;
          case "时间同步服务器":
            if (item[key] === "") break;
            result.use_ntpd = true;
            result.ntpd_server = item[key];
            break;
          default:
            break;
        }
      }
      if (!result.use_ntpd) {
        result.use_ntpd = false;
      }
      return {
        ...result,
        row: item.key,
      };
    });

    // 校验数据
    fetchPost(apiRequest.machineManagement.batchValidate, {
      body: {
        host_list: queryBody,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            if (res.data && res.data.error?.length > 0) {
              setTableErrorData(
                res.data.error?.map((item, idx) => {
                  return {
                    key: idx,
                    ...item,
                  };
                })
              );
              setTableColumns(errorColumns);
            } else {
              setTableCorrectData(
                res.data.correct?.map((item, idx) => {
                  return {
                    key: idx,
                    ...item,
                  };
                })
              );
              setTableColumns(correctColumns);
            }
            setStepNum(1);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 主机创建操作
  const fetchBatchImport = () => {
    let queryBody = tableCorrectData.map((item) => {
      delete item.key;
      return {
        ...item,
      };
    });
    setLoading(true);
    fetchPost(apiRequest.machineManagement.batchImport, {
      body: {
        host_list: queryBody,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            setStepNum(2);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Modal
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <ImportOutlined />
          </span>
          <span>
            {context.batch +
              context.ln +
              context.add +
              context.ln +
              context.host}
          </span>
        </span>
      }
      visible={batchImport}
      footer={null}
      width={800}
      loading={loading}
      bodyStyle={{
        paddingLeft: 30,
        paddingRight: 30,
      }}
      onCancel={() => setBatchImport(false)}
      afterClose={() => {
        setDataSource([]);
        setTableCorrectData([]);
        setTableErrorData([]);
        setTableColumns([]);
        setStepNum(0);
        setColumns([]);
      }}
      destroyOnClose
    >
      {/* -- 顶部步骤条 -- */}
      <Steps size="small" current={stepNum}>
        <Steps.Step title={context.upload + context.ln + context.file} />
        <Steps.Step title={context.verify + context.ln + context.data} />
        <Steps.Step title={context.result} />
      </Steps>

      {/* -- step0 上传文件 -- */}
      <div style={{ paddingLeft: 10, paddingTop: 30 }}>
        <div
          style={{
            visibility: stepNum == 0 ? "visible" : "hidden",
            height: stepNum == 0 ? null : 0,
            overflow: "hidden",
          }}
        >
          {/* -- 下载模板 -- */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                flex: 2,
                fontWeight: 500,
                textAlign: "right",
              }}
            >
              {context.downloadTemplate + ":"}
            </div>
            <div style={{ flex: 16, paddingLeft: 20 }}>
              <Button
                icon={<DownloadOutlined />}
                size="middle"
                style={{ fontSize: 13 }}
                onClick={() => {
                  let a = document.createElement("a");
                  a.href = apiRequest.machineManagement.downTemplate;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                {context.template}
              </Button>
            </div>
          </div>

          {/* -- 上传文件 -- */}
          <div style={{ display: "flex", marginTop: 30 }}>
            <div
              style={{
                flex: 2,
                fontWeight: 500,
                textAlign: "right",
              }}
            >
              {context.uploadFile + ":"}
            </div>
            <div style={{ flex: 16, paddingLeft: 20 }}>
              {batchImport && (
                <UploadExcelComponent
                  context={context}
                  locale={locale}
                  onRemove={() => {
                    setDataSource([]);
                    setColumns([]);
                    setTableCorrectData([]);
                    setTableErrorData([]);
                    setTableColumns([]);
                  }}
                  uploadSuccess={({ results, header }) => {
                    let dataS = results
                      .filter((item) => {
                        if (item["字段名称(请勿编辑)"]?.includes("请勿编辑")) {
                          return false;
                        }
                        if (!item["实例名[必填]"]) {
                          return false;
                        }
                        return true;
                      })
                      .map((item, idx) => {
                        return { ...item, key: item.__rowNum__ + 1 };
                      });
                    let column = header.filter((item) => {
                      if (
                        item?.includes("请勿编辑") ||
                        item?.includes("UNKNOWN")
                      ) {
                        return false;
                      }
                      return true;
                    });

                    setDataSource(dataS);
                    setColumns(column);
                  }}
                />
              )}

              <div
                style={{
                  display: "inline-block",
                  marginLeft: "50%",
                  transform: "translateX(-50%)",
                  marginTop: 40,
                }}
              >
                <Button
                  loading={loading}
                  onClick={() => fetchBatchValidate()}
                  type="primary"
                  disabled={columns.length == 0}
                >
                  {context.verify}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* -- step1 校验数据 -- */}
        {stepNum == 1 && (
          <>
            {tableErrorData.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingBottom: 10,
                  flexDirection: "column",
                }}
              >
                <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: 20,
                    color: "#f73136",
                  }}
                >
                  <CloseCircleFilled
                    style={{ color: "#f73136", fontSize: 30, marginRight: 10 }}
                  />
                  {msgMap[locale].verifyFiled + " !"}
                </p>
                <p style={{ fontSize: 13 }}>{msgMap[locale].pleaseEdit}</p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingBottom: 10,
                }}
              >
                <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: 20,
                  }}
                >
                  <CheckCircleFilled
                    style={{ color: "#52c41a", fontSize: 30, marginRight: 10 }}
                  />
                  {msgMap[locale].verifyPassd + " !"}
                </p>
              </div>
            )}

            <OmpTable
              bordered
              scroll={{ x: 700 }}
              columns={tableColumns}
              dataSource={
                tableErrorData.length > 0 ? tableErrorData : tableCorrectData
              }
              pagination={{ pageSize: 5 }}
            />
            <div
              style={{
                display: "inline-block",
                marginLeft: "50%",
                transform: "translateX(-50%)",
                marginTop: 40,
              }}
            >
              <Button style={{ marginRight: 16 }} onClick={() => setStepNum(0)}>
                {context.previous}
              </Button>
              <Button
                loading={loading}
                type="primary"
                htmlType="submit"
                onClick={() => fetchBatchImport()}
                disabled={tableErrorData.length > 0}
              >
                {context.add}
              </Button>
            </div>
          </>
        )}

        {/* -- step2 结果 -- */}
        {stepNum == 2 && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingBottom: 20,
                paddingTop: 30,
              }}
            >
              <p
                style={{ display: "flex", alignItems: "center", fontSize: 20 }}
              >
                <CheckCircleFilled
                  style={{ color: "#52c41a", fontSize: 30, marginRight: 10 }}
                />
                {msgMap[locale].addSuccess + " !"}
              </p>
            </div>
            <p style={{ textAlign: "center" }}>
              {msgMap[locale].addTotalLeft +
                " " +
                tableCorrectData.length +
                " " +
                msgMap[locale].addTotalRight}
            </p>
            <div
              style={{
                display: "inline-block",
                marginLeft: "50%",
                transform: "translateX(-50%)",
                marginTop: 40,
              }}
            >
              <Button
                loading={loading}
                type="primary"
                htmlType="submit"
                onClick={() => {
                  refreshData();
                  setBatchImport(false);
                }}
              >
                {context.ok}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
