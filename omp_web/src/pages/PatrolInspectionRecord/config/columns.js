import { renderDisc, downloadFile, handleResponse } from "@/utils/utils";
import { message } from "antd";
import moment from "moment";
import { apiRequest } from "src/config/requestApi";
import { fetchGet } from "@/utils/request";

const getColumnsConfig = (queryRequest, history, pushData, context) => {
  // 推送邮件相关数据
  const { pushForm, setPushLoading, setPushAnalysisModal, setPushInfo } =
    pushData;

  const fetchDetailData = (id) => {
    fetchGet(`${apiRequest.inspection.reportDetail}/${id}/`)
      .then((res) => {
        handleResponse(res, (res) => {
          downloadFile(`/download-inspection/${res.data.file_name}`);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  // 查询推送数据
  const fetchPushDate = (record) => {
    setPushLoading(true);
    fetchGet(apiRequest.inspection.queryPushConfig)
      .then((res) => {
        handleResponse(res, (res) => {
          if (res && res.data) {
            const { to_users } = res.data;
            pushForm.setFieldsValue({
              email: to_users,
            });
            setPushInfo({
              id: record.id,
              module: record.inspection_type,
              to_users: to_users,
            });
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setPushLoading(false);
      });
  };

  // 点击推送
  const clickPush = (record) => {
    setPushAnalysisModal(true);
    fetchPushDate(record);
  };

  return [
    {
      title: context.row,
      width: 40,
      key: "idx",
      dataIndex: "idx",
      align: "center",
      fixed: "left",
    },
    {
      title: context.report + context.ln + context.name,
      width: 100,
      key: "inspection_name",
      dataIndex: "inspection_name",
      align: "center",
      fixed: "left",
      render: (text, record, index) => {
        if (record.inspection_status == 2) {
          return (
            <a
              style={{ fontSize: 12 }}
              onClick={() => {
                history?.push({
                  pathname: `/status-patrol/patrol-inspection-record/status-patrol-detail/${record.id}`,
                });
              }}
            >
              {text
                .replace("深度巡检", context.deep)
                .replace("主机巡检", context.host)
                .replace("组件巡检", context.component)}
            </a>
          );
        }
        return text;
      },
    },
    {
      title: context.report + context.ln + context.type,
      width: 80,
      key: "inspection_type",
      align: "center",
      dataIndex: "inspection_type",
      usefilter: true,
      queryRequest: queryRequest,
      filterMenuList: [
        {
          value: "service",
          text: context.component,
        },
        {
          value: "host",
          text: context.host,
        },
        {
          value: "deep",
          text: context.deep,
        },
      ],
      render: (text) => {
        if (text === "service") {
          return context.component;
        }
        if (text === "host") {
          return context.host;
        }
        if (text === "deep") {
          return context.deep;
        }
      },
    },
    {
      title: context.result,
      width: 80,
      key: "inspection_status",
      dataIndex: "inspection_status",
      usefilter: true,
      queryRequest: queryRequest,
      filterMenuList: [
        {
          value: "1",
          text: context.executing,
        },
        {
          value: "2",
          text: context.succeeded,
        },
        {
          value: "3",
          text: context.failed,
        },
      ],
      align: "center",
      render: (text) => {
        if (!text && text !== 0) {
          return "-";
        } else if (text === 1) {
          return (
            <div>
              {renderDisc("normal", 7, -1)}
              {context.executing}
            </div>
          );
        } else if (text === 2) {
          return (
            <div>
              {renderDisc("normal", 7, -1)}
              {context.succeeded}
            </div>
          );
        } else if (text === 3) {
          return (
            <div>
              {renderDisc("critical", 7, -1)}
              {context.failed}
            </div>
          );
        } else {
          return text;
        }
      },
    },
    {
      title: context.execute + context.ln + context.type,
      align: "center",
      dataIndex: "execute_type",
      key: "execute_type",
      width: 80,
      usefilter: true,
      queryRequest: queryRequest,
      filterMenuList: [
        {
          value: "man",
          text: context.manually,
        },
        {
          value: "auto",
          text: context.regularly,
        },
      ],
      render: (text) => {
        if (text === "man") {
          return context.manually;
        } else if (text === "auto") {
          return context.regularly;
        } else {
          return "-";
        }
      },
    },
    {
      title: context.timestamp,
      width: 120,
      key: "start_time",
      dataIndex: "start_time",
      ellipsis: true,
      sorter: (a, b) =>
        moment(a.start_time).valueOf() - moment(b.start_time).valueOf(),
      sortDirections: ["descend", "ascend"],
      align: "center",
      render: (text) => {
        if (!text) return "-";
        return moment(text).format("YYYY-MM-DD HH:mm:ss");
      },
    },
    {
      title: context.duration,
      key: "duration",
      dataIndex: "duration",
      align: "center",
      width: 60,
      render: (text) => {
        if (text && text !== "-") {
          let timer = moment.duration(text, "seconds");

          let hours = timer.hours();
          let hoursResult = hours ? hours + context.h : "";

          let minutes = timer.minutes();
          let minutesResult = minutes % 60 ? (minutes % 60) + context.m : "";

          let seconds = timer.seconds();
          let secondsResult = seconds % 60 ? (seconds % 60) + context.s : "";

          return `${hoursResult} ${minutesResult} ${secondsResult}`;
        } else {
          return "-";
        }
      },
    },
    {
      title: context.push + context.ln + context.result,
      key: "send_email_result",
      dataIndex: "send_email_result",
      align: "center",
      width: 80,
      render: (text, record) => {
        switch (text) {
          case 1:
            return (
              <div>
                {renderDisc("normal", 7, -1)}
                {context.succeeded}
              </div>
            );
          case 2:
            return (
              <div>
                {renderDisc("warning", 7, -1)}
                {context.pushing}
              </div>
            );
          case 0:
            return (
              <div>
                {renderDisc("critical", 7, -1)}
                {context.failed}
              </div>
            );
          case 3:
            return (
              <div>
                {renderDisc("warning", 7, -1)}
                {context.noPush}
              </div>
            );
          default:
            return "-";
        }
      },
    },
    {
      title: context.action,
      width: 60,
      key: "",
      dataIndex: "",
      fixed: "right",
      align: "center",
      render: (text, record, index) => {
        return (
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <div style={{ margin: "auto" }}>
              {record.inspection_status == 2 ? (
                <>
                  <a
                    onClick={() => {
                      message.success(
                        context.download + context.ln + context.succeeded
                      );
                      fetchDetailData(record.id);
                    }}
                  >
                    {context.export}
                  </a>
                  <a
                    style={{ marginLeft: 10 }}
                    onClick={() => clickPush(record)}
                  >
                    {context.push}
                  </a>
                </>
              ) : (
                <span style={{ color: "rgba(0, 0, 0, 0.25" }}>
                  {context.export}
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
