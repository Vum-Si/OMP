import { OmpToolTip } from "@/components";
import {
  nonEmptyProcessing,
  renderDisc,
  RenderStatusForResult,
} from "@/utils/utils";
import { DesktopOutlined } from "@ant-design/icons";
import { Drawer, Tooltip, Spin, Timeline } from "antd";
import moment from "moment";
import styles from "../index.module.less";
import { useRef } from "react";

const colorConfig = {
  normal: null,
  warning: "#ffbf00",
  critical: "#f04134",
};

const msgMap = {
  "en-US": {
    nosshTitle: "No SSH automatic host addition",
    oneMsg: "1. Modify OMP configuration file",
    oneTrueMsg: "# In the scenario without SSH, please change to true",
    twoMsg: "2. Restart OMP service",
    threeMsg:
      "3. Login to all servers that require hosting, and execute the following command in the install directory (such as /data)",
    comMsg: "This command will",
  },
  "zh-CN": {
    nosshTitle: "无 SSH 自动添加主机",
    oneMsg: "1. 修改 OMP 配置文件",
    oneTrueMsg: "# 无ssh场景下，请更改为 true",
    twoMsg: "2. 重启 OMP 服务",
    threeMsg: "3. 登陆所有需要纳管的服务器，在安装目录 (如 /data) 执行如下命令",
    comMsg: "该命令会",
  },
};

export const NoSshUrlInfo = ({
  isShowDrawer,
  setIsShowDrawer,
  urlData,
  context,
  locale,
}) => {
  return (
    <Drawer
      title={msgMap[locale].nosshTitle}
      placement="right"
      closable={true}
      width={640}
      style={{ height: "calc(100%)" }}
      onClose={() => setIsShowDrawer(false)}
      visible={isShowDrawer}
      destroyOnClose={true}
    >
      <div
        style={{
          marginTop: -30,
          padding: 16,
          paddingTop: 32,
        }}
      >
        <p>
          {msgMap[locale].oneMsg + " : "}
          <strong>omp/config/omp.yaml</strong>
        </p>
        <p
          style={{
            paddingLeft: 2,
            marginLeft: 14,
            marginTop: -4,
            border: "1px solid #ebeef2",
            backgroundColor: "rgb(40, 54, 70)",
            color: "white",
          }}
        >
          {msgMap[locale].oneTrueMsg}
          <br />
          is_no_ssh: true
        </p>
        <p>
          {msgMap[locale].twoMsg + " : "}
          <strong>uwsgi、worker</strong>
        </p>
        <p
          style={{
            paddingLeft: 2,
            marginLeft: 14,
            marginTop: -4,
            border: "1px solid #ebeef2",
            backgroundColor: "rgb(40, 54, 70)",
            color: "white",
          }}
        >
          bash omp/scripts/omp uwsgi restart
          <br />
          bash omp/scripts/omp worker restart
        </p>
        <p>
          {msgMap[locale].threeMsg}
          <br />
          <span style={{ marginLeft: 15 }}>
            {msgMap[locale].comMsg + " : "}
          </span>
          <ul style={{ marginTop: 4 }}>
            <li>
              {context.install}{" "}
              <strong>
                {context.hostAgent + " & " + context.monitorAgent}
              </strong>
            </li>
            <li>
              {context.upgrade} <strong>{context.hostAgent}</strong>
            </li>
          </ul>
        </p>
        <p
          style={{
            paddingLeft: 2,
            marginLeft: 14,
            marginTop: -4,
            border: "1px solid #ebeef2",
            backgroundColor: "rgb(40, 54, 70)",
            color: "white",
          }}
        >
          {urlData}
        </p>
      </div>
    </Drawer>
  );
};

