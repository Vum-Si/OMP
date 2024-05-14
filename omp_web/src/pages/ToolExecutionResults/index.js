import { OmpContentWrapper } from "@/components";
import { Button, Collapse, Tooltip, Table, Spin } from "antd";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import styles from "./index.module.less";
import {
  CaretRightOutlined,
  QuestionCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { handleResponse, _idxInit, downloadFile } from "@/utils/utils";
import moment from "moment";
import { locales } from "@/config/locales";

const { Panel } = Collapse;

const statusColorMap = ["#ffbf00", "#ffbf00", "#76ca68", "#f04134", "#f04134"];
const msgMap = {
  "en-US": {
    reportMsg: "View complete report",
    userMsg: "The platform user executing this task",
    targetMsg:
      "The target object type for utility operation can be a host or a specific service",
    totalMsg: "The total number of objects executed this time",
    userDetailMsg:
      "The username used by the tool to execute on the target host",
  },
  "zh-CN": {
    reportMsg: "查看完整报告",
    userMsg: "执行本次任务的平台用户",
    targetMsg: "实用工具操作的目标对象类型，可以是主机或者具体服务",
    totalMsg: "本次执行对象的总计",
    userDetailMsg: "工具在目标主机执行的用户名",
  },
};

const ToolExecutionResults = ({ locale }) => {
  const history = useHistory();
  const locationArr = useLocation().pathname.split("/");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState({});
  // 当前选中的ip
  const [currentIp, setCurrentIp] = useState(null);
  // 当前选中的状态
  const [currentStatus, setCurrentStatus] = useState(null);
  const timer = useRef(null);
  const context = locales[locale].common;

  const statusTextMap = [
    context.waiting,
    context.executing,
    context.succeeded,
    context.failed,
    context.task + context.ln + context.timeout,
  ];

  const queryData = (init) => {
    init && setLoading(true);
    fetchGet(
      `${apiRequest.utilitie.queryResult}${
        locationArr[locationArr.length - 1]
      }/`
    )
      .then((res) => {
        handleResponse(res, (res) => {
          setInfo(res.data);
          if (res.data.tool_detail) {
            if (init === "init") {
              setCurrentIp(res.data.tool_detail[0].ip);
              setCurrentStatus(res.data.tool_detail[0].status);
            }
          }

          // 等待执行 和 执行中 要继续请求
          if (res.data.status == 0 || res.data.status == 1) {
            timer.current = setTimeout(() => {
              queryData();
            }, 5000);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        init && setLoading(false);
      });
  };

  // 执行结果当前选中的项
  const currentItem = info.tool_detail?.filter((i) => i.ip == currentIp)[0];

  // 确定执行结果的tab状态
  const tabRenderStatus = (status) => {
    return info.tool_detail?.filter((i) => i.status == status).length;
  };

  // 下发执行脚本按钮
  const executeAutoTask = () => {
    setLoading(true);
    fetchPost(apiRequest.utilitie.autoUtl, {
      body: {
        ip: info.tool_detail[0].ip,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          window.open(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    queryData("init");
    return () => {
      timer.current && clearTimeout(timer.current);
    };
  }, []);

  return (
    <OmpContentWrapper
      wrapperStyle={{ padding: "10px 30px 30px 30px", backgroundColor: "#fff" }}
    >
      <Spin spinning={loading}>
        {/* -- 顶部任务名/状态/返回 -- */}
        <div className={styles.resultTitle}>
          <div style={{ display: "flex" }}>
            {info.task_name || "-"}{" "}
            <span
              className={styles.resultTitleStatus}
              style={{ color: statusColorMap[info.status] }}
            >
              {statusTextMap[info.status]}
            </span>
          </div>
          <div>
            {info.task_name === "自动测试任务" &&
              statusTextMap[info.status] === context.succeeded && (
                <a
                  style={{ fontSize: 14, marginRight: 18 }}
                  onClick={() => executeAutoTask()}
                >
                  {msgMap[locale].reportMsg}
                </a>
              )}
            <a style={{ fontSize: 14 }} onClick={() => history?.goBack()}>
              {context.back}
            </a>
          </div>
        </div>

        <Collapse
          bordered={false}
          defaultActiveKey={["baseInfo", "executionInfo", "executionResult"]}
          onChange={() => {}}
          style={{ marginTop: 0, border: "none", backgroundColor: "#fff" }}
          expandIcon={({ isActive }) => (
            <CaretRightOutlined rotate={isActive ? 90 : 0} />
          )}
        >
          {/* -- 基本信息 -- */}
          <Panel
            header={context.basic + context.ln + context.info}
            key="baseInfo"
            className={styles.panelItem}
            style={{ paddingBottom: 1 }}
          >
            <div className={styles.baseTable}>
              <div className={styles.baseTableFirstRow}>
                <div className={styles.baseTableItem}>
                  <div className={styles.baseTableItemLabel}>
                    {context.runUser}{" "}
                    <Tooltip title={msgMap[locale].userMsg}>
                      <QuestionCircleOutlined
                        style={{
                          cursor: "pointer",
                          fontWeight: 400,
                          marginLeft: 5,
                        }}
                      />
                    </Tooltip>
                  </div>
                  <div className={styles.baseTableItemContent}>
                    {info.operator || "-"}
                  </div>
                </div>

                <div className={styles.baseTableItem}>
                  <div className={styles.baseTableItemLabel}>
                    {context.target}{" "}
                    <Tooltip title={msgMap[locale].targetMsg}>
                      <QuestionCircleOutlined
                        style={{
                          cursor: "pointer",
                          fontWeight: 400,
                          marginLeft: 5,
                        }}
                      />
                    </Tooltip>
                  </div>
                  <div className={styles.baseTableItemContent}>
                    {info.tool?.target_name || "-"}
                  </div>
                </div>

                <div className={styles.baseTableItem}>
                  <div className={styles.baseTableItemLabel}>
                    {context.total}{" "}
                    <Tooltip title={msgMap[locale].totalMsg}>
                      <QuestionCircleOutlined
                        style={{
                          cursor: "pointer",
                          fontWeight: 400,
                          marginLeft: 5,
                        }}
                      />
                    </Tooltip>
                  </div>
                  <div className={styles.baseTableItemContent}>
                    {info.count || "-"}
                  </div>
                </div>

                <div
                  className={styles.baseTableItem}
                  style={{ borderRight: "none" }}
                >
                  <div className={styles.baseTableItemLabel}>
                    {context.runUser}
                    <Tooltip title={msgMap[locale].userDetailMsg}>
                      <QuestionCircleOutlined
                        style={{
                          cursor: "pointer",
                          fontWeight: 400,
                          marginLeft: 5,
                        }}
                      />
                    </Tooltip>
                  </div>
                  <div className={styles.baseTableItemContent}>
                    {" "}
                    {info.run_user || "-"}
                  </div>
                </div>
              </div>

              <div className={styles.baseTableSecondRow}>
                <div className={styles.baseTableItem}>
                  <div className={styles.baseTableItemLabel}>
                    {context.timeout}
                    <Tooltip title="工具在目标主机的执行的超时时间">
                      <QuestionCircleOutlined
                        style={{
                          cursor: "pointer",
                          fontWeight: 400,
                          marginLeft: 5,
                        }}
                      />
                    </Tooltip>
                  </div>
                  <div className={styles.baseTableItemContent}>
                    {info.time_out || "-"}s
                  </div>
                </div>

                <div className={styles.baseTableItem}>
                  <div className={styles.baseTableItemLabel}>
                    {context.beginTime}
                  </div>
                  <div className={styles.baseTableItemContent}>
                    {info.start_time
                      ? moment(info.start_time).format("YYYY-MM-DD HH:mm:ss")
                      : "-"}
                  </div>
                </div>

                <div className={styles.baseTableItem}>
                  <div className={styles.baseTableItemLabel}>
                    {context.endTime}
                  </div>
                  <div className={styles.baseTableItemContent}>
                    {" "}
                    {info.end_time
                      ? moment(info.end_time).format("YYYY-MM-DD HH:mm:ss")
                      : "-"}
                  </div>
                </div>

                <div
                  className={styles.baseTableItem}
                  style={{ borderRight: "none" }}
                >
                  <div className={styles.baseTableItemLabel}>
                    {context.duration}
                  </div>
                  <div className={styles.baseTableItemContent}>
                    {info.duration || "-"}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {/* -- 参数信息 -- */}
          <Panel
            header={context.parameter + context.ln + context.info}
            key="executionInfo"
            className={styles.panelItem}
            style={{ marginTop: 25 }}
          >
            <div style={{ border: "1px solid #d6d6d6", marginTop: 10 }}>
              <Table
                size="middle"
                columns={[
                  {
                    title: context.name,
                    key: "name",
                    dataIndex: "name",
                    align: "center",
                    width: 120,
                    render: (text) => text || "-",
                  },
                  {
                    title: context.value,
                    key: "value",
                    dataIndex: "value",
                    width: 120,
                    align: "center",
                  },
                ]}
                pagination={false}
                dataSource={info.tool_args}
              />
            </div>
          </Panel>

          {/* -- 执行结果 -- */}
          <Panel
            header={context.execute + context.ln + context.result}
            key="executionResult"
            className={styles.panelItem}
            style={{ marginTop: 25 }}
          >
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  height: 36,
                  width: 450,
                  display: "flex",
                  borderTop: "1px solid #d6d6d6",
                  borderLeft: "1px solid #d6d6d6",
                  borderRight: "1px solid #d6d6d6",
                  backgroundColor: "#fff",
                  position: "relative",
                  top: 1,
                }}
              >
                {/* -- 等待 -- */}
                <div
                  style={{
                    flex: 1,
                    height: 35,
                    lineHeight: "35px",
                    textAlign: "center",
                    color:
                      currentStatus == 0
                        ? "#007bf3"
                        : tabRenderStatus(0) == 0 && "rgba(0, 0, 0, 0.25)",
                    cursor:
                      currentStatus == 0
                        ? "pointer"
                        : tabRenderStatus(0) == 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                  onClick={() => {
                    if (tabRenderStatus(0) !== 0) {
                      setCurrentStatus(0);
                      setCurrentIp(
                        info.tool_detail?.filter((i) => i.status == 0)[0].ip
                      );
                    }
                  }}
                >
                  {context.waiting}({tabRenderStatus(0)})
                </div>

                {/* -- 执行中 -- */}
                <div
                  style={{
                    flex: 1,
                    height: 35,
                    lineHeight: "35px",
                    textAlign: "center",
                    color:
                      currentStatus == 1
                        ? "#007bf3"
                        : tabRenderStatus(1) == 0 && "rgba(0, 0, 0, 0.25)",
                    cursor:
                      currentStatus == 1
                        ? "pointer"
                        : tabRenderStatus(1) == 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                  onClick={() => {
                    if (tabRenderStatus(1) !== 0) {
                      setCurrentStatus(1);
                      setCurrentIp(
                        info.tool_detail?.filter((i) => i.status == 1)[0].ip
                      );
                    }
                  }}
                >
                  {context.executing}({tabRenderStatus(1)})
                </div>

                {/* -- 成功 -- */}
                <div
                  style={{
                    flex: 1,
                    height: 35,
                    lineHeight: "35px",
                    textAlign: "center",
                    color:
                      currentStatus == 2
                        ? "#007bf3"
                        : tabRenderStatus(2) == 0 && "rgba(0, 0, 0, 0.25)",
                    cursor:
                      currentStatus == 2
                        ? "pointer"
                        : tabRenderStatus(2) == 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                  onClick={() => {
                    if (tabRenderStatus(2) !== 0) {
                      setCurrentStatus(2);
                      setCurrentIp(
                        info.tool_detail?.filter((i) => i.status == 2)[0].ip
                      );
                    }
                  }}
                >
                  {context.succeeded}({tabRenderStatus(2)})
                </div>

                {/* -- 失败 -- */}
                <div
                  style={{
                    flex: 1,
                    height: 35,
                    lineHeight: "35px",
                    textAlign: "center",
                    color:
                      currentStatus == 3
                        ? "#007bf3"
                        : tabRenderStatus(3) == 0 && "rgba(0, 0, 0, 0.25)",
                    cursor:
                      currentStatus == 3
                        ? "pointer"
                        : tabRenderStatus(3) == 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                  onClick={() => {
                    if (tabRenderStatus(3) !== 0) {
                      setCurrentStatus(3);
                      setCurrentIp(
                        info.tool_detail?.filter((i) => i.status == 3)[0].ip
                      );
                    }
                  }}
                >
                  {context.failed}({tabRenderStatus(3)})
                </div>

                {/* -- 超时 -- */}
                <div
                  style={{
                    flex: 1,
                    height: 35,
                    lineHeight: "35px",
                    textAlign: "center",
                    color:
                      currentStatus == 4
                        ? "#007bf3"
                        : tabRenderStatus(4) == 0 && "rgba(0, 0, 0, 0.25)",
                    cursor:
                      currentStatus == 4
                        ? "pointer"
                        : tabRenderStatus(4) == 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                  onClick={() => {
                    if (tabRenderStatus(4) !== 0) {
                      setCurrentStatus(4);
                      setCurrentIp(
                        info.tool_detail?.filter((i) => i.status == 4)[0].ip
                      );
                    }
                  }}
                >
                  {context.timeout}({tabRenderStatus(4)})
                </div>
              </div>

              <div
                style={{
                  height: 400,
                  border: "1px solid #d6d6d6",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: 160,
                    height: "100%",
                    overflowY: "auto",
                    // paddingTop: 5,
                  }}
                >
                  {info.tool_detail
                    ?.filter((i) => i.status == currentStatus)
                    .map((item) => {
                      return (
                        <div
                          onClick={() => {
                            setCurrentIp(item.ip);
                          }}
                          style={{
                            cursor: "pointer",
                            padding: "10px 0px",
                            backgroundColor:
                              currentIp == item.ip ? "#2f7bed" : "#fff",
                            color: currentIp == item.ip ? "#fff" : "#37474d",
                            textAlign: "center",
                          }}
                        >
                          {item.ip}
                        </div>
                      );
                    })}
                </div>

                {/* -- 下载文件 -- */}
                <div
                  style={{
                    flex: 1,
                    height: "100%",
                    backgroundColor: "#f6f6f6",
                    padding: 10,
                  }}
                >
                  {currentItem && currentItem.url && (
                    <Button
                      style={{ marginBottom: 10 }}
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        downloadFile(`/${currentItem.url}`);
                      }}
                    >
                      <span style={{ color: "#818181" }}>
                        {context.download + context.ln + context.file}
                      </span>
                    </Button>
                  )}
                  <div
                    style={{
                      height:
                        currentItem && currentItem.url
                          ? "calc(100% - 40px)"
                          : "100%",
                      backgroundColor: "#000000",
                      padding: 20,
                      paddingTop: 25,
                      color: "#fff",
                      wordWrap: "break-word",
                      wordBreak: "break-all",
                      whiteSpace: "pre-line",
                      overflowY: "auto",
                      overflowX: "hidden",
                    }}
                  >
                    {currentItem?.log}
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </Collapse>
      </Spin>
    </OmpContentWrapper>
  );
};

export default ToolExecutionResults;
