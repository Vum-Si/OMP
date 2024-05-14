import { Button, Modal, Steps, Tooltip, Table } from "antd";
import { useEffect, useRef, useState } from "react";
import {
  LoadingOutlined,
  CheckCircleFilled,
  ScanOutlined,
} from "@ant-design/icons";
//import BMF from "browser-md5-file";
import { fetchPost, fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse } from "@/utils/utils";

const msgMap = {
  "en-US": {
    scanMsg: "Scanning server...",
    noPkgMsg: "Scan completed, server has no installation package!",
    uploadLeft: "Please upload the installation package to the",
    uploadRight: "directory and rescan it",
    pathMsg: "The path to save the published package",
  },
  "zh-CN": {
    scanMsg: "正在扫描服务端...",
    noPkgMsg: "扫描结束，服务端暂无安装包！",
    uploadLeft: "请将安装包上传至",
    uploadRight: "目录后重新扫描",
    pathMsg: "发布完成的安装包存放路径",
  },
};

const ScanServerModal = ({
  scanServerModalVisibility,
  setScanServerModalVisibility,
  refresh,
  context,
  locale,
}) => {
  const [stepNum, setStepNum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState();
  const isOpen = useRef(null);
  const timer = useRef(null);
  // 失败时的轮训次数标识
  const trainingInRotationNum = useRef(0);

  const fetchData = (data) => {
    // 防止在弹窗关闭后还继续轮训
    if (!isOpen.current) {
      return;
    }
    fetchGet(apiRequest.appStore.localPackageScanResult, {
      params: {
        uuid: data.uuid,
        package_names: data.package_names.join(","),
      },
    })
      .then((res) => {
        // timer.current = setTimeout(() => {
        //   fetchData(data);
        // }, 2000);
        if (res)
          handleResponse(res, (res) => {
            if (res.data.stage_status.includes("check")) {
              setStepNum(1);
            }
            if (res.data.stage_status.includes("publish")) {
              setStepNum(2);
            }
            setDataSource(res.data);
            if (res.data && res.data.stage_status.includes("ing")) {
              timer.current = setTimeout(() => {
                fetchData(data);
              }, 2000);
            }
          });
      })
      .catch((e) => {
        trainingInRotationNum.current++;
        if (trainingInRotationNum.current < 3) {
          setTimeout(() => {
            fetchData(data);
          }, 5000);
        } else {
          setDataSource((dataS) => {
            let arr = dataS?.package_detail?.map((item) => {
              return {
                ...item,
                status: 9,
              };
            });
            return {
              ...dataS,
              package_detail: arr,
            };
          });
        }
      })
      .finally((e) => {});
  };

  // 扫描服务端executeLocalPackageScan
  const executeLocalPackageScan = () => {
    setStepNum(0);
    setLoading(true);
    fetchPost(apiRequest.appStore.executeLocalPackageScan)
      .then((res) => {
        handleResponse(res, (res) => {
          if (
            res.data &&
            res.data?.package_names?.filter((item) => item).length > 0
          ) {
            fetchData(res.data);
          }
        });
      })
      .catch((e) => {
        console.log(e);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    isOpen.current = scanServerModalVisibility;
    if (scanServerModalVisibility) {
      executeLocalPackageScan();
    }
  }, [scanServerModalVisibility]);

  return (
    <Modal
      zIndex={1000}
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <ScanOutlined />
          </span>
          <span>
            {stepNum === 0 &&
              context.scan + context.ln + context.installPackage}
            {stepNum === 1 &&
              context.verify + context.ln + context.installPackage}
            {stepNum === 2 &&
              context.publish + context.ln + context.installPackage}
          </span>
        </span>
      }
      afterClose={() => {
        setDataSource([]);
        setStepNum(0);
        clearTimeout(timer.current);
        refresh();
      }}
      onCancel={() => setScanServerModalVisibility(false)}
      visible={scanServerModalVisibility}
      footer={null}
      width={1000}
      loading={loading}
      bodyStyle={{
        paddingLeft: 30,
        paddingRight: 30,
      }}
      destroyOnClose
    >
      {/* -- 顶部步骤条 -- */}
      <Steps type="navigation" size="small" current={stepNum}>
        <Steps.Step
          title={context.scan + context.ln + context.installPackage}
          icon={loading && <LoadingOutlined />}
        />
        <Steps.Step
          title={context.verify + context.ln + context.data}
          icon={dataSource?.stage_status == "checking" && <LoadingOutlined />}
        />
        <Steps.Step
          title={context.publish}
          icon={dataSource?.stage_status == "publishing" && <LoadingOutlined />}
        />
      </Steps>

      {/* -- step0 扫描 -- */}
      {stepNum == 0 && (
        <div style={{ paddingLeft: 30, paddingTop: 30 }}>
          <div
            style={{
              overflow: "hidden",
              paddingBottom: 20,
            }}
          >
            {loading ? (
              <p style={{ textAlign: "center" }}>{msgMap[locale].scanMsg}</p>
            ) : (
              <p style={{ textAlign: "center" }}>
                <p>{msgMap[locale].noPkgMsg}</p>
                <p>
                  {msgMap[locale].uploadLeft + " "}
                  <span style={{ fontWeight: 500, color: "rgba(0,0,0,0.8)" }}>
                    omp/package_hub/back_end_verified/
                  </span>{" "}
                  {msgMap[locale].uploadRight}
                </p>
              </p>
            )}
          </div>
        </div>
      )}

      {/* -- step1 校验 -- */}
      {stepNum == 1 && (
        <div style={{ paddingLeft: 30, paddingTop: 30 }}>
          <div
            style={{
              overflow: "hidden",
              paddingBottom: 20,
            }}
          >
            <p style={{ textAlign: "center" }}>{dataSource?.message}</p>
          </div>
          <Table
            style={{ border: "1px solid #e3e3e3" }}
            size="middle"
            //hideOnSinglePage
            pagination={{
              defaultPageSize: 5,
            }}
            columns={[
              {
                title: context.package + context.name,
                key: "name",
                dataIndex: "name",
                align: "center",
                width: 120,
              },
              {
                title: context.status,
                key: "status",
                dataIndex: "status",
                align: "center",
                ellipsis: true,
                width: 90,
                render: (text) => {
                  switch (text) {
                    case 2:
                      return context.verifying;
                      break;
                    case 1:
                      return context.failed;
                      break;
                    case 0:
                      return context.passed;
                      break;
                    case 9:
                      return context.network + context.ln + context.error;
                      break;
                    default:
                      break;
                  }
                },
              },
              {
                title: context.description,
                key: "message",
                dataIndex: "message",
                align: "center",
                width: 140,
                render: (text) => {
                  return text ? text : "-";
                },
              },
            ]}
            dataSource={dataSource?.package_detail?.map((item, idx) => {
              return {
                ...item,
                name:
                  dataSource &&
                  dataSource.package_names_lst &&
                  dataSource.package_names_lst[idx],
              };
            })}
          />
          {dataSource?.stage_status == "check_all_failed" && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 60,
                position: "relative",
                left: -20,
              }}
            >
              <Button
                type="primary"
                //disabled={dataSource?.stage_status !== "published"}
                //loading={loading}
                onClick={() => {
                  setScanServerModalVisibility(false);
                }}
              >
                {context.ok}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* -- step2 发布 -- */}
      {stepNum == 2 && (
        <div style={{ paddingLeft: 30, paddingTop: 30 }}>
          <div
            style={{
              overflow: "hidden",
              paddingBottom: 20,
            }}
          >
            {dataSource?.stage_status == "published" && (
              <p style={{ textAlign: "center", fontSize: 20 }}>
                <CheckCircleFilled
                  style={{
                    paddingRight: 10,
                    color: "#3cbd35",
                    fontSize: 24,
                    position: "relative",
                    top: 1,
                  }}
                />
                {context.publish + context.ln + context.completed}
              </p>
            )}
            <p style={{ textAlign: "center" }}>{dataSource?.message}</p>
            <p style={{ textAlign: "center" }}>
              {msgMap[locale].pathMsg + " "}
              <span style={{ fontWeight: 500, color: "rgba(0,0,0,0.8)" }}>
                omp/package_hub/verified/
              </span>{" "}
            </p>
          </div>
          <Table
            style={{ border: "1px solid #e3e3e3" }}
            size="middle"
            pagination={{
              defaultPageSize: 5,
            }}
            columns={[
              {
                title: context.package + context.name,
                key: "name",
                dataIndex: "name",
                align: "center",
              },
              {
                title: context.status,
                key: "status",
                dataIndex: "status",
                align: "center",
                render: (text) => {
                  switch (text) {
                    case 3:
                      return context.succeeded;
                      break;
                    case 4:
                      return context.failed;
                      break;
                    case 5:
                      return context.publishing;
                      break;
                    case 9:
                      return context.network + context.ln + context.error;
                      break;
                    default:
                      break;
                  }
                },
              },
              {
                title: context.description,
                key: "message",
                dataIndex: "message",
                align: "center",
                ellipsis: true,
                render: (text) => {
                  return (
                    <Tooltip title={text} placement="top">
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {text ? text : "-"}
                      </div>
                    </Tooltip>
                  );
                },
              },
            ]}
            dataSource={dataSource?.package_detail?.map((item, idx) => {
              return {
                ...item,
                name:
                  dataSource &&
                  dataSource.package_names_lst &&
                  dataSource.package_names_lst[idx],
              };
            })}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 60,
              position: "relative",
              left: -20,
            }}
          >
            <Button
              type="primary"
              disabled={dataSource?.stage_status !== "published"}
              //loading={loading}
              onClick={() => {
                setScanServerModalVisibility(false);
              }}
            >
              {context.ok}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ScanServerModal;
