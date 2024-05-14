import { OmpToolTip } from "@/components";
import {
  nonEmptyProcessing,
  renderDisc,
  RenderStatusForResult,
} from "@/utils/utils";
import { DesktopOutlined } from "@ant-design/icons";
import {
  Dropdown,
  Menu,
  Drawer,
  Tooltip,
  Spin,
  Timeline,
  Descriptions,
  Divider,
  Empty,
} from "antd";
import moment from "moment";
import styles from "../index.module.less";
import { useSelector } from "react-redux";
import { useRef } from "react";

const colorConfig = {
  normal: null,
  warning: "#ffbf00",
  critical: "#f04134",
};

// 平台访问入口
export const UrlInfo = ({
  isShowDrawer,
  setIsShowDrawer,
  urlData,
  context,
}) => {
  return (
    <Drawer
      title={context.platformAccess}
      placement="right"
      closable={true}
      width={640}
      style={{
        height: "calc(100%)",
      }}
      onClose={() => {
        setIsShowDrawer(false);
      }}
      visible={isShowDrawer}
      destroyOnClose={true}
    >
      <div
        style={{
          marginTop: -30,
        }}
      >
        {urlData.length > 0 ? (
          urlData.map((e) => {
            return (
              <div>
                <Divider
                  orientation="left"
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                    marginTop: 26,
                  }}
                >
                  {e.app_name}
                </Divider>
                <Descriptions key={e.app_name} title={null} bordered>
                  <Descriptions.Item label={context.website} span={3}>
                    <a href={e.url} target="_blank">
                      {e.url}
                    </a>
                  </Descriptions.Item>
                  <Descriptions.Item label={context.username}>
                    {e.username}
                  </Descriptions.Item>
                  <Descriptions.Item label={context.password}>
                    {e.password}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            );
          })
        ) : (
          <Empty
            style={{
              width: "100%",
              marginTop: 180,
            }}
            description={context.noData}
          />
        )}
      </div>
    </Drawer>
  );
};

