import { colorConfig } from "@/utils/utils";
import { Tooltip, Badge } from "antd";
import moment from "moment";

const getColumnsConfig = (
  queryRequest,
  setShowIframe,
  history,
  initfilter,
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
      key: "ip",
      dataIndex: "ip",
      ellipsis: true,
      sorter: (a, b) => a.ip - b.ip,
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
      key: "severity",
      dataIndex: "severity",
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
          case "info":
            return <span style={{ color: colorConfig[text] }}>{text}</span>;
          default:
            return "-";
        }
      },
    },
    {
      title: context.type,
      key: "type",
      dataIndex: "type",
      filterMenuList: [
        {
          value: "service",
          text: context.service,
        },
        {
          value: "host",
          text: context.host,
        },
        {
          value: "component",
          text: context.component,
        },
        {
          value: "database",
          text: context.database,
        },
      ],
      align: "center",
      width: 150,
      render: (text) => context[text],
    },
    {
      title: context.description,
      key: "description",
      dataIndex: "description",
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
      key: "date",
      dataIndex: "date",
      align: "center",
      sorter: (a, b) => a.date - b.date,
      sortDirections: ["descend", "ascend"],
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
              {record.monitor_url ? (
                <a
                  onClick={() => {
                    setShowIframe({
                      isOpen: true,
                      src: record.monitor_url,
                      record: {
                        ...record,
                        ip: record.ip,
                      },
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

              {record.type == "host" ? (
                <a
                  onClick={() =>
                    history.push({
                      pathname: "/status-patrol/patrol-inspection-record",
                    })
                  }
                  style={{ marginLeft: "10px" }}
                >
                  {context.analysis}
                </a>
              ) : record.log_url ? (
                <a
                  onClick={() => {
                    setShowIframe({
                      isOpen: true,
                      src: record.log_url,
                      record: {
                        ...record,
                        ip: record.ip,
                      },
                      isLog: true,
                    });
                  }}
                  style={{ marginLeft: "10px" }}
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
