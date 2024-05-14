import { OmpContentWrapper, OmpTable, OmpMessageModal } from "@/components";
import { Button, message, Input, Checkbox, Form } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit } from "@/utils/utils";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import getColumnsConfig from "./config/columns";
import { ExclamationCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { useHistory } from "react-router-dom";
import PatrolInspectionDetail from "@/pages/PatrolInspectionRecord/config/detail";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    exeLeft: "Are you sure to execute",
    exeRight: "inspection?",
    clickMsg: "If you need to configure a default receiver, please click",
  },
  "zh-CN": {
    exeLeft: "确认要执行",
    exeRight: "巡检吗?",
    clickMsg: " 如果需要配置默认的巡检报告接收人，请点击",
  },
};

const PatrolInspectionRecord = ({ locale }) => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [instanceSelectValue, setInstanceSelectValue] = useState("");
  // 深度分析modal弹框
  const [deepAnalysisModal, setDeepAnalysisModal] = useState(false);
  // 主机巡检modal弹框
  const [hostAnalysisModal, setHostAnalysisModal] = useState(false);
  // 组件巡检modal弹框
  const [componenetAnalysisModal, setComponenetAnalysisModal] = useState(false);
  // 邮件推送modal弹框
  const [pushAnalysisModal, setPushAnalysisModal] = useState(false);
  const [checkboxGroupData, setcheckboxGroupData] = useState([]);
  // ip列表
  const [ipListSource, setIpListSource] = useState([]);
  // service列表
  const [serviceListSource, setServiceListSource] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });
  // 详情数据
  const [showDetail, setShowDetail] = useState({
    isShow: false,
    data: {},
  });
  // 推送表单数据
  const [pushForm] = Form.useForm();
  // 点击推送按钮数据
  const [pushInfo, setPushInfo] = useState();
  const context = locales[locale].common;

  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    searchParams = {},
    ordering
  ) => {
    setLoading(true);
    fetchGet(apiRequest.inspection.inspectionList, {
      params: {
        page: pageParams.current,
        size: pageParams.pageSize,
        ordering: ordering ? ordering : null,
        ...searchParams,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setDataSource(
            res.data.results.map((i, idx) => {
              return {
                ...i,
                idx: idx + 1 + (pageParams.current - 1) * pageParams.pageSize,
                key: i.id,
              };
            })
          );
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

  const taskDistribution = (type, data) => {
    setLoading(true);
    fetchPost(apiRequest.inspection.taskDistribution, {
      body: {
        inspection_name: "mock",
        inspection_type: type,
        inspection_status: "1",
        execute_type: "man",
        inspection_operator: localStorage.getItem("username"),
        env: 1,
        ...data,
      },
    })
      .then((res) => {
        if (res && res.data) {
          if (res.data.code == 1) {
            message.warning(res.data.message);
          }
          if (res.data.code == 0) {
            message.success("任务已下发");
            fetchData(
              { current: pagination.current, pageSize: pagination.pageSize },
              { inspection_name: instanceSelectValue },
              pagination.ordering
            );
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setDeepAnalysisModal(false);
        setHostAnalysisModal(false);
        setComponenetAnalysisModal(false);
      });
  };

  // 巡检的主机ip列表
  const fetchIPlist = () => {
    fetchGet(apiRequest.machineManagement.ipList)
      .then((res) => {
        handleResponse(res, (res) => {
          setIpListSource(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  // 巡检的组件列表
  const fetchServicelist = () => {
    fetchGet(apiRequest.inspection.servicesList)
      .then((res) => {
        handleResponse(res, (res) => {
          setServiceListSource(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  useEffect(() => {
    fetchData();
    fetchIPlist();
    fetchServicelist();
  }, []);

  const pushEmail = () => {
    setPushLoading(true);
    fetchPost(apiRequest.inspection.pushEmail, {
      body: {
        ...pushInfo,
        to_users: pushForm.getFieldValue("email"),
      },
    })
      .then((res) => {
        if (res && res.data) {
          if (res.data.code == 1) {
            message.warning(res.data.message);
          }
          if (res.data.code == 0) {
            message.success(context.push + context.ln + context.succeeded);
            setPushAnalysisModal(false);
            fetchData();
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => setPushLoading(false));
  };

  if (showDetail.isShow) {
    return <PatrolInspectionDetail data={showDetail.data} />;
  }

  return (
    <OmpContentWrapper>
      {/* -- 顶部巡检按钮/过滤 -- */}
      <div style={{ display: "flex" }}>
        <Button type="primary" onClick={() => setDeepAnalysisModal(true)}>
          {context.deep + context.ln + context.inspection}
        </Button>

        <Button
          type="primary"
          onClick={() => setHostAnalysisModal(true)}
          style={{ marginLeft: 10 }}
        >
          {context.host + context.ln + context.inspection}
        </Button>

        <Button
          type="primary"
          onClick={() => setComponenetAnalysisModal(true)}
          style={{ marginLeft: 10 }}
        >
          {context.component + context.ln + context.inspection}
        </Button>

        <div style={{ display: "flex", marginLeft: "auto" }}>
          <span
            style={{ marginRight: 5, display: "flex", alignItems: "center" }}
          >
            {context.report + context.ln + context.name + " : "}
          </span>
          <Input
            placeholder={
              context.input +
              context.ln +
              context.report +
              context.ln +
              context.name
            }
            style={{ width: 200 }}
            allowClear
            value={instanceSelectValue}
            onChange={(e) => {
              setInstanceSelectValue(e.target.value);
              if (!e.target.value) {
                fetchData(
                  { current: 1, pageSize: pagination.pageSize },
                  {
                    ...pagination.searchParams,
                    inspection_name: null,
                  }
                );
              }
            }}
            onBlur={() => {
              if (instanceSelectValue) {
                fetchData(
                  { current: 1, pageSize: pagination.pageSize },
                  {
                    ...pagination.searchParams,
                    inspection_name: instanceSelectValue,
                  }
                );
              }
            }}
            onPressEnter={() => {
              fetchData(
                { current: 1, pageSize: pagination.pageSize },
                {
                  ...pagination.searchParams,
                  inspection_name: instanceSelectValue,
                }
              );
            }}
            suffix={
              !instanceSelectValue && (
                <SearchOutlined style={{ fontSize: 12, color: "#b6b6b6" }} />
              )
            }
          />
          <Button
            style={{ marginLeft: 10 }}
            onClick={() => {
              fetchData(
                { current: pagination.current, pageSize: pagination.pageSize },
                { inspection_name: instanceSelectValue },
                pagination.ordering
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
          loading={loading}
          onChange={(e, filters, sorter) => {
            console.log("ui");
            let ordering = sorter.order
              ? `${sorter.order == "descend" ? "" : "-"}${sorter.columnKey}`
              : null;
            setTimeout(() => {
              fetchData(e, pagination.searchParams, ordering);
            }, 200);
          }}
          columns={getColumnsConfig(
            (params) => {
              fetchData(
                { current: 1, pageSize: pagination.pageSize },
                { ...pagination.searchParams, ...params },
                pagination.ordering
              );
            },
            history,
            { pushForm, setPushLoading, setPushAnalysisModal, setPushInfo },
            context
          )}
          dataSource={dataSource}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: () => (
              <div
                style={{
                  display: "flex",
                  width: "200px",
                  flexDirection: "row-reverse",
                  lineHeight: 2.8,
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
        />
      </div>

      {/* -- 深度巡检 -- */}
      <OmpMessageModal
        visibleHandle={[deepAnalysisModal, setDeepAnalysisModal]}
        context={context}
        loading={loading}
        onFinish={() => taskDistribution("deep")}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].exeLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {context.deep}{" "}
          </span>
          {msgMap[locale].exeLeft}
        </div>
      </OmpMessageModal>

      {/* -- 主机巡检 -- */}
      <OmpMessageModal
        afterClose={() => setcheckboxGroupData([])}
        visibleHandle={[hostAnalysisModal, setHostAnalysisModal]}
        disabled={checkboxGroupData.length == 0}
        title={
          <span>
            <ExclamationCircleOutlined
              style={{
                fontSize: 20,
                color: "#f0a441",
                paddingRight: "10px",
                position: "relative",
                top: 2,
              }}
            />
            {context.host + context.ln + context.inspection}
          </span>
        }
        context={context}
        loading={loading}
        onFinish={() => {
          taskDistribution("host", {
            hosts: checkboxGroupData,
          });
        }}
      >
        <>
          <div
            style={{
              borderBottom: "1px solid #E9E9E9",
              paddingBottom: 10,
              marginBottom: 10,
            }}
          >
            <Checkbox
              indeterminate={
                checkboxGroupData.length !== 0 &&
                checkboxGroupData.length !== ipListSource.length
              }
              checked={checkboxGroupData.length == ipListSource.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setcheckboxGroupData(ipListSource);
                } else {
                  setcheckboxGroupData([]);
                }
              }}
            >
              {context.all}
            </Checkbox>
          </div>
          <Checkbox.Group
            style={{ width: "100%" }}
            onChange={(e) => setcheckboxGroupData(e)}
            value={checkboxGroupData}
          >
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {ipListSource.map((item) => {
                return (
                  <div key={item} style={{ padding: "0 10px 15px 0" }}>
                    <Checkbox key={item} value={item}>
                      {item}
                    </Checkbox>
                  </div>
                );
              })}
            </div>
          </Checkbox.Group>
        </>
      </OmpMessageModal>

      {/* -- 服务巡检 -- */}
      <OmpMessageModal
        afterClose={() => setcheckboxGroupData([])}
        visibleHandle={[componenetAnalysisModal, setComponenetAnalysisModal]}
        disabled={checkboxGroupData.length == 0}
        title={
          <span>
            <ExclamationCircleOutlined
              style={{
                fontSize: 20,
                color: "#f0a441",
                paddingRight: "10px",
                position: "relative",
                top: 2,
              }}
            />
            {context.component + context.ln + context.inspection}
          </span>
        }
        context={context}
        loading={loading}
        onFinish={() => {
          taskDistribution("service", {
            services: checkboxGroupData,
          });
        }}
      >
        <>
          <div
            style={{
              borderBottom: "1px solid #E9E9E9",
              paddingBottom: 10,
              marginBottom: 10,
            }}
          >
            <Checkbox
              indeterminate={
                checkboxGroupData.length !== 0 &&
                checkboxGroupData.length !== serviceListSource.length
              }
              checked={checkboxGroupData.length == serviceListSource.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setcheckboxGroupData(
                    serviceListSource.map((i) => i.service__id)
                  );
                } else {
                  setcheckboxGroupData([]);
                }
              }}
            >
              {context.all}
            </Checkbox>
          </div>
          <Checkbox.Group
            style={{ width: "100%" }}
            onChange={(e) => setcheckboxGroupData(e)}
            value={checkboxGroupData}
          >
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {serviceListSource.map((item) => {
                return (
                  <div
                    key={item.service__id}
                    style={{ padding: "0 10px 15px 0" }}
                  >
                    <Checkbox key={item.service__id} value={item.service__id}>
                      {item.service__app_name}
                    </Checkbox>
                  </div>
                );
              })}
            </div>
          </Checkbox.Group>
        </>
      </OmpMessageModal>

      {/* -- 邮件推送 -- */}
      <OmpMessageModal
        visibleHandle={[pushAnalysisModal, setPushAnalysisModal]}
        title={context.email + context.ln + context.push}
        context={context}
        loading={pushLoading}
        onFinish={() => pushEmail()}
      >
        <Form style={{ marginLeft: 40 }} form={pushForm}>
          <Form.Item
            name="email"
            label={context.receiver}
            rules={[
              {
                type: "email",
                message: context.input + context.ln + context.email,
              },
            ]}
          >
            <Input
              placeholder={context.example + context.ln + ": emailname@163.com"}
              style={{ width: 320 }}
            />
          </Form.Item>
          <p
            style={{
              marginTop: 20,
              fontSize: 13,
            }}
          >
            <ExclamationCircleOutlined style={{ paddingRight: 10 }} />
            {msgMap[locale].clickMsg}
            <a
              onClick={() =>
                history.push({ pathname: "/status-patrol/patrol-strategy" })
              }
              style={{ marginLeft: 4 }}
            >
              {context.here}
            </a>
          </p>
        </Form>
      </OmpMessageModal>
    </OmpContentWrapper>
  );
};

export default PatrolInspectionRecord;
