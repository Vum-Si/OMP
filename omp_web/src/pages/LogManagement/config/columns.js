import { colorConfig } from "@/utils/utils";

const renderLevel = (text, context) => {
  switch (text) {
    case "trace":
    case "debug":
      return (
        <span style={{ color: colorConfig["normal"] }}>
          {text.toUpperCase()}
        </span>
      );
    case "info":
      return (
        <span style={{ color: colorConfig["info"] }}>{text.toUpperCase()}</span>
      );
    case "warn":
      return (
        <span style={{ color: colorConfig["warning"] }}>
          {text.toUpperCase()}
        </span>
      );
    case "error":
    case "fatal":
      return (
        <span style={{ color: colorConfig["critical"] }}>
          {text.toUpperCase()}
        </span>
      );
    default:
      return (
        <span style={{ color: colorConfig["notMonitored"] }}>
          {context.unknown}
        </span>
      );
  }
};

const getColumnsConfig = (
  setRow,
  setShowIframe,
  setUpdateMoadlVisible,
  context
) => {
  return [
    {
      title: context.serviceInstance,
      key: "service_instance_name",
      dataIndex: "service_instance_name",
      align: "center",
      ellipsis: true,
      fixed: "left",
      width: 300,
    },
    {
      title: context.log + context.ln + context.level,
      key: "log_level",
      dataIndex: "log_level",
      align: "center",
      width: 100,
      render: (text) => {
        return renderLevel(text, context);
      },
    },
    {
      title: context.ip,
      key: "ip",
      dataIndex: "ip",
      sorter: (a, b) => a.ip - b.ip,
      sortDirections: ["descend", "ascend"],
      align: "center",
      width: 120,
    },
    {
      title: context.service + context.ln + context.name,
      key: "app_name",
      dataIndex: "app_name",
      align: "center",
      ellipsis: true,
      width: 180,
    },
    {
      title: context.action,
      width: 160,
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
            {["trace", "debug", "info", "warn", "error", "fatal"].includes(
              record.log_level
            ) ? (
              <div style={{ margin: "auto" }}>
                <a onClick={() => setUpdateMoadlVisible(true)}>
                  {context.change + context.ln + context.level}
                </a>

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
                  <span
                    style={{ color: "rgba(0, 0, 0, 0.25)", marginLeft: 10 }}
                  >
                    {context.log}
                  </span>
                )}
              </div>
            ) : (
              <div style={{ margin: "auto" }}>
                <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>查看日志</span>

                <span style={{ color: "rgba(0, 0, 0, 0.25)", marginLeft: 10 }}>
                  查看日志
                </span>
              </div>
            )}
          </div>
        );
      },
    },
  ];
};

export default getColumnsConfig;
