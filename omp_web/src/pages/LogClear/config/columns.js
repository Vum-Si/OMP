import { colorConfig, renderDisc } from "@/utils/utils";
import { Tooltip } from "antd";

const getColumnsConfig = (setRow, setUpdateMoadlVisible, context) => {
  return [
    {
      title: context.service + context.ln + context.name,
      key: "service_instance_name",
      dataIndex: "service_instance_name",
      align: "center",
      width: 100,
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text || "-"}>
            <span>{text || "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.execute + context.ln + context.path,
      key: "exec_dir",
      dataIndex: "exec_dir",
      align: "center",
      width: 100,
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text || "-"}>
            <span>{text || "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.file + context.ln + context.rule,
      key: "exec_rule",
      dataIndex: "exec_rule",
      align: "center",
      width: 60,
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text || "-"}>
            <span>{text || "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.strategy + context.ln + context.type,
      key: "exec_type",
      dataIndex: "exec_type",
      align: "center",
      width: 60,
      ellipsis: true,
    },
    {
      title: context.strategy + context.ln + context.value,
      key: "exec_value",
      dataIndex: "exec_value",
      align: "center",
      width: 60,
      ellipsis: true,
      render: (text, record) => {
        if (record.exec_type === "byFileDay") {
          return `${text} ${text === 1 ? context.day : context.days}`;
        } else if (record.exec_type === "byFileSize") {
          return `${text} M`;
        } else {
          return text;
        }
      },
    },
    {
      title: context.open,
      key: "switch",
      dataIndex: "switch",
      align: "center",
      width: 50,
      ellipsis: true,
      render: (text) => {
        if (text === 0) {
          return (
            <span>
              {renderDisc("critical", 7, -1)}
              {context.no}
            </span>
          );
        } else {
          return (
            <span>
              {renderDisc("normal", 7, -1)}
              {context.yes}
            </span>
          );
        }
      },
    },
    {
      title: "MD5",
      key: "md5",
      dataIndex: "md5",
      align: "center",
      width: 120,
      ellipsis: true,
    },
    {
      title: context.ip,
      key: "host",
      dataIndex: "host",
      align: "center",
      width: 60,
      ellipsis: true,
    },
    {
      title: context.action,
      width: 40,
      key: "",
      dataIndex: "",
      align: "center",
      fixed: "right",
      render: (text, record, index) => {
        return (
          <div
            onClick={() => {
              setRow(record);
            }}
            style={{ display: "flex", justifyContent: "space-around" }}
          >
            <div style={{ margin: "auto" }}>
              <a onClick={() => setUpdateMoadlVisible(true)}>{context.edit}</a>
            </div>
          </div>
        );
      },
    },
  ];
};

export default getColumnsConfig;