export const DetailHost = ({
  isShowDrawer,
  setIsShowDrawer,
  loading,
  data,
  baseEnv,
  context,
}) => {
  // 组件图片字符串
  const componentImgStr = `<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg t="1634633143436" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2388" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200"><defs><style type="text/css"></style></defs><path d="M882.521 282.988L527.534 78.127c-8.98-5.219-20.146-5.219-29.127 0L143.42 282.988c-8.98 5.219-14.563 14.806-14.563 25.244v409.842c0 10.437 5.583 20.025 14.563 25.244L498.407 948.3c4.491 2.548 9.588 3.884 14.563 3.884s10.073-1.334 14.563-3.884L882.52 743.318c8.98-5.219 14.563-14.806 14.563-25.244V308.232c0-10.437-5.583-20.025-14.563-25.244zM838.83 701.326L512.971 889.438 187.112 701.326V325.101l325.859-188.112L838.83 325.101v376.225z" p-id="2389"></path><path d="M270.124 383.476c-8.01 13.957-3.277 31.797 10.681 39.807l202.676 116.994v231.439c0 16.142 12.986 29.127 29.127 29.127s29.127-12.986 29.127-29.127V540.641l203.404-117.479c13.957-8.01 18.69-25.851 10.681-39.807s-25.851-18.69-39.807-10.681L512.973 489.91l-203.04-117.236c-13.957-8.01-31.676-3.155-39.807 10.801z" p-id="2390"></path></svg>`;

  const wrapperRef = useRef(null);
  return (
    <Drawer
      title={
        <div style={{ display: "flex" }}>
          <DesktopOutlined style={{ position: "relative", top: 3, left: -5 }} />
          {context.host + context.ln + context.detail}
          <span style={{ paddingLeft: 30, fontWeight: 400, fontSize: 15 }}>
            {context.ip} : {isShowDrawer.record.ip}
          </span>
        </div>
      }
      headerStyle={{ padding: "19px 24px" }}
      placement="right"
      closable={true}
      width={`calc(100% - 200px)`}
      style={{ height: "calc(100%)" }}
      onClose={() => {
        setIsShowDrawer({
          ...isShowDrawer,
          isOpen: false,
        });
      }}
      visible={isShowDrawer.isOpen}
      bodyStyle={{
        padding: 10,
        //paddingLeft:10,
        backgroundColor: "#e7e9f0", //"#f4f6f8"
        height: "calc(100%)",
      }}
      destroyOnClose={true}
    >
      <div
        style={{ height: "calc(100% - 14px)", width: "100%", display: "flex" }}
      >
        {/* -- 基本信息 -- */}
        <div
          style={{
            height: "100%",
            width: "100%",
            borderRadius: "5px",
            backgroundColor: "#fff",
            flex: 4,
            padding: 20,
            overflowY: "auto",
          }}
        >
          <div style={{ paddingBottom: 20, fontSize: 15, fontWeight: 500 }}>
            {context.basic + context.ln + context.info}
          </div>
          <div
            style={{
              display: "flex",
              //paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.instanceName}</div>
            <div style={{ flex: 1 }}>{isShowDrawer.record.instance_name}</div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.hostname}</div>
            <div style={{ flex: 1 }}>
              {nonEmptyProcessing(isShowDrawer.record.host_name)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.ip}</div>
            <div style={{ flex: 1 }}>{isShowDrawer.record.ip}</div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.sshPort}</div>
            <div style={{ flex: 1 }}>{isShowDrawer.record.port}</div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.username}</div>
            <div style={{ flex: 1 }}>{isShowDrawer.record.username}</div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.system}</div>
            <div style={{ flex: 1 }}>{isShowDrawer.record.operate_system}</div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.cpu}</div>
            <div style={{ flex: 1 }}>
              {nonEmptyProcessing(isShowDrawer.record.cpu)} c
            </div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.memory}</div>
            <div style={{ flex: 1 }}>
              {nonEmptyProcessing(isShowDrawer.record.memory)} G
            </div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.disk}</div>
            <div style={{ flex: 1 }}>
              {isShowDrawer.record.disk
                ? Object.keys(isShowDrawer.record.disk).map((item) => (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ width: "65%" }}>
                        <OmpToolTip maxLength={16}>{item}</OmpToolTip>
                      </span>
                      <span style={{ width: "35%" }}>
                        {isShowDrawer.record.disk[item]} G
                      </span>
                    </div>
                  ))
                : "-"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.created}</div>
            <div style={{ flex: 1 }}>
              {moment(isShowDrawer.record.created).format(
                "YYYY-MM-DD HH:mm:ss"
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.maintainMode}</div>
            <div style={{ flex: 1 }}>
              {isShowDrawer.record.is_maintenance
                ? context.open
                : context.close}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              paddingTop: 15,
              paddingBottom: 5,
              borderBottom: "solid 1px rgb(220,220,220)",
            }}
          >
            <div style={{ flex: 1 }}>{context.init}</div>
            <div style={{ flex: 1 }}>
              {renderInitStatue(isShowDrawer.record.init_status, context)}
            </div>
          </div>
        </div>

        {/* -- 右侧板块 -- */}
        <div
          style={{
            height: "100%",
            width: "100%",
            flex: 7,
            marginLeft: 20,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {/* -- Agent -- */}
          <div
            style={{
              height: "100%",
              width: "49%",
              //border: "solid 1px rgb(220,220,220)",
              borderRadius: "5px",
              backgroundColor: "#fff",
              height: 200,
              padding: 20,
            }}
          >
            <div style={{ paddingBottom: 22, fontSize: 15, fontWeight: 500 }}>
              {context.agent}
            </div>
            <div style={{ display: "flex", paddingTop: 15, paddingBottom: 15 }}>
              <div style={{ flex: 1 }}>{context.hostAgent}</div>
              <div style={{ flex: 1 }}>
                {renderStatus(isShowDrawer.record.host_agent, context)}
              </div>
            </div>
            <div style={{ display: "flex", paddingTop: 15, paddingBottom: 15 }}>
              <div style={{ flex: 1 }}>{context.monitorAgent}</div>
              <div style={{ flex: 1 }}>
                {renderStatus(isShowDrawer.record.monitor_agent, context)}
              </div>
            </div>
          </div>

          {/* -- 部署组件信息 -- */}
          <div
            style={{
              height: "100%",
              width: "48%",
              //border: "solid 1px rgb(220,220,220)",
              borderRadius: "5px",
              backgroundColor: "#fff",
              marginLeft: "2%",
              height: 200,
              padding: 20,
            }}
          >
            <Spin spinning={loading} wrapperClassName={styles.omp_spin_wrapper}>
              <div style={{ paddingBottom: 22, fontSize: 15, fontWeight: 500 }}>
                {context.component + context.ln + context.info}
              </div>
              <div
                style={{ display: "flex", paddingTop: 15, paddingBottom: 15 }}
              >
                <div style={{ flex: 1 }}>
                  {context.component + context.ln + context.total}
                </div>
                <div style={{ flex: 1 }}>
                  {isShowDrawer.record.service_num}
                  {context.ge}
                </div>
              </div>
              <div
                style={{ display: "flex", paddingTop: 15, paddingBottom: 15 }}
              >
                <div style={{ flex: 1 }}>
                  {context.basic + context.ln + context.env}
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    marginLeft: -20,
                  }}
                >
                  {baseEnv.length > 0 ? (
                    baseEnv.map((item) => {
                      return (
                        <Tooltip
                          title={`${item.service__app_name} ${item.service__app_version}`}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              border: "1px solid #a8d0f8",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              marginLeft: 4,
                              marginRight: 4,
                              overflow: "hidden",
                            }}
                            dangerouslySetInnerHTML={{
                              __html: item.service__app_logo || componentImgStr,
                            }}
                            key={item.service__app_name}
                          ></div>
                        </Tooltip>
                      );
                    })
                  ) : (
                    <div style={{ marginLeft: 10 }}>{context.none}</div>
                  )}
                </div>
              </div>
            </Spin>
          </div>

          {/* -- 历史记录 -- */}
          <div
            ref={wrapperRef}
            style={{
              height: "calc(100% - 220px)",
              marginTop: 20,
              width: "99%",
              //border: "solid 1px rgb(220,220,220)",
              borderRadius: "5px",
              backgroundColor: "#fff",
              //height:200
              padding: 20,
              //overflow:"hidden"
            }}
          >
            <div style={{ paddingBottom: 20, fontSize: 15, fontWeight: 500 }}>
              {context.historicRecords}
            </div>
            <Spin spinning={loading} wrapperClassName={styles.omp_spin_wrapper}>
              <Timeline
                style={{
                  overflowY: "scroll",
                  paddingTop: 10,
                  height: wrapperRef.current
                    ? wrapperRef.current?.offsetHeight - 100
                    : 100,
                }}
              >
                {data.map((item) => {
                  return (
                    <Timeline.Item key={item.id}>
                      <p style={{ color: "#595959" }}>
                        <RenderStatusForResult result={item?.result} />[
                        {item.username}] {item.description}
                      </p>
                      <p style={{ color: "#595959" }}>
                        {moment(item.created).format("YYYY-MM-DD HH:mm:ss")}
                      </p>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            </Spin>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

// 渲染运行状态
const renderStatus = (text, context) => {
  switch (text) {
    case 0:
      return (
        <span>
          {renderDisc("normal", 7, -1)}
          {context.normal}
        </span>
      );
    case 1:
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.restarting}
        </span>
      );
    case 2:
      return (
        <span>
          {renderDisc("critical", 7, -1)}
          {context.startupFailed}
        </span>
      );
    case 3:
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.installing}
        </span>
      );
    case 4:
      return (
        <span>
          {renderDisc("critical", 7, -1)}
          {context.installFailed}
        </span>
      );
    default:
      return "-";
  }
};

