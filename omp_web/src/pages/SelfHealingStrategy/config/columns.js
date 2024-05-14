import { renderDisc } from "@/utils/utils";
import { Tooltip } from "antd";

const getColumnsConfig = (
  setStrategyRow,
  setDeleteStrategyModal,
  setStrategyModalType,
  setStrategyModalVisibility,
  strategyForm,
  queryCanHealing,
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
      title: context.repair + context.ln + context.mode,
      key: "repair_instance",
      dataIndex: "repair_instance",
      align: "center",
      width: 200,
      ellipsis: true,
      render: (text) => {
        // if (text.length > 0 && text[0] === "all") return "所有服务";
        const textMap = {
          host: context.monitorAgent,
          component: context.component,
          service: context.selfService,
        };
        const resText = text.map((e) => textMap[e]);
        return (
          <Tooltip title={resText.join(", ")}>
            <span>{resText.join(", ")}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.repair + context.ln + context.type,
      key: "instance_tp",
      dataIndex: "instance_tp",
      align: "center",
      width: 60,
      ellipsis: true,
      render: (text) => {
        if (text === 0) {
          return context.start;
        } else {
          return context.restart;
        }
      },
    },
    {
      title: context.scan + context.ln + context.period,
      key: "fresh_rate",
      dataIndex: "fresh_rate",
      align: "center",
      width: 100,
      ellipsis: true,
      render: (text) => {
        return `${text} min`;
      },
    },
    {
      title: context.retry + context.ln + context.count,
      key: "max_healing_count",
      dataIndex: "max_healing_count",
      align: "center",
      width: 100,
      ellipsis: true,
    },
    {
      title: context.open,
      key: "used",
      dataIndex: "used",
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
      title: context.action,
      width: 100,
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
            <a
              style={{ marginLeft: 10 }}
              onClick={() => {
                queryCanHealing();
                setStrategyModalType("update");
                setStrategyModalVisibility(true);
                strategyForm.setFieldsValue({
                  repair_instance: record.repair_instance,
                  fresh_rate: record.fresh_rate,
                  instance_tp: record.instance_tp,
                  max_healing_count: record.max_healing_count,
                  used: record.used,
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