export const DetailService = ({
  isShowDrawer,
  setIsShowDrawer,
  loading,
  data,
  setInstallationRecordModal,
  queryServiceInstallHistoryDetail,
  context,
}) => {
  // 视口宽度
  const viewHeight = useSelector((state) => state.layouts.viewSize.height);
  const wrapperRef = useRef(null);
  return (
    <Drawer
      title={
        <div style={{ display: "flex" }}>
          <DesktopOutlined style={{ position: "relative", top: 3, left: -5 }} />
          {context.service + context.ln + context.detail}
          <span style={{ paddingLeft: 30, fontWeight: 400, fontSize: 15 }}>
            {context.serviceInstance} :{" "}
            {isShowDrawer.record?.service_instance_name}
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
        backgroundColor: "#e7e9f0",
        height: "calc(100%)",
      }}
      destroyOnClose={true}
    >
      <div
        style={{ height: "calc(100% - 15px)", width: "100%", display: "flex" }}
      >
        <div style={{ flex: 4 }}>
          {/* -- 基本信息 -- */}
          <div
            style={{
              height: "calc(46%)",
              width: "100%",
              borderRadius: "5px",
              backgroundColor: "#fff",
              padding: 20,
              paddingTop: 14,
              paddingBottom: 10,
              overflowY: "auto",
            }}
          >
            <div style={{ paddingBottom: 10, fontSize: 15, fontWeight: 500 }}>
              {context.basic + context.ln + context.info}
            </div>
            <div
              style={{
                display: "flex",
                //paddingTop: 15,
                paddingBottom: 4,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>{context.serviceInstance}</div>
              <div style={{ flex: 3 }}>
                <OmpToolTip maxLength={30}>
                  {isShowDrawer.record?.service_instance_name}
                </OmpToolTip>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 12,
                paddingBottom: 4,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>{context.appName}</div>
              <div style={{ flex: 3 }}>
                <OmpToolTip maxLength={30}>
                  {nonEmptyProcessing(isShowDrawer.record?.app_name)}
                </OmpToolTip>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 8,
                paddingBottom: 4,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>{context.version}</div>
              <div style={{ flex: 3 }}>{isShowDrawer.record?.app_version}</div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 8,
                paddingBottom: 4,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>{context.module}</div>
              <div style={{ flex: 3 }}>{isShowDrawer.record?.label_name}</div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 8,
                paddingBottom: 4,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>{context.clusterMode}</div>
              <div style={{ flex: 3 }}>
                {isShowDrawer.record?.cluster_type === "单实例"
                  ? context.single
                  : context.cluster}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 8,
                paddingBottom: 4,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>{context.ip}</div>
              <div style={{ flex: 3 }}>{isShowDrawer.record?.ip}</div>
            </div>
          </div>

          {/* -- 安装信息 -- */}
          <div
            style={{
              marginTop: "3%",
              height: "calc(52%)",
              width: "100%",
              borderRadius: "5px",
              backgroundColor: "#fff",
              padding: 20,
              paddingTop: 14,
              paddingBottom: 10,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingBottom: 10,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              {context.deployment + context.ln + context.info}
              <a
                onClick={() => {
                  setInstallationRecordModal(true);
                  queryServiceInstallHistoryDetail(data.id);
                }}
                style={{ fontSize: 13, fontWeight: 400 }}
              >
                {context.view +
                  context.ln +
                  context.install +
                  context.ln +
                  context.record}
              </a>
            </div>
            <div
              style={{
                display: "flex",
                paddingBottom: 4,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>
                {context.install + context.ln + context.directory}
              </div>
              <div style={{ flex: 3 }}>
                <OmpToolTip maxLength={32}>
                  {data.install_info?.base_dir}
                </OmpToolTip>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 8,
                paddingBottom: 5,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>
                {context.data + context.ln + context.directory}
              </div>
              <div style={{ flex: 3 }}>
                <OmpToolTip maxLength={32}>
                  {data.install_info?.data_dir}
                </OmpToolTip>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 8,
                paddingBottom: 5,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>
                {context.log + context.ln + context.directory}
              </div>
              <div style={{ flex: 3 }}>
                <OmpToolTip maxLength={32}>
                  {data.install_info?.log_dir}
                </OmpToolTip>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 8,
                paddingBottom: 5,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>{context.port}</div>
              <div style={{ flex: 3 }}>{data.install_info?.service_port}</div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 8,
                paddingBottom: 5,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>{context.username}</div>
              <div style={{ flex: 3 }}>{data.install_info?.username}</div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 8,
                paddingBottom: 5,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>{context.password}</div>
              <div style={{ flex: 3 }}>{data.install_info?.password}</div>
            </div>
            <div
              style={{
                display: "flex",
                paddingTop: 8,
                paddingBottom: 5,
                borderBottom: "solid 1px rgb(220,220,220)",
              }}
            >
              <div style={{ flex: 2 }}>
                {context.install + context.ln + context.timestamp}
              </div>
              <div style={{ flex: 3 }}>
                {data?.created
                  ? moment(data?.created).format("YYYY-MM-DD HH:mm:ss")
                  : "-"}
              </div>
            </div>
          </div>
        </div>

        {/* -- 历史记录 -- */}
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
          <div
            ref={wrapperRef}
            style={{
              height: "calc(100%)",
              marginTop: 0,
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
                  //height: "100%",
                  height: wrapperRef.current
                    ? wrapperRef.current?.offsetHeight - 100
                    : 100,
                }}
              >
                {data.history?.map((item) => {
                  return (
                    <Timeline.Item key={item.created}>
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

//操作菜单
const renderMenu = (
  record,
  setOperateAciton,
  setServiceAcitonModal,
  queryDeleteMsg,
  deleteConditionReset,
  context
) => {
  return (
    <Menu style={{ textAlign: "center" }}>
      <Menu.Item
        disabled={!record.operable}
        key="start"
        onClick={() => {
          setOperateAciton(1);
          setServiceAcitonModal(true);
        }}
      >
        <span style={{ fontSize: 12, paddingLeft: 5, paddingRight: 5 }}>
          {context.start}
        </span>
      </Menu.Item>
      <Menu.Item
        disabled={!record.operable}
        key="close"
        onClick={() => {
          setOperateAciton(2);
          setServiceAcitonModal(true);
        }}
      >
        <span style={{ fontSize: 12, paddingLeft: 5, paddingRight: 5 }}>
          {context.stop}
        </span>
      </Menu.Item>
      <Menu.Item
        disabled={!record.operable}
        key="reStart"
        onClick={() => {
          setOperateAciton(3);
          setServiceAcitonModal(true);
        }}
      >
        <span style={{ fontSize: 12, paddingLeft: 5, paddingRight: 5 }}>
          {context.restart}
        </span>
      </Menu.Item>
      <Menu.Item
        key="delete"
        onClick={() => {
          queryDeleteMsg([record]);
          setOperateAciton(4);
          setServiceAcitonModal(true);
          deleteConditionReset();
        }}
      >
        <span style={{ fontSize: 12, paddingLeft: 5, paddingRight: 5 }}>
          {context.delete}
        </span>
      </Menu.Item>
    </Menu>
  );
};

// 渲染状态
const renderStatus = (text, context) => {
  switch (text) {
    case "未监控":
      return (
        <span>
          {renderDisc("notMonitored", 7, -1)}
          {context.noMonitored}
        </span>
      );
    case "启动中":
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.starting}
        </span>
      );
    case "停止中":
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.stopping}
        </span>
      );
    case "重启中":
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.restarting}
        </span>
      );
    case "未知":
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.unknown}
        </span>
      );
    case "安装中":
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.installing}
        </span>
      );
    case "待安装":
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.waiting}
        </span>
      );
    case "停止":
      return (
        <span>
          {renderDisc("critical", 7, -1)}
          {context.noRunning}
        </span>
      );
    case "安装失败":
      return (
        <span>
          {renderDisc("critical", 7, -1)}
          {context.installFailed}
        </span>
      );
    default:
      return (
        <span>
          {renderDisc("normal", 7, -1)}
          {context.running}
        </span>
      );
  }
};

