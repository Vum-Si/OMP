import { Button, Modal, message, Steps, Tooltip, Table } from "antd";
import { useEffect, useRef, useState } from "react";
import {
  SyncOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
//import BMF from "browser-md5-file";
import { fetchPost, fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse, renderDisc } from "@/utils/utils";

const msgMap = {
  "en-US": {
    scaningMsg: "Scanning service configuration file...",
    noMsg: "Scanning completed, no files found",
    resultMsg: "Scanning completed, result is as follows",
  },
  "zh-CN": {
    scaningMsg: "正在扫描服务配置文件...",
    noMsg: "扫描结束，暂未发现策略文件",
    resultMsg: "扫描完成，结果如下",
  },
};

const columnConfig = (filterValue, context) => {
  return [
    {
      title: context.serviceInstance,
      key: "service_instance_name",
      dataIndex: "service_instance_name",
      align: "center",
    },
    {
      title: context.status,
      key: "status",
      dataIndex: "status",
      align: "center",
      filters: filterValue,
      onFilter: (value, record) => record.status === value,
      filterMode: "tree",
      render: (text) => {
        return renderStatus(text, context);
      },
    },
    {
      title: context.description,
      key: "result",
      dataIndex: "result",
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
  ];
};

const renderStatus = (text, context) => {
  switch (text) {
    case 0:
      return (
        <span>
          {renderDisc("normal", 7, -1)}
          {context.import + context.ln + context.succeeded}
        </span>
      );
    case 1:
      return (
        <span>
          {renderDisc("critical", 7, -1)}
          {context.import + context.ln + context.failed}
        </span>
      );
    case 2:
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.scanning}
        </span>
      );
    case 3:
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.data + context.ln + context.repeat}
        </span>
      );
    case 4:
      return (
        <span>
          {renderDisc("critical", 7, -1)}
          {context.data + context.ln + context.different}
        </span>
      );
    case 5:
      return (
        <span>
          {renderDisc("notMonitored", 7, -1)}
          {context.notFound}
        </span>
      );
    default:
      return (
        <span>
          {renderDisc("notMonitored", 7, -1)}
          {context.unknown}
        </span>
      );
  }
};

const ScanLogClearModal = ({
  scanModalVisibility,
  setScanModalVisibility,
  refresh,
  context,
  locale,
}) => {
  const [stepNum, setStepNum] = useState(0);
  const [loading, setLoading] = useState(false);
  // 源数据
  const [dataSource, setDataSource] = useState();
  // 进行中状态
  const [isComplete, setIsComplete] = useState(false);
  // 过滤数据
  const [filterValue, setFilterValue] = useState([]);
  const isOpen = useRef(null);
  const timer = useRef(null);
  // 失败时的轮训次数标识
  const trainingInRotationNum = useRef(0);
  const defaultFilterValue = [
    {
      text: context.import + context.ln + context.succeeded,
      value: 0,
    },
    {
      text: context.import + context.ln + context.failed,
      value: 1,
    },
    {
      text: context.scanning,
      value: 2,
    },
    {
      text: context.data + context.ln + context.repeat,
      value: 3,
    },
    {
      text: context.data + context.ln + context.different,
      value: 4,
    },
    {
      text: context.notFound,
      value: 5,
    },
  ];

  const fetchData = (operation_uuid) => {
    // 防止在弹窗关闭后还继续轮训
    if (!isOpen.current) {
      return;
    }
    fetchGet(apiRequest.logManagement.logRuleCollect, {
      params: {
        operation_uuid: operation_uuid,
      },
    })
      .then((res) => {
        if (res)
          handleResponse(res, (res) => {
            setStepNum(1);
            setDataSource(res.data?.data || []);
            setIsComplete(res.data?.result_flag === "complete");
            if (res.data?.result_flag === "complete") {
              setFilterValue(defaultFilterValue);
            }
            if (res.data?.result_flag !== "complete") {
              timer.current = setTimeout(() => {
                fetchData(operation_uuid);
              }, 2000);
            }
          });
      })
      .catch((e) => {
        trainingInRotationNum.current++;
        if (trainingInRotationNum.current < 3) {
          setTimeout(() => {
            fetchData(operation_uuid);
          }, 5000);
        } else {
          message.error("采集接口异常，稍后再试");
        }
      })
      .finally((e) => {});
  };

  // 扫描服务端
  const executeScan = () => {
    setStepNum(0);
    setLoading(true);
    fetchPost(apiRequest.logManagement.logRuleCollect)
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.data?.operation_uuid) {
            fetchData(res.data.operation_uuid);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => {
        console.log(e);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    isOpen.current = scanModalVisibility;
    if (scanModalVisibility) {
      executeScan();
    }
  }, [scanModalVisibility]);

  return (
    <Modal
      zIndex={1000}
      title={context.scan + context.ln + context.strategy}
      afterClose={() => {
        setDataSource([]);
        setStepNum(0);
        clearTimeout(timer.current);
        refresh();
        setIsComplete(false);
        setFilterValue([]);
      }}
      onCancel={() => setScanModalVisibility(false)}
      visible={scanModalVisibility}
      footer={null}
      width={1000}
      loading={loading}
      bodyStyle={{
        paddingLeft: 30,
        paddingRight: 30,
      }}
      destroyOnClose
    >
      <Steps type="navigation" size="small" current={stepNum}>
        <Steps.Step
          title={context.scan + context.ln + context.strategy}
          icon={loading && <LoadingOutlined />}
        />
        <Steps.Step
          title={context.scan + context.ln + context.result}
          icon={dataSource?.stage_status == "checking" && <LoadingOutlined />}
        />
      </Steps>

      {/* -- step0 扫描策略 -- */}
      {stepNum == 0 && (
        <div style={{ paddingTop: 30 }}>
          <div
            style={{
              overflow: "hidden",
              paddingBottom: 20,
            }}
          >
            {loading ? (
              <p style={{ textAlign: "center" }}>
                <SyncOutlined
                  spin
                  style={{
                    marginRight: 12,
                  }}
                />
                {msgMap[locale].scaningMsg}
              </p>
            ) : (
              <p style={{ textAlign: "center" }}>
                <span>{msgMap[locale].noMsg}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* -- step1 扫描结果 -- */}
      {stepNum == 1 && (
        <div style={{ paddingLeft: 10, paddingTop: 20 }}>
          <div
            style={{
              overflow: "hidden",
              paddingBottom: 10,
            }}
          >
            {isComplete ? (
              <p style={{ textAlign: "center" }}>
                <CheckCircleOutlined
                  style={{
                    color: "#76ca68",
                    marginRight: 12,
                    fontSize: 16,
                  }}
                />
                {msgMap[locale].resultMsg}
              </p>
            ) : (
              <p style={{ textAlign: "center" }}>
                <SyncOutlined
                  spin
                  style={{
                    marginRight: 12,
                  }}
                />
                {msgMap[locale].scaningMsg}
              </p>
            )}
          </div>
          <Table
            size="middle"
            style={{ border: "1px solid #e3e3e3" }}
            columns={columnConfig(filterValue, context)}
            scroll={{ y: 260 }}
            pagination={false}
            dataSource={dataSource}
          />
          {isComplete && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 20,
                position: "relative",
                left: -20,
              }}
            >
              <Button
                type="primary"
                onClick={() => {
                  setScanModalVisibility(false);
                }}
              >
                {context.ok}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ScanLogClearModal;
