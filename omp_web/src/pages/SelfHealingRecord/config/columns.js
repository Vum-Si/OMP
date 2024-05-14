import { renderDisc } from "@/utils/utils";
import { Tooltip, Badge } from "antd";
import moment from "moment";

const renderStatus = (state, context) => {
  switch (state) {
    case 1:
      return (
        <span>
          {renderDisc("normal", 7, -1)}
          {context.succeeded}
        </span>
      );
      break;
    case 0:
      return (
        <span>
          {renderDisc("critical", 7, -1)}
          {context.failed}
        </span>
      );
      break;
    case 2:
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.repairing}
        </span>
      );
      break;
    default:
      return "-";
      break;
  }
};

const getColumnsConfig = (
  queryRequest,
  setShowIframe,
  updateAlertRead,
  history,
  context
) => {
  return [
    {
      title: context.serviceInstance,
      key: "instance_name",
      dataIndex: "instance_name",
      align: "center",
      width: 200,
      ellipsis: true,
      fixed: "left",
      sorter: (a, b) => a.instance_name - b.instance_name,
      sortDirections: ["descend", "ascend"],
      render: (text, record) => {
        return (
          <Tooltip title={text}>
            <Badge dot={record.is_read === 0} offset={[5, 2]}>
              <span style={{ fontSize: 12 }}>
                {record.instance_name ? record.instance_name : "-"}
              </span>
            </Badge>
          </Tooltip>
        );
      },
    },
    {
      title: context.ip,
      key: "host_ip",
      width: 140,
      dataIndex: "host_ip",
      ellipsis: true,
      sorter: (a, b) => a.host_ip - b.host_ip,
      sortDirections: ["descend", "ascend"],
      align: "center",
    },
    {
      title: context.status,
      key: "state",
      dataIndex: "state",
      align: "center",
      width: 120,
      usefilter: true,
      queryRequest: queryRequest,
      filterMenuList: [
        {
          value: "1",
          text: context.succeeded,
        },
        {
          value: "0",
          text: context.failed,
        },
        {
          value: "2",
          text: context.repairing,
        },
      ],
      render: (text) => renderStatus(text, context),
    },
    {
      title: context.retry,
      key: "healing_count",
      dataIndex: "healing_count",
      align: "center",
      width: 80,
      render: (text) => {
        return text ? text + context.ci : "-";
      },
    },
    {
      title: context.timestamp,
      width: 180,
      key: "alert_time",
      dataIndex: "alert_time",
      align: "center",
      render: (text) => {
        if (text) {
          let str = moment(text).format("YYYY-MM-DD HH:mm:ss");
          return str;
        }
        return "-";
      },
    },
    {
      title: context.endTime,
      width: 180,
      key: "end_time",
      dataIndex: "end_time",
      align: "center",
      render: (text) => {
        if (text) {
          let str = moment(text).format("YYYY-MM-DD HH:mm:ss");
          return str;
        }
        return "-";
      },
    },
    {
      title: context.description,
      key: "alert_content",
      dataIndex: "alert_content",
      align: "center",
      width: 300,
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
      title: context.repair + context.ln + context.log,
      key: "healing_log",
      dataIndex: "healing_log",
      align: "center",
      width: 220,
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text} placement="topLeft">
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.action,
      width: 140,
      key: "",
      dataIndex: "",
      fixed: "right",
      align: "center",
      render: (text, record, index) => {
        return (
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <div style={{ margin: "auto" }}>
              {record.instance_name ? (
                <a
                  onClick={() => {
                    console.log(record);
                    history.push({
                      pathname: "/application-monitoring/alarm-log",
                      state: {
                        alert_instance_name: record.instance_name,
                        time: record.alert_time,
                      },
                    });
                  }}
                >
                  {context.view + context.ln + context.alarm}
                </a>
              ) : (
                <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>
                  {context.view + context.ln + context.alarm}
                </span>
              )}

              {record.monitor_log ? (
                <a
                  style={{ marginLeft: 10 }}
                  onClick={() => {
                    record.is_read == 0 && updateAlertRead([record.id]);
                    setShowIframe({
                      isOpen: true,
                      src: record.monitor_log,
                      record: {
                        ...record,
                        ip: record.host_ip,
                      },
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
            </div>
          </div>
        );
      },
    },
  ];
};

export default getColumnsConfig;