const getColumnsConfig = (
  setIsShowDrawer,
  setRow,
  fetchHistoryData,
  history,
  labelsData,
  queryRequest,
  initfilterAppType,
  initfilterLabelName,
  setShowIframe,
  setOperateAciton,
  setServiceAcitonModal,
  queryDeleteMsg,
  context,
  // 删除的前置条件重置
  deleteConditionReset
) => {
  return [
    {
      title: context.serviceInstance,
      key: "service_instance_name",
      dataIndex: "service_instance_name",
      sorter: (a, b) => a.service_instance_name - b.service_instance_name,
      sortDirections: ["descend", "ascend"],
      align: "center",
      width: 160,
      ellipsis: true,
      fixed: "left",
      render: (text, record) => {
        return (
          <Tooltip title={text}>
            <a
              onClick={() => {
                fetchHistoryData(record.id);
                setIsShowDrawer({
                  isOpen: true,
                  record: record,
                });
              }}
            >
              {text ? text : "-"}
            </a>
          </Tooltip>
        );
      },
    },
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
          return <span>{str}</span>;
        }
      },
      //ellipsis: true,
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
      title: context.status,
      key: "service_status",
      dataIndex: "service_status",
      align: "center",
      //ellipsis: true,
      render: (text) => renderStatus(text, context),
    },
    {
      title: context.port,
      key: "port",
      dataIndex: "port",
      align: "center",
      ellipsis: true,
      render: (text) => {
        return <Tooltip title={text}>{text ? text : "-"}</Tooltip>;
      },
    },
    {
      title: context.clusterMode,
      key: "cluster_type",
      dataIndex: "cluster_type",
      align: "center",
      //ellipsis: true,
      render: (text, record) => {
        if (record.cluster_url?.length > 0) {
          return (
            <a
              onClick={() => {
                setShowIframe({
                  isOpen: true,
                  src: record.cluster_url,
                  record: record,
                  isLog: false,
                });
              }}
            >
              {context.cluster}
            </a>
          );
        }
        return context.single;
      },
    },
    {
      title: context.alert + context.ln + context.total,
      key: "alert_count",
      dataIndex: "alert_count",
      align: "center",
      render: (text, record) => {
        if (text == "-" || text == "0次") {
          return text.replace("次", context.ci);
        } else {
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
              {text.replace("次", context.ci)}
            </a>
          );
        }
      },
      //ellipsis: true,
    },
    {
      title: context.service + context.ln + context.name,
      key: "app_name",
      dataIndex: "app_name",
      align: "center",
      ellipsis: true,
    },
    {
      title: context.version,
      key: "app_version",
      dataIndex: "app_version",
      align: "center",
      ellipsis: true,
    },
    {
      title: context.module,
      key: "label_name",
      dataIndex: "label_name",
      usefilter: true,
      queryRequest: queryRequest,
      ellipsis: true,
      initfilter: initfilterLabelName,
      filterMenuList: labelsData.map((item) => ({ value: item, text: item })),
      align: "center",
      render: (text) => {
        return <Tooltip title={text}>{text ? text : "-"}</Tooltip>;
      },
    },
    {
      title: context.type,
      key: "app_type",
      dataIndex: "app_type",
      align: "center",
      usefilter: true,
      queryRequest: queryRequest,
      initfilter: initfilterAppType,
      filterMenuList: [
        {
          value: 0,
          text: context.component,
        },
        {
          value: 1,
          text: context.application,
        },
      ],
      render: (text) => {
        return text ? context.application : context.component;
      },
      //ellipsis: true,
    },
    {
      title: context.action,
      //width: 100,
      width: 140,
      key: "",
      dataIndex: "",
      align: "center",
      fixed: "right",
      render: (text, record, index) => {
        return (
          <div
            onClick={() => setRow(record)}
            style={{ display: "flex", justifyContent: "space-around" }}
          >
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

              {record.log_url ? (
                <a
                  style={{ marginLeft: 10 }}
                  onClick={() => {
                    setShowIframe({
                      isOpen: true,
                      src: record.log_url,
                      record: record,
                      isLog: true,
                    });
                  }}
                >
                  {context.log}
                </a>
              ) : (
                <span style={{ color: "rgba(0, 0, 0, 0.25)", marginLeft: 10 }}>
                  {context.log}
                </span>
              )}

              <Dropdown
                arrow
                placement="bottomCenter"
                overlay={renderMenu(
                  record,
                  setOperateAciton,
                  setServiceAcitonModal,
                  queryDeleteMsg,
                  deleteConditionReset,
                  context
                )}
              >
                <a style={{ marginLeft: 10 }}>{context.more}</a>
              </Dropdown>
            </div>
          </div>
        );
      },
    },
  ];
};

export default getColumnsConfig;