// 渲染执行状态
const renderInitStatue = (text, context) => {
  switch (text) {
    case 0:
      return (
        <span>
          {renderDisc("normal", 7, -1)}
          {context.succeeded}
        </span>
      );
    case 1:
      return (
        <span>
          {renderDisc("notMonitored", 7, -1)}
          {context.unexecuted}
        </span>
      );
    case 2:
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.executing}
        </span>
      );
    case 3:
      return (
        <span>
          {renderDisc("critical", 7, -1)}
          {context.failed}
        </span>
      );
  }
};

const getColumnsConfig = (
  setIsShowDrawer,
  setRow,
  setUpdateMoadlVisible,
  fetchHostDetail,
  setShowIframe,
  history,
  context
) => {
  return [
    {
      title: context.ip,
      key: "ip",
      dataIndex: "ip",
      sorter: (a, b) => a.ip - b.ip,
      sortDirections: ["descend", "ascend"],
      align: "center",
      //width: 140,
      render: (text, record) => {
        let str = nonEmptyProcessing(text);
        if (str == "-") {
          return "-";
        } else {
          return (
            <a
              onClick={() => {
                fetchHostDetail(record.id);
                setIsShowDrawer({
                  isOpen: true,
                  record: record,
                });
              }}
            >
              {str}
            </a>
          );
        }
      },
      //ellipsis: true,
      fixed: "left",
    },
    {
      title: context.instanceName,
      key: "instance_name",
      dataIndex: "instance_name",
      align: "center",
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
      title: context.cpu,
      key: "cpu_usage",
      dataIndex: "cpu_usage",
      align: "center",
      sorter: (a, b) => a.cpu_usage - b.cpu_usage,
      sortDirections: ["descend", "ascend"],
      render: (text, record) => {
        let str = nonEmptyProcessing(text);
        return str == "-" ? (
          "-"
        ) : (
          <span
            style={{ color: colorConfig[record.cpu_status], fontWeight: 500 }}
          >
            {str}%
          </span>
        );
      },
    },
    {
      title: context.memory,
      key: "mem_usage",
      dataIndex: "mem_usage",
      sorter: (a, b) => a.mem_usage - b.mem_usage,
      sortDirections: ["descend", "ascend"],
      align: "center",
      render: (text, record) => {
        let str = nonEmptyProcessing(text);
        return str == "-" ? (
          "-"
        ) : (
          <span
            style={{ color: colorConfig[record.mem_status], fontWeight: 500 }}
          >
            {str}%
          </span>
        );
      },
    },
    {
      title: context.rootFolder,
      key: "root_disk_usage",
      //width:120,
      dataIndex: "root_disk_usage",
      align: "center",
      //ellipsis: true,
      sorter: (a, b) => a.root_disk_usage - b.root_disk_usage,
      sortDirections: ["descend", "ascend"],
      render: (text, record) => {
        let str = nonEmptyProcessing(text);
        return str == "-" ? (
          "-"
        ) : (
          <span
            style={{
              color: colorConfig[record.root_disk_status],
              fontWeight: 500,
            }}
          >
            {str}%
          </span>
        );
      },
      // width:120
    },
    {
      title: context.dataFolder,
      key: "data_disk_usage",
      dataIndex: "data_disk_usage",
      align: "center",
      //ellipsis: true,
      sorter: (a, b) => a.data_disk_usage - b.data_disk_usage,
      sortDirections: ["descend", "ascend"],
      render: (text, record) => {
        let str = nonEmptyProcessing(text);
        return str == "-" ? (
          "-"
        ) : (
          <span
            style={{
              color: colorConfig[record.data_disk_status],
              fontWeight: 500,
            }}
          >
            {str}%
          </span>
        );
      },
    },
    {
      title: context.maintainMode,
      key: "is_maintenance",
      dataIndex: "is_maintenance",
      align: "center",
      //ellipsis: true,
      render: (text) => {
        if (nonEmptyProcessing(text) == "-") return "-";
        return text ? context.open : context.close;
      },
    },
    {
      title: context.hostAgent,
      key: "host_agent",
      dataIndex: "host_agent",
      align: "center",
      //ellipsis: true,
      sorter: (a, b) => a.host_agent - b.host_agent,
      sortDirections: ["descend", "ascend"],
      render: (text) => {
        return renderStatus(text, context);
      },
    },
    {
      title: context.monitorAgent,
      key: "monitor_agent",
      dataIndex: "monitor_agent",
      sorter: (a, b) => a.monitor_agent - b.monitor_agent,
      sortDirections: ["descend", "ascend"],
      align: "center",
      //ellipsis: true,
      render: (text) => {
        return renderStatus(text, context);
      },
    },
    {
      title: context.service + context.ln + context.total,
      key: "service_num",
      dataIndex: "service_num",
      align: "center",
      // ellipsis: true,
      sorter: (a, b) => a.service_num - b.service_num,
      sortDirections: ["descend", "ascend"],
      render: (text, record) => {
        if (text && text !== 0 && text !== "-") {
          return (
            <a
              onClick={() => {
                text &&
                  history.push({
                    pathname: "/application_management/service_management",
                    state: {
                      ip: record.ip,
                    },
                  });
              }}
            >
              {text}
              {context.ge}
            </a>
          );
        }
        return "-";
      },
    },
    {
      title: context.alert + context.ln + context.total,
      key: "alert_num",
      dataIndex: "alert_num",
      align: "center",
      //ellipsis: true,
      sorter: (a, b) => a.alert_num - b.alert_num,
      sortDirections: ["descend", "ascend"],
      render: (text, record) => {
        if (text && text !== 0 && text !== "-") {
          return (
            <a
              onClick={() => {
                text &&
                  history.push({
                    pathname: "/application-monitoring/alarm-log",
                    state: {
                      ip: record.ip,
                    },
                  });
              }}
            >
              {text}
              {context.ci}
            </a>
          );
        }
        return "-";
      },
    },
    {
      title: context.action,
      //width: 100,
      width: 100,
      key: "",
      dataIndex: "",
      align: "center",
      fixed: "right",
      render: function renderFunc(text, record, index) {
        if (record?.host_agent == 3 || record?.monitor_agent == 3) {
          return (
            <div
              onClick={() => {
                setRow(record);
              }}
              style={{ display: "flex", justifyContent: "space-around" }}
            >
              <div style={{ margin: "auto" }}>
                <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>
                  {context.monitor}
                </span>
                <span style={{ color: "rgba(0, 0, 0, 0.25)", marginLeft: 10 }}>
                  {context.more}
                </span>
              </div>
            </div>
          );
        }
        return (
          <div onClick={() => setRow(record)} style={{ display: "flex" }}>
            <div style={{ margin: "auto" }}>
              {record.monitor_url ? (
                <a
                  onClick={() => {
                    setShowIframe({
                      isOpen: true,
                      src: record.monitor_url,
                      record: record,
                      isLog: false,
                    });
                  }}
                >
                  {context.monitor}
                </a>
              ) : (
                <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>
                  {context.monitor}
                </span>
              )}
              <a
                style={{ marginLeft: 10 }}
                onClick={() => setUpdateMoadlVisible(true)}
              >
                {context.edit}
              </a>
            </div>
          </div>
        );
      },
    },
  ];
};

export default getColumnsConfig;
