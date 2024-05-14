import { OmpContentWrapper, OmpTable, OmpMessageModal } from "@/components";
import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { Button, Tooltip, Input, message } from "antd";
import {
  handleResponse,
  _idxInit,
  nonEmptyProcessing,
  renderDisc,
} from "@/utils/utils";
import moment from "moment";
import ServiceRollbackModal from "../AppStore/config/ServiceRollbackModal";
import { SearchOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { locales } from "@/config/locales";

// 渲染状态
const renderStatus = (context, record) => {
  let text = record.state;
  if (text.includes("SUCCESS")) {
    return (
      <span>
        {renderDisc("normal", 7, -1)}
        {context.succeeded}
      </span>
    );
  }
  if (text.includes("FAIL")) {
    return (
      <span>
        {renderDisc("critical", 7, -1)}
        {context.failed}
      </span>
    );
  }
  if (text.includes("WAIT") || text.includes("ING")) {
    return (
      <span>
        {renderDisc("warning", 7, -1)}
        {context.executing}
      </span>
    );
  }
  return "-";
};

const msgMap = {
  "en-US": {
    stopOne: "Are you sure to execute the termination?",
    stopTwo:
      "This operation will forcibly interrupt the task and set it to a failed state!!!",
    stopThree:
      "Attention: Apply to situations where the waiting time is too long or the stuck state is released",
  },
  "zh-CN": {
    stopOne: "确认执行强制中断吗?",
    stopTwo: "该操作会强制停止流程任务，并将任务状态置为失败！！!",
    stopThree: "注意：应用于等待时间过长，解除卡死状态",
  },
};

const InstallationRecord = ({ locale }) => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  // 原始数据
  const [initDataSource, setInitDataSource] = useState([]);
  const [vfModalVisibility, setVfModalVisibility] = useState(false);
  const [instanceSelectValue, setInstanceSelectValue] = useState("");
  const [rowId, setRowId] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });
  // 控制中断任务
  const [zdModalVisibility, setZdModalVisibility] = useState(false);
  const [zdModalLoading, setZdModalLoading] = useState(false);
  const [zdInfo, setZdInfo] = useState(null);
  const context = locales[locale].common;

  const typeMap = {
    MainInstallHistory: context.install,
    RollbackHistory: context.rollback,
    UpgradeHistory: context.upgrade,
  };

  const columns = [
    {
      title: context.type,
      width: 60,
      key: "module",
      dataIndex: "module",
      usefilter: true,
      queryRequest: (params) => {
        fetchData(
          { current: 1, pageSize: pagination.pageSize },
          pagination.ordering,
          { ...pagination.searchParams, ...params }
        );
      },
      filterMenuList: Object.keys(typeMap).map((k) => {
        return {
          value: k,
          text: typeMap[k],
        };
      }),
      align: "center",
      fixed: "left",
      render: (text) => typeMap[text],
    },
    {
      title: context.total,
      key: "count",
      dataIndex: "count",
      width: 50,
      align: "center",
      render: nonEmptyProcessing,
    },
    {
      title: context.status,
      key: "install_status",
      dataIndex: "install_status",
      width: 80,
      align: "center",
      render: (text, record) => renderStatus(context, record),
    },
    {
      title: context.serviceInstance,
      key: "service_instance_name",
      dataIndex: "service_instance_name",
      width: 200,
      ellipsis: true,
      align: "center",
      render: (text) => {
        return (
          <Tooltip title={text} placement="topLeft">
            <span>{text ? text : "-"}</span>
          </Tooltip>
        );
      },
    },
    {
      title: context.beginTime,
      key: "created",
      dataIndex: "created",
      align: "center",
      width: 100,
      sorter: (a, b) => a.created - b.created,
      sortDirections: ["descend", "ascend"],
      render: (text) => {
        if (text) {
          return moment(text).format("YYYY-MM-DD HH:mm:ss");
        } else {
          return "-";
        }
      },
    },
    {
      title: context.endTime,
      key: "end_time",
      dataIndex: "end_time",
      align: "center",
      width: 100,
      render: (text, record) => {
        if (record.install_status === 1) {
          return "-";
        }
        if (text) {
          return moment(text).format("YYYY-MM-DD HH:mm:ss");
        } else {
          return "-";
        }
      },
    },
    {
      title: context.duration,
      key: "duration",
      dataIndex: "duration",
      align: "center",
      width: 80,
      render: (text) => {
        if (text === "" || text === null || text === undefined) {
          return "-";
        }
        return text
          .replace("秒", context.s)
          .replace("分", context.m)
          .replace("时", context.h)
          .replace("天", context.d);
      },
    },
    {
      title: context.action,
      key: "1",
      width: 80,
      dataIndex: "1",
      align: "center",
      fixed: "right",
      render: (text, record, index) => {
        switch (record.module) {
          case "MainInstallHistory":
            return (
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <div style={{ margin: "auto" }}>
                  <a
                    onClick={() => {
                      history.push({
                        pathname:
                          "/application_management/app_store/installation",
                        state: {
                          uniqueKey: record.module_id,
                          step: 4,
                        },
                      });
                    }}
                  >
                    {context.view}
                  </a>
                  {record.state?.includes("ING") && (
                    <a
                      style={{ marginLeft: 10 }}
                      onClick={() => {
                        setZdInfo({
                          module_id: record.module_id,
                          module: record.module,
                        });
                        setZdModalVisibility(true);
                      }}
                    >
                      {context.termination}
                    </a>
                  )}
                </div>
              </div>
            );
            break;
          case "RollbackHistory":
            return (
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <div style={{ margin: "auto" }}>
                  <a
                    onClick={() => {
                      history.push({
                        pathname:
                          "/application_management/app_store/service_rollback",
                        state: {
                          history: record.module_id,
                        },
                      });
                    }}
                  >
                    {context.view}
                  </a>
                  {record.state?.includes("ING") && (
                    <a
                      style={{ marginLeft: 10 }}
                      onClick={() => {
                        setZdInfo({
                          module_id: record.module_id,
                          module: record.module,
                        });
                        setZdModalVisibility(true);
                      }}
                    >
                      {context.termination}
                    </a>
                  )}
                </div>
              </div>
            );
            break;
          case "UpgradeHistory":
            return (
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <div style={{ margin: "auto" }}>
                  <a
                    onClick={() => {
                      history.push({
                        pathname:
                          "/application_management/app_store/service_upgrade",
                        state: {
                          history: record.module_id,
                        },
                      });
                    }}
                  >
                    {context.view}
                  </a>
                  {record.can_rollback && (
                    <a
                      style={{ marginLeft: 10 }}
                      onClick={() => {
                        if (record.can_rollback) {
                          setRowId(record.module_id);
                          setVfModalVisibility(true);
                        }
                      }}
                    >
                      {context.rollback}
                    </a>
                  )}
                  {record.state?.includes("ING") && (
                    <a
                      style={{ marginLeft: 10 }}
                      onClick={() => {
                        setZdInfo({
                          module_id: record.module_id,
                          module: record.module,
                        });
                        setZdModalVisibility(true);
                      }}
                    >
                      {context.termination}
                    </a>
                  )}
                </div>
              </div>
            );
            break;
          default:
            return "-";
            break;
        }
      },
    },
  ];

  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    ordering,
    searchParams
  ) => {
    setLoading(true);
    fetchGet(apiRequest.installHistoryPage.queryAllList, {
      params: {
        page: pageParams.current,
        size: pageParams.pageSize,
        ordering: ordering ? ordering : null,
        search: searchParams?.module,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setDataSource(res.data.results);
          setInitDataSource(res.data.results);
          setPagination({
            ...pagination,
            total: res.data.count,
            pageSize: pageParams.pageSize,
            current: pageParams.current,
            ordering: ordering,
            searchParams: searchParams,
          });
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  const stopPorcess = () => {
    setZdModalLoading(true);
    fetchPost(apiRequest.appStore.stopProcess, {
      body: zdInfo,
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.message === "success") {
            fetchData(
              {
                current: pagination.current,
                pageSize: pagination.pageSize,
              },
              pagination.ordering,
              pagination.searchParams
            );
            message.success(res.data);
            setZdModalVisibility(false);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setZdModalLoading(false);
      });
  };

  useEffect(() => {
    fetchData(pagination);
  }, []);

  return (
    <OmpContentWrapper wrapperStyle={{ paddingBottom: 0 }}>
      {/* -- 顶部区域 -- */}
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", marginLeft: "auto" }}>
          <Input
            placeholder={context.input + context.ln + context.serviceInstance}
            style={{ width: 220 }}
            allowClear
            value={instanceSelectValue}
            onChange={(e) => {
              setInstanceSelectValue(e.target.value);
              if (!e.target.value) {
                setDataSource(initDataSource);
              }
            }}
            onPressEnter={(e) => {
              setDataSource(
                initDataSource.filter((i) =>
                  i.service_instance_name.includes(e.target.value)
                )
              );
            }}
            suffix={<SearchOutlined style={{ color: "#b6b6b6" }} />}
          />
          <Button
            style={{ marginLeft: 10 }}
            onClick={() => {
              fetchData(
                {
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                },
                pagination.ordering,
                pagination.searchParams
              );
            }}
          >
            {context.refresh}
          </Button>
        </div>
      </div>

      {/* -- 表格 -- */}
      <div
        style={{
          border: "1px solid #ebeef2",
          backgroundColor: "white",
          marginTop: 10,
        }}
      >
        <OmpTable
          noScroll={true}
          loading={loading}
          onChange={(e, filters, sorter) => {
            let ordering = sorter.order
              ? `${sorter.order === "descend" ? "" : "-"}${sorter.columnKey}`
              : null;
            setTimeout(() => {
              fetchData(e, ordering, pagination.searchParams);
            }, 200);
          }}
          columns={columns}
          dataSource={dataSource}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "30"],
            showTotal: () => (
              <div
                style={{
                  display: "flex",
                  width: "200px",
                  lineHeight: 2.8,
                  flexDirection: "row-reverse",
                }}
              >
                <p style={{ color: "rgb(152, 157, 171)" }}>
                  {context.total}{" "}
                  <span style={{ color: "rgb(63, 64, 70)" }}>
                    {pagination.total}
                  </span>
                  {context.tiao}
                </p>
              </div>
            ),
            ...pagination,
          }}
          rowKey={(record) => record.id}
        />
      </div>

      {/* -- 服务回滚 -- */}
      <ServiceRollbackModal
        sRModalVisibility={vfModalVisibility}
        setSRModalVisibility={setVfModalVisibility}
        initLoading={loading}
        fixedParams={`?history_id=${rowId}`}
        context={context}
      />

      {/* -- 强制中断 -- */}
      <OmpMessageModal
        visibleHandle={[zdModalVisibility, setZdModalVisibility]}
        context={context}
        loading={zdModalLoading}
        onFinish={() => stopPorcess()}
      >
        <div style={{ padding: "20px", fontWeight: 500, color: "red" }}>
          {msgMap[locale].stopOne}
          <p>{msgMap[locale].stopTwo}</p>
          <p>{msgMap[locale].stopThree}</p>
        </div>
      </OmpMessageModal>
    </OmpContentWrapper>
  );
};

export default InstallationRecord;
