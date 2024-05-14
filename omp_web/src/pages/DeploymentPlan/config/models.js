import React, { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { Button, message, Tooltip, Modal, Steps, Upload, Table } from "antd";
import {
  SyncOutlined,
  ImportOutlined,
  DownloadOutlined,
  CloudUploadOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";
import { handleResponse } from "@/utils/utils";
import { fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { useState, useRef } from "react";
import XLSX from "xlsx";

const msgMap = {
  "en-US": {
    uploadMsg: "Click or drag the file here to upload",
    verifyHost: "Verifying host data",
    verifyHostPass: "Host data verification passed",
    verifyHostFiled: "Host data verification failed",
    verifyService: "Verifying service data",
    verifyServicePass: "Service data verification passed",
    verifyServiceFiled: "Service data verification failed",
    import: "Importing template",
    importSuccess: "Import template successful",
    importFailed: "Import template failed",
    waitMsg: "If waiting too long, please check host agent",
    enterInstall: "Entering installation, please wait",
    addTotalLeft: "Add a total of",
    addTotalRight: "hosts",
    importLeft: "Import a total of",
    importBetween: "products and",
    importRight: "services",
    fileTureMsg: "File parsing succeed",
    fileFalseMsg: "File parsing failed",
    fileSizeMsg: "File size must be less than 10M",
    fileFormatMsg: "File format must be xlsx",
    fileNoDataMsg:
      "There is no valid data in the file parsing result. Please check the file content",
  },
  "zh-CN": {
    uploadMsg: "点击或将文件拖拽到这里上传",
    verifyHost: "正在校验主机数据",
    verifyHostPass: "主机数据校验通过",
    verifyHostFiled: "主机数据校验未通过",
    verifyService: "正在校验服务数据",
    verifyServicePass: "服务数据校验通过",
    verifyServiceFiled: "服务数据校验未通过",
    import: "正在导入模板",
    importSuccess: "导入成功",
    importFailed: "导入失败",
    waitMsg: "如果长时间等待，请检查主机Agent状态",
    enterInstall: "正在进入安装，请稍候",
    addTotalLeft: "添加共计",
    addTotalRight: "台主机",
    importLeft: "导入共计",
    importBetween: "个产品和",
    importRight: "个服务",
    fileTureMsg: "文件解析成功",
    fileFalseMsg: "文件解析失败",
    fileSizeMsg: "文件大小必须小于10M",
    fileFormatMsg: "文件格式必须为xlsx",
    fileNoDataMsg: "文件解析结果中无有效数据，请检查文件内容",
  },
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
          //console.log(info.file);
          message.success(msgMap[_this.props.locale].fileTureMsg);
        } else if (status === "error") {
          message.error(msgMap[_this.props.locale].fileFalseMsg);
        }
      },
      beforeUpload(file, fileList) {
        // 校验大小
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: "array" });
          // 主机数据
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const header = getHeaderRow(worksheet);
          const results = XLSX.utils.sheet_to_json(worksheet);

          // 服务数据
          const sencondSheetName = workbook.SheetNames[1];
          const serviceSheet = workbook.Sheets[sencondSheetName];
          const serviceHeader = getHeaderRow(serviceSheet);
          const serviceResults = XLSX.utils.sheet_to_json(serviceSheet);

          this.generateData(
            { header, results },
            { serviceHeader, serviceResults }
          );
          resolve();
        } catch (error) {
          reject();
        }
      };
      reader.readAsArrayBuffer(rawFile);
    });
  };
  generateData = ({ header, results }, { serviceHeader, serviceResults }) => {
    this.setState({
      excelData: { header, results },
      excelServiceData: { serviceHeader, serviceResults },
    });
    this.props.uploadSuccess &&
      this.props.uploadSuccess(
        this.state.excelData,
        this.state.excelServiceData
      );
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

/* 导入执行计划 */
export const ImportPlanModal = ({
  importPlan,
  setImportPlan,
  context,
  locale,
}) => {
  const history = useHistory();
  const [dataSource, setDataSource] = useState([]);
  const [columns, setColumns] = useState([]);
  const [serviceDataSource, setServiceDataSource] = useState([]);
  const [serviceColumns, setServiceColumns] = useState([]);
  const [tableCorrectData, setTableCorrectData] = useState([]);
  const [tableErrorData, setTableErrorData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [serviceTableCorrectData, setServiceTableCorrectData] = useState([]);
  const [serviceTableErrorData, setServiceTableErrorData] = useState([]);
  const [serviceTableColumns, setServiceTableColumns] = useState([]);
  // 涉及数量信息
  const [numInfo, setNumInfo] = useState({});
  const [stepNum, setStepNum] = useState(0);
  const [loading, setLoading] = useState(false);
  // 导入部署步骤状态
  const [hostStep, setHostStep] = useState(null);
  const [serviceStep, setServiceStep] = useState(null);
  const [importStep, setImportStep] = useState(null);
  // 导入部署模板状态
  const [importResult, setImportResult] = useState(null);
  // 主机和服务的正确数据
  let hostCorrectData = null;
  let serviceCorrectData = null;
  // 轮训控制器
  const hostAgentTimer = useRef(null);

  // 主机失败的columns
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
      width: 120,
      ellipsis: true,
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
      title: context.runUser,
      key: "run_user",
      dataIndex: "run_user",
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
      title: context.description,
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

  // 服务失败的columns
  const serviceErrorColumns = [
    {
      title: context.row,
      key: "row",
      dataIndex: "row",
      align: "center",
      width: 60,
      ellipsis: true,
      fixed: "left",
      render: (text) => {
        if (text < 1) return "-";
        return text;
      },
    },
    {
      title: context.instanceName,
      key: "instance_name",
      dataIndex: "instance_name",
      align: "center",
      width: 120,
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.service + context.ln + context.name,
      key: "service_name",
      dataIndex: "service_name",
      align: "center",
      width: 140,
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
    },
    ,
    {
      title: context.memory,
      key: "memory",
      dataIndex: "memory",
      align: "center",
      width: 80,
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text}>
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.description,
      key: "validate_error",
      dataIndex: "validate_error",
      fixed: "right",
      align: "center",
      width: 260,
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

  // 校验主机数据
  const fetchBatchValidate = () => {
    setLoading(true);
    if (dataSource.length == 0) {
      message.warning(msgMap[locale].fileNoDataMsg);
      setHostStep(false);
      setImportResult(false);
      return;
    }
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
          case "运行用户":
            result.run_user = item[key];
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
        res = res.data;
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
            setHostStep(false);
            setImportResult(false);
          } else {
            hostCorrectData = res.data.correct?.map((item, idx) => {
              return {
                key: idx,
                ...item,
              };
            });
            setHostStep(true);
            serviceDataValidate();
          }
        } else {
          message.warning(res.message);
          setHostStep(false);
          setImportResult(false);
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 校验服务数据
  const serviceDataValidate = () => {
    setLoading(true);
    if (serviceDataSource.length == 0) {
      message.warning(msgMap[locale].fileNoDataMsg);
      setServiceStep(false);
      setImportResult(false);
      return;
    }
    // 获取主机实例名数组;
    let instanceNameArr = dataSource.map((item) => {
      let instanceName = "";
      for (const key in item) {
        switch (key) {
          case "实例名[必填]":
            instanceName = item[key];
            break;
          default:
            break;
        }
      }
      return instanceName;
    });
    // 获取服务数据
    let serviceArr = serviceDataSource.map((item) => {
      let result = {};
      for (const key in item) {
        if (item[key] === "") continue;
        switch (key) {
          case "主机实例名[必填]":
            result.instance_name = item[key];
            break;
          case "服务名[必填]":
            result.service_name = item[key];
            break;
          case "运行内存":
            result.memory = item[key];
            break;
          case "虚拟IP":
            result.vip = item[key];
            break;
          case "角色":
            result.role = item[key];
            break;
          case "模式":
            result.mode = item[key].toString();
            break;
          case "安装参数":
            result.install_args = item[key].toString();
            break;
          default:
            break;
        }
      }
      return {
        ...result,
        row: item.key,
      };
    });
    // 校验服务分布信息
    fetchPost(apiRequest.deloymentPlan.serviceValidate, {
      body: {
        instance_name_ls: instanceNameArr,
        service_data_ls: serviceArr,
      },
    })
      .then((res) => {
        res = res.data;
        if (res.code == 0) {
          if (res.data && res.data.error?.length > 0) {
            setServiceTableErrorData(
              res.data.error?.map((item, idx) => {
                return {
                  key: idx,
                  ...item,
                };
              })
            );
            setServiceTableColumns(serviceErrorColumns);
            setServiceStep(false);
            setImportResult(false);
          } else {
            serviceCorrectData = res.data.correct?.map((item, idx) => {
              return {
                key: idx,
                ...item,
              };
            });
            setServiceStep(true);
            startDeployment();
          }
        } else {
          message.warning(res.message);
          setServiceStep(false);
          setImportResult(false);
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 导入服务数据
  const serviceImport = () => {
    setLoading(true);
    let instanceArr = hostCorrectData.map((item) => {
      return {
        instance_name: item.instance_name,
        run_user: item.run_user,
      };
    });
    let serviceArr = serviceCorrectData.map((item) => {
      delete item.key;
      return {
        ...item,
      };
    });
    fetchPost(apiRequest.deloymentPlan.serviceImport, {
      body: {
        instance_info_ls: instanceArr,
        service_data_ls: serviceArr,
      },
    })
      .then((res) => {
        res = res.data;
        if (res.code === 0) {
          setNumInfo(res.data);
          setImportStep(true);
          setImportResult(true);
          // 开始安装
          startInstall(res.data.operation_uuid);
        } else {
          message.warning(
            <>
              {res.message}
              <a
                style={{ marginLeft: 8, color: "#3790ff" }}
                onClick={() => {
                  message.destroy();
                }}
              >
                [{context.close}]
              </a>
            </>,
            0
          );
          setImportStep(false);
          setImportResult(false);
        }
      })
      .catch((e) => {
        console.log(e);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // 开始部署
  const startDeployment = () => {
    setLoading(true);
    // 批量导入主机数据
    let hostArr = hostCorrectData.map((item) => {
      delete item.key;
      return {
        ...item,
      };
    });
    // 纳管主机
    fetchPost(apiRequest.machineManagement.batchImport, {
      body: {
        host_list: hostArr,
      },
    })
      .then((res) => {
        res = res.data;
        if (res.code === 0) {
          serviceImport();
        } else {
          message.warning(res.message);
          setImportStep(false);
          setImportResult(false);
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  // 执行安装任务
  const retryInstall = (operation_uuid) => {
    // 跳转安装页面
    fetchPost(apiRequest.appStore.retryInstall, {
      body: {
        unique_key: operation_uuid,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            // 跳转安装页面
            history.push({
              pathname: "/application_management/app_store/installation",
              state: {
                uniqueKey: operation_uuid,
                step: 4,
              },
            });
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  // 查询主机 agent 状态
  const queryHostAgent = (operation_uuid) => {
    let ipArr = hostCorrectData.map((item) => {
      return item.ip;
    });
    fetchPost(apiRequest.machineManagement.hostsAgentStatus, {
      body: {
        ip_list: ipArr,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0 && res.data) {
            // 调用安装
            retryInstall(operation_uuid);
            // 清除定时器
            clearInterval(hostAgentTimer.current);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  // 开始安装
  const startInstall = (operation_uuid) => {
    hostAgentTimer.current = setInterval(() => {
      queryHostAgent(operation_uuid);
    }, 1000);
  };

  // 点击导入按钮
  const clickImport = () => {
    setHostStep(null);
    setServiceStep(null);
    setImportStep(null);
    setImportResult(null);
    setTableCorrectData([]);
    setTableErrorData([]);
    setServiceTableCorrectData([]);
    setServiceTableErrorData([]);
    setStepNum(1);
    fetchBatchValidate();
  };

  useEffect(() => {
    return () => {
      // 页面销毁时清除延时器
      clearInterval(hostAgentTimer.current);
    };
  }, []);

  return (
    <Modal
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <ImportOutlined />
          </span>
          <span>
            {context.import +
              context.ln +
              context.deployment +
              context.ln +
              context.template}
          </span>
        </span>
      }
      visible={importPlan}
      footer={null}
      width={800}
      loading={loading}
      bodyStyle={{
        paddingLeft: 30,
        paddingRight: 30,
      }}
      onCancel={() => {
        setImportPlan(false);
      }}
      afterClose={() => {
        setDataSource([]);
        setTableCorrectData([]);
        setTableErrorData([]);
        setTableColumns([]);
        setStepNum(0);
        setColumns([]);

        setServiceDataSource([]);
        setServiceColumns([]);
        setServiceTableCorrectData([]);
        setServiceTableErrorData([]);
        setServiceTableColumns([]);
      }}
      destroyOnClose
    >
      {/* -- 顶部步骤条 -- */}
      <Steps size="small" current={stepNum}>
        <Steps.Step title={context.upload + context.ln + context.file} />
        <Steps.Step title={context.result} />
      </Steps>

      {/* -- step1 上传文件 -- */}
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
            <div style={{ flex: 2, fontWeight: 500, textAlign: "right" }}>
              {context.downloadTemplate + ":"}
            </div>
            <div style={{ flex: 16, paddingLeft: 20 }}>
              <Button
                icon={<DownloadOutlined />}
                size="middle"
                style={{ fontSize: 13 }}
                onClick={() => {
                  let a = document.createElement("a");
                  a.href = apiRequest.deloymentPlan.deploymentTemplate;
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
            <div style={{ flex: 2, fontWeight: 500, textAlign: "right" }}>
              {context.uploadFile + ":"}
            </div>
            <div style={{ flex: 16, paddingLeft: 20 }}>
              {importPlan && (
                <UploadExcelComponent
                  context={context}
                  locale={locale}
                  onRemove={() => {
                    setDataSource([]);
                    setColumns([]);
                    setTableCorrectData([]);
                    setTableErrorData([]);
                    setTableColumns([]);

                    setServiceDataSource([]);
                    setServiceColumns([]);
                    setServiceTableCorrectData([]);
                    setServiceTableErrorData([]);
                    setServiceTableColumns([]);
                  }}
                  uploadSuccess={(
                    { results, header },
                    { serviceHeader, serviceResults }
                  ) => {
                    // 处理主机数据
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

                    // 处理服务数据
                    let dataService = serviceResults
                      .filter((item) => {
                        if (item["字段名称(请勿编辑)"]?.includes("请勿编辑")) {
                          return false;
                        }
                        if (!item["主机实例名[必填]"]) {
                          return false;
                        }
                        return true;
                      })
                      .map((item) => {
                        return { ...item, key: item.__rowNum__ + 1 };
                      });
                    setServiceDataSource(dataService);
                    setServiceColumns(serviceHeader);
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
                  onClick={() => clickImport()}
                  type="primary"
                  disabled={columns.length == 0}
                >
                  {context.import}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* -- step1 结果 -- */}
        {stepNum == 1 && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingBottom: 10,
                flexDirection: "column",
              }}
            >
              {/* -- 主机校验 -- */}
              <p
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 20,
                }}
              >
                {hostStep === null && (
                  <>
                    <SyncOutlined spin style={{ marginRight: 16 }} />
                    {msgMap[locale].verifyHost + "..."}
                  </>
                )}
                {hostStep === true && (
                  <>
                    <CheckCircleFilled
                      style={{
                        color: "#52c41a",
                        fontSize: 30,
                        marginRight: 10,
                      }}
                    />
                    {msgMap[locale].verifyHostPass}
                  </>
                )}
                {hostStep === false && (
                  <>
                    <CloseCircleFilled
                      style={{
                        color: "#f73136",
                        fontSize: 30,
                        marginRight: 10,
                      }}
                    />
                    {msgMap[locale].verifyHostFiled}
                  </>
                )}
              </p>

              {/* -- 服务校验 -- */}
              {hostStep && (
                <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: 20,
                  }}
                >
                  {serviceStep === null && (
                    <>
                      <SyncOutlined spin style={{ marginRight: 16 }} />
                      {msgMap[locale].verifyService + "..."}
                    </>
                  )}
                  {serviceStep === true && (
                    <>
                      <CheckCircleFilled
                        style={{
                          color: "#52c41a",
                          fontSize: 30,
                          marginRight: 10,
                        }}
                      />
                      {msgMap[locale].verifyServicePass}
                    </>
                  )}
                  {serviceStep === false && (
                    <>
                      <CloseCircleFilled
                        style={{
                          color: "#f73136",
                          fontSize: 30,
                          marginRight: 10,
                        }}
                      />
                      {msgMap[locale].verifyServiceFiled}
                    </>
                  )}
                </p>
              )}

              {/* -- 模板导入结果 -- */}
              {serviceStep && (
                <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: 20,
                  }}
                >
                  {importStep === null && (
                    <>
                      <SyncOutlined
                        spin
                        style={{
                          marginRight: 16,
                        }}
                      />
                      {msgMap[locale].import + "..."}
                    </>
                  )}
                  {importStep === true && (
                    <>
                      <CheckCircleFilled
                        style={{
                          color: "#52c41a",
                          fontSize: 30,
                          marginRight: 10,
                        }}
                      />
                      {msgMap[locale].importSuccess}
                    </>
                  )}
                  {importStep === false && (
                    <>
                      <CloseCircleFilled
                        style={{
                          color: "#f73136",
                          fontSize: 30,
                          marginRight: 10,
                        }}
                      />
                      {msgMap[locale].importFailed}
                    </>
                  )}
                </p>
              )}

              {/* -- 主机错误信息表格 -- */}
              {tableErrorData.length > 0 && (
                <Table
                  bordered
                  scroll={{ x: 700 }}
                  columns={tableColumns}
                  dataSource={
                    tableErrorData.length > 0
                      ? tableErrorData
                      : tableCorrectData
                  }
                  pagination={{ pageSize: 5 }}
                />
              )}

              {/* -- 服务错误信息表格 -- */}
              {serviceTableErrorData.length > 0 && (
                <Table
                  bordered
                  scroll={{ x: 700 }}
                  columns={serviceTableColumns}
                  dataSource={
                    serviceTableErrorData.length > 0
                      ? serviceTableErrorData
                      : serviceTableCorrectData
                  }
                  pagination={{ pageSize: 5 }}
                />
              )}

              {/* -- 导入 -- */}
              {importStep && (
                <>
                  <p style={{ textAlign: "center" }}>
                    {msgMap[locale].addTotalLeft +
                      " " +
                      numInfo.host_num +
                      " " +
                      msgMap[locale].addTotalRight}
                  </p>
                  <p style={{ textAlign: "center" }}>
                    {msgMap[locale].importLeft +
                      " " +
                      numInfo.product_num +
                      " " +
                      msgMap[locale].importBetween +
                      " " +
                      numInfo.service_num +
                      " " +
                      msgMap[locale].importRight}
                  </p>
                </>
              )}
            </div>

            {/* -- 长时间等待提示 -- */}
            {importResult && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  marginTop: 36,
                }}
              >
                <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: 14,
                  }}
                >
                  {msgMap[locale].waitMsg}
                </p>
              </div>
            )}

            {/* -- 进入安装提示 -- */}
            {importResult && (
              <div
                style={{
                  display: "inline-block",
                  marginLeft: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: 16,
                  }}
                >
                  <SyncOutlined
                    spin
                    style={{
                      marginRight: 16,
                    }}
                  />
                  {msgMap[locale].enterInstall + "..."}
                </p>
              </div>
            )}

            {/* -- 导入失败 -- */}
            {importResult === false && (
              <div
                style={{
                  display: "inline-block",
                  marginLeft: "50%",
                  transform: "translateX(-50%)",
                  marginTop: 30,
                }}
              >
                <Button
                  style={{ marginRight: 16 }}
                  onClick={() => setStepNum(0)}
                >
                  {context.back}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
