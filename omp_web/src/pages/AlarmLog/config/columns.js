import { colorConfig } from "@/utils/utils";
import { Tooltip, Badge } from "antd";
import moment from "moment";

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
      key: "alert_instance_name",
      dataIndex: "alert_instance_name",
      align: "center",
      width: 200,
      ellipsis: true,
      fixed: "left",
      render: (text, record) => {
        return (
          <Tooltip title={text}>
            <Badge dot={record.is_read === 0} offset={[5, 2]}>
              <span style={{ fontSize: 12 }}>
                {record.alert_instance_name ? record.alert_instance_name : "-"}
              </span>
            </Badge>
          </Tooltip>
        );
      },
    },
    {
      title: context.ip,
      key: "alert_host_ip",
      width: 200,
      dataIndex: "alert_host_ip",
      ellipsis: true,
      sorter: (a, b) => a.alert_host_ip - b.alert_host_ip,
      sortDirections: ["descend", "ascend"],
      align: "center",
      render: (text, record) => {
        return (
          <a
            onClick={() => {
              text &&
                history.push({
                  pathname: "/resource-management/machine-management",
                  state: {
                    ip: text,
                  },
                });
            }}
          >
            {text}
          </a>
        );
      },
    },
    {
      title: context.severity,
      key: "alert_level",
      dataIndex: "alert_level",
      align: "center",
      width: 120,
      usefilter: true,
      queryRequest: queryRequest,
      filterMenuList: [
        {
          value: "critical",
          text: "critical",
        },
        {
          value: "warning",
          text: "warning",
        },
      ],
      render: (text) => {
        switch (text) {
          case "critical":
          case "warning":
            return <span style={{ color: colorConfig[text] }}>警告</span>;
          default:
            return "-";
        }
      },
    },
    {
      title: context.type,
      key: "alert_type",
      dataIndex: "alert_type",
      align: "center",
      width: 150,
      render: (text) => context[text],
    },
    {
      title: context.description,
      key: "alert_describe",
      dataIndex: "alert_describe",
      align: "center",
      width: 420,
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
      title: context.timestamp,
      width: 180,
      key: "alert_time",
      dataIndex: "alert_time",
      align: "center",
      //ellipsis: true,
      sorter: (a, b) => a.alert_time - b.alert_time,
      sortDirections: ["descend", "ascend"],
      render: (text) => {
        let str = moment(text).format("YYYY-MM-DD HH:mm:ss");
        return str;
      },
    },
    {
      title: context.updated,
      width: 180,
      key: "create_time",
      dataIndex: "create_time",
      align: "center",
      render: (text) => {
        let str = moment(text).format("YYYY-MM-DD HH:mm:ss");
        return str;
      },
    },
    {
      title: context.action,
      width: 100,
      key: "",
      dataIndex: "",
      fixed: "right",
      align: "center",
      render: (text, record, index) => {
        return (
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <div style={{ margin: "auto" }}>
              {record.monitor_path ? (
                <a
                  onClick={() => {
                    record.is_read == 0 && updateAlertRead([record.id]);
                    setShowIframe({
                      isOpen: true,
                      src: record.monitor_path,
                      record: {
                        ...record,
                        ip: record.alert_host_ip,
                      },
                      isLog: false,
                    });
                  }}
                >
                  {context.monitor}
                </a>
              ) : (
                <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>
                  {" "}
                  {context.monitor}
                </span>
              )}

              {record.alert_type == "host" ? (
                <a
                  style={{ marginLeft: 10 }}
                  onClick={() =>
                    history.push({
                      pathname: "/status-patrol/patrol-inspection-record",
                    })
                  }
                >
                  {context.analysis}
                </a>
              ) : record.monitor_log ? (
                <a
                  style={{ marginLeft: 10 }}
                  onClick={() => {
                    record.is_read == 0 && updateAlertRead([record.id]);
                    setShowIframe({
                      isOpen: true,
                      src: record.monitor_log,
                      record: {
                        ...record,
                        ip: record.alert_host_ip,
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
