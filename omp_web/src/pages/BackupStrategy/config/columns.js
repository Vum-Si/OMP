import { renderDisc } from "@/utils/utils";
import { Tooltip } from "antd";
import moment from "moment";

const getColumnsConfig = (
  setStrategyRow,
  setDeleteStrategyModal,
  setStrategyModalType,
  setStrategyModalVisibility,
  setExecuteVisible,
  strategyForm,
  setKeyArr,
  weekData,
  setFrequency,
  canBackupIns,
  setAppName,
  setNoteText,
  setCustomValue,
  context
) => {
  return [
    {
      title: context.row,
      key: "_idx",
      dataIndex: "_idx",
      align: "center",
      width: 40,
      fixed: "left",
    },
    {
      title: context.backup + context.ln + context.instance,
      key: "backup_instances",
      dataIndex: "backup_instances",
      align: "center",
      width: 200,
      ellipsis: true,
      render: (text) => {
        return (
          <Tooltip title={text.join(",")}>
            <span>{text.join(",")}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.open,
      key: "is_on",
      dataIndex: "is_on",
      align: "center",
      width: 60,
      ellipsis: true,
      render: (text) => {
        if (text) {
          return (
            <span>
              {renderDisc("normal", 7, -1)}
              {context.yes}
            </span>
          );
        } else {
          return (
            <span>
              {renderDisc("critical", 7, -1)}
              {context.no}
            </span>
          );
        }
      },
    },
    {
      title: context.regular + context.ln + context.rule,
      key: "crontab_detail",
      dataIndex: "crontab_detail",
      align: "center",
      width: 140,
      ellipsis: true,
      render: (text) => {
        if (text.day_of_month !== "*") {
          return (
            <span>
              {context.monthly} {text.day_of_month} {context.day} {text.hour}:
              {text.minute}
            </span>
          );
        } else if (text.day_of_week !== "*") {
          return (
            <span>
              {context.weekly} {weekData[text.day_of_week].name} {text.hour}:
              {text.minute}
            </span>
          );
        } else {
          return (
            <span>
              {context.daily} {text.hour}:{text.minute}
            </span>
          );
        }
      },
    },
    {
      title: context.save + context.ln + context.path,
      key: "retain_path",
      dataIndex: "retain_path",
      align: "center",
      width: 140,
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
      title: context.save + context.ln + context.time,
      key: "retain_day",
      dataIndex: "retain_day",
      align: "center",
      width: 100,
      ellipsis: true,
      render: (text) => {
        if (text === -1) return <span>{context.forever}</span>;
        return (
          <span>
            {text} {context.days}
          </span>
        );
      },
    },
    {
      title: context.action,
      width: 120,
      key: "",
      dataIndex: "",
      align: "center",
      fixed: "right",
      render: (text, record, index) => {
        return (
          <div
            style={{ margin: "auto" }}
            onClick={() => setStrategyRow(record)}
          >
            <a onClick={() => setExecuteVisible(true)}>{context.execute}</a>
            <a
              style={{ marginLeft: 10 }}
              onClick={() => {
                setStrategyModalType("update");
                setStrategyModalVisibility(true);
                const targetAppName = record.backup_instances[0].split("-")[0];
                setAppName(targetAppName);
                for (let i = 0; i < canBackupIns.length; i++) {
                  const element = canBackupIns[i];
                  if (element.app_name === targetAppName) {
                    setNoteText(element.note);
                    setCustomValue(element.backup_custom);
                    break;
                  }
                }
                const customInfo = record.backup_custom.map((i) => {
                  return {
                    key: i.id,
                    value: i.id,
                    label: [
                      <span
                        style={{
                          color: "#096dd9",
                          fontWeight: 600,
                          marginRight: 10,
                        }}
                      >
                        [{i.field_k}]
                      </span>,
                      i.field_v,
                    ],
                  };
                });
                setKeyArr(
                  customInfo.map((i) => {
                    return i.label[0].props.children[1];
                  })
                );
                const frType =
                  record.crontab_detail.day_of_month !== "*"
                    ? "month"
                    : record.crontab_detail.day_of_week !== "*"
                    ? "week"
                    : "day";
                const stRes = {
                  frequency: frType,
                  time: moment(
                    `${record.crontab_detail.hour}:${record.crontab_detail.minute}`,
                    "HH:mm"
                  ),
                };
                setFrequency(frType);
                if (frType === "month")
                  stRes["month"] = record.crontab_detail.day_of_month;
                if (frType === "week")
                  stRes["week"] = record.crontab_detail.day_of_week;
                strategyForm.setFieldsValue({
                  backup_instances: record.backup_instances,
                  backup_custom: customInfo,
                  retain_path: record.retain_path,
                  retain_day: record.retain_day,
                  is_on: record.is_on,
                  strategy: stRes,
                });
              }}
            >
              {context.edit}
            </a>

            <a
              style={{ marginLeft: 10 }}
              onClick={() => setDeleteStrategyModal(true)}
            >
              {context.delete}
            </a>
          </div>
        );
      },
    },
  ];
};

export default getColumnsConfig;
