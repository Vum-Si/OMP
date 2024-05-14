import moment from "moment";
import { nonEmptyProcessing } from "@/utils/utils";

const getColumnsConfig = (history, context, locale) => {
  return [
    {
      title: context.number,
      width: 140,
      key: "_idx",
      dataIndex: "_idx",
      align: "center",
      render: nonEmptyProcessing,
      fixed: "left",
    },
    {
      title: context.template + context.ln + context.name,
      width: 280,
      key: "plan_name",
      dataIndex: "plan_name",
      align: "center",
      render: (text) =>
        locale === "zh-CN" ? text : text.replace("快速部署", "Template"),
    },
    {
      title: context.host + context.ln + context.total,
      key: "host_num",
      width: 150,
      dataIndex: "host_num",
      align: "center",
    },
    {
      title: context.product + context.ln + context.total,
      key: "product_num",
      width: 150,
      dataIndex: "product_num",
      align: "center",
    },
    {
      title: context.service + context.ln + context.total,
      key: "service_num",
      width: 150,
      dataIndex: "service_num",
      align: "center",
    },
    {
      title: context.created,
      key: "created",
      dataIndex: "created",
      align: "center",
      width: 280,
      render: (text) => {
        if (text) {
          return moment(text).format("YYYY-MM-DD HH:mm:ss");
        } else {
          return "-";
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
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <a
              onClick={() => {
                history.push({
                  pathname: "/application_management/app_store/installation",
                  state: {
                    uniqueKey: record.operation_uuid,
                    step: 4,
                  },
                });
              }}
            >
              {context.view}
            </a>
          </div>
        );
      },
    },
  ];
};

export default getColumnsConfig;
