import { renderDisc } from "@/utils/utils";
import { Tooltip } from "antd";
import moment from "moment";

const renderResult = (text, context) => {
  switch (text) {
    case 0:
      return (
        <span>
          {renderDisc("critical", 7, -1)}
          {context.failed}
        </span>
      );
    case 1:
      return (
        <span>
          {renderDisc("normal", 7, -1)}
          {context.succeeded}
        </span>
      );
    case 2:
      return (
        <span>
          {renderDisc("warning", 7, -1)}
          {context.executing}
        </span>
      );
  }
};

const getColumnsConfig = (setRow, setDeleteOneModal, context) => {
  // 推送邮件相关数据

  return [
    {
      title: context.task + context.ln + context.name,
      key: "backup_name",
      dataIndex: "backup_name",
      align: "center",
      width: 240,
      ellipsis: true,
      fixed: "left",
      render: (text) => {
        return (
          <Tooltip title={text || "-"} placement="topLeft">
            <span>{text || "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.status,
      key: "result",
      dataIndex: "result",
      align: "center",
      width: 100,
      render: (text) => {
        return renderResult(text, context);
      },
    },
    {
      title: context.instance,
      key: "content",
      dataIndex: "content",
      align: "center",
      width: 140,
      ellipsis: true,
    },
    {
      title: context.file,
      key: "file_name",
      dataIndex: "file_name",
      align: "center",
      width: 180,
      ellipsis: true,
      render: (text, record) => {
        if (record?.file_deleted) {
          return "-";
        }
        return (
          <Tooltip title={text || "-"} placement="topLeft">
            <span>{text || "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.file + context.ln + context.size,
      key: "file_size",
      dataIndex: "file_size",
      align: "center",
      width: 80,
      ellipsis: true,
    },
    {
      title: context.save + context.ln + context.path,
      key: "retain_path",
      dataIndex: "retain_path",
      width: 160,
      align: "center",
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text || "-"} placement="topLeft">
            <span>{text || "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.remote + context.ln + context.path,
      key: "remote_path",
      dataIndex: "remote_path",
      width: 160,
      align: "center",
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text || "-"} placement="topLeft">
            <span>{text || "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.expire + context.ln + context.time,
      key: "expire_time",
      dataIndex: "expire_time",
      width: 180,
      align: "center",
      ellipsis: true,
      render: (text) => {
        if (text) {
          return moment(text).format("YYYY-MM-DD HH:mm:ss");
        }
        return "-";
      },
    },
    {
      title: context.description,
      key: "message",
      dataIndex: "message",
      align: "center",
      width: 180,
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text || "-"} placement="topLeft">
            <span>{text || "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.action,
      width: 100,
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
              {record.result === 2 ? (
                <>
                  <span
                    style={{ color: "rgba(0, 0, 0, 0.25)", marginLeft: 10 }}
                  >
                    {context.delete}
                  </span>
                </>
              ) : (
                <>
                  <a
                    style={{ marginLeft: 10 }}
                    onClick={() => setDeleteOneModal(true)}
                  >
                    {context.delete}
                  </a>
                </>
              )}
            </div>
          </div>
        );
      },
    },
  ];
};

export default getColumnsConfig;
