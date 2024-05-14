import { OmpContentWrapper, OmpTable, OmpDrawer } from "@/components";
import { Tooltip, Badge } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit, colorConfig } from "@/utils/utils";
import { fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import moment from "moment";
import { useHistory } from "react-router-dom";

const ExceptionList = ({ context }) => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [searchParams, setSearchParams] = useState({});
  const [showIframe, setShowIframe] = useState({});
  const [pageSize, setPageSize] = useState(5);

  const fetchData = (searchParams = {}, noLoading) => {
    !noLoading && setLoading(true);
    fetchGet(apiRequest.ExceptionList.exceptionList, {
      params: {
        ...searchParams,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setSearchParams(searchParams);
          setDataSource(
            res.data.map((item, idx) => ({
              ...item,
              key: idx + item.ip,
            }))
          );
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData(null, true);
  }, []);

  return (
    <OmpContentWrapper>
      <div
        style={{
          border: "1px solid #ebeef2",
          backgroundColor: "white",
          marginTop: 6,
          marginBottom: -8,
        }}
      >
        <OmpTable
          size="small"
          scroll={{ x: 600 }}
          loading={loading}
          onChange={(e, filters, sorter) => {
            setPageSize(e.pageSize);
            if (sorter.columnKey) {
              let sort = sorter.order == "descend" ? 0 : 1;
              setTimeout(() => {
                fetchData({
                  ...searchParams,
                  ordering: sorter.column ? sorter.columnKey : null,
                  asc: sorter.column ? sort : null,
                });
              }, 200);
            }
          }}
          columns={getColumnsConfig(
            (params) => {
              fetchData({ ...searchParams, ...params });
            },
            setShowIframe,
            history,
            context
          )}
          dataSource={dataSource}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ["5", "10", "20", "50"],
            showTotal: () => (
              <div
                style={{
                  display: "flex",
                  width: "200px",
                  flexDirection: "row-reverse",
                  lineHeight: 2.8,
                }}
              >
                <p
                  style={{
                    color: "rgb(152, 157, 171)",
                    position: "relative",
                    top: -4,
                  }}
                >
                  {context.total}{" "}
                  <span style={{ color: "rgb(63, 64, 70)" }}>
                    {dataSource?.length}
                  </span>
                  {context.tiao}
                </p>
              </div>
            ),
            pageSize: pageSize,
          }}
        />
      </div>

      {/* -- 监控面板 -- */}
      <OmpDrawer
        showIframe={showIframe}
        setShowIframe={setShowIframe}
        context={context}
      />
    </OmpContentWrapper>
  );
};

const getColumnsConfig = (queryRequest, setShowIframe, history, context) => {
  return [
    {
      title: context.instanceName,
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
      key: "ip",
      dataIndex: "ip",
      width: 120,
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
      width: 80,
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
      usefilter: true,
      queryRequest: queryRequest,
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
      width: 320,
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
      title: context.timestamp,
      width: 200,
      key: "date",
      dataIndex: "date",
      align: "center",
      ellipsis: true,
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
                  style={{ marginLeft: 10 }}
                  onClick={() =>
                    history.push({
                      pathname: "/status-patrol/patrol-inspection-record",
                    })
                  }
                >
                  {context.analysis}
                </a>
              ) : record.log_url ? (
                <a
                  style={{ marginLeft: 10 }}
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

export default ExceptionList;
