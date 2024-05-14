import {
  OmpContentWrapper,
  OmpTable,
  OmpModal,
  OmpMessageModal,
} from "@/components";
import {
  Button,
  Input,
  Form,
  message,
  Menu,
  Dropdown,
  Select,
  Radio,
  Cascader,
  Tooltip,
  InputNumber,
  Switch,
  Table,
} from "antd";
import { useState, useEffect, useRef } from "react";
import { handleResponse, _idxInit } from "@/utils/utils";
import { fetchGet, fetchPost, fetchDelete } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import {
  SearchOutlined,
  DownOutlined,
  PlusSquareOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useHistory } from "react-router-dom";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    nameMsg: "The name of the rule, as an identifier and description",
    typeMsg:
      "The built-in indicators can be directly used, and custom PromSQL rules can also be added",
    selectMsg: "Select the indicators that need to be monitored",
    numMsg: "Numbers greater than or equal to 0",
    queryMsg: "Test query",
    serviceMsg: "association service",
    connMsg:
      "After associating the service, the alarm for this indicator will be classified under the service name, such as 'mysql'. If you need to associate it with a host, please fill in 'node'",
    titleMsg:
      "Support configuring labels in Prometheus, such as {{$labels. instance}}}",
    timeMsg:
      "During the duration, an alarm will be triggered after matching the rule",
    deleteMsg: "Are you sure to delete this indicator?",
    tLeft: "Are you sure to disable a total of",
    tRight: "indicators?",
    qLeft: "Are you sure to enable a total of",
    qRight: "indicators?",
  },
  "zh-CN": {
    nameMsg: "规则的名称，作为标识和描述",
    typeMsg: "内置指标能直接使用，也可以添加自定义PromSQL规则",
    selectMsg: "选择需要监控的指标",
    numMsg: "大于等于0的数字",
    queryMsg: "测试查询",
    serviceMsg: "关联服务",
    connMsg:
      "关联服务后，该指标的告警会归类于该服务名，如'mysql'，如需关联到主机，请填写'node'",
    titleMsg: "支持配置Prometheus中的标签，如 {{ $labels.instance }}",
    timeMsg: "在持续时长内，匹配规则后会触发告警",
    deleteMsg: "确认删除此指标吗?",
    tLeft: "确认停用共计",
    tRight: "个指标吗?",
    qLeft: "确认启用共计",
    qRight: "个指标吗?",
  },
};

const RuleIndicator = ({ locale }) => {
  const [loading, setLoading] = useState(false);
  const [modalForm] = Form.useForm();
  const [upDateForm] = Form.useForm();
  const history = useHistory();
  //选中的数据
  const [checkedList, setCheckedList] = useState([]);
  const [row, setRow] = useState({});
  // 测试展示数据
  const [testQueryResults, setTestQueryResults] = useState([]);
  // 测试弹框控制器
  const [testVisible, setTestVisible] = useState(false);
  // 批量停用弹框控制器
  const [stopVisible, setStopVisible] = useState(false);
  // 单独停用弹框控制器
  const [stopRowVisible, setStopRowVisible] = useState(false);
  // 批量启用弹框控制器
  const [startVisible, setStartVisible] = useState(false);
  // 单独启用弹框控制器
  const [startRowVisible, setStartRowVisible] = useState(false);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [selectValue, setSelectValue] = useState();
  // 添加规则控制器
  const [addMoadlVisible, setAddMoadlVisible] = useState(false);
  // 修改规则控制器
  const [upDateVisible, setUpDateVisible] = useState(false);
  // 删除规则控制器
  const [deleteMoadlVisible, setDeleteMoadlVisible] = useState(false);
  // 规则类型
  const [ruleType, setRuleType] = useState("0");
  // 持续时长单位
  const [forTimeCompany, setForTimeCompany] = useState("s");
  // 选择内置规则联级数据
  const [cascaderOption, setCascaderOption] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });
  const context = locales[locale].common;

  const columns = [
    {
      title: context.rule + context.ln + context.name,
      key: "alert",
      dataIndex: "alert",
      align: "center",
      width: 250,
      fixed: "left",
      ellipsis: true,
    },
    {
      title: context.compare,
      key: "compare_str",
      width: 120,
      dataIndex: "compare_str",
      align: "center",
    },
    {
      title: context.threshold,
      key: "threshold_value",
      dataIndex: "threshold_value",
      width: 120,
      align: "center",
    },
    {
      title: context.durationS,
      key: "for_time",
      dataIndex: "for_time",
      width: 120,
      align: "center",
    },
    {
      title: context.severity,
      key: "severity",
      dataIndex: "severity",
      align: "center",
      width: 120,
      render: (text) => {
        const map = {
          warning: "warning",
          critical: "critical",
        };
        return map[text];
      },
    },
    {
      title: context.open,
      key: "status",
      dataIndex: "status",
      align: "center",
      width: 120,
      render: (text) => {
        const map = [context.disabled, context.enabled];
        return map[text];
      },
    },
    {
      title: context.type,
      key: "quota_type",
      dataIndex: "quota_type",
      align: "center",
      width: 120,
      render: (text) => {
        const map = [context.builtIn, context.custom + " promsql"];
        return map[text];
      },
    },
    {
      title: context.action,
      width: 150,
      key: "",
      dataIndex: "",
      align: "center",
      fixed: "right",
      render: function renderFunc(text, record, index) {
        return (
          <div
            style={{ display: "flex", justifyContent: "space-around" }}
            onClick={() => setRow(record)}
          >
            <div style={{ margin: "auto" }}>
              <a
                onClick={() => {
                  // // 持续时长单位
                  // setForTimeCompany("s");
                  queryBuiltinsQuota();
                  setUpDateVisible(true);
                  setForTimeCompany(
                    record.for_time[record.for_time.length - 1]
                  );

                  if (record.quota_type == 0) {
                    setRuleType("0");
                    upDateForm.setFieldsValue({
                      quota_type: "0",
                      alert: record.alert,
                      builtins_quota: [record.service, record.name],
                      compare_str: record.compare_str,
                      threshold_value: record.threshold_value,
                      for_time: record.for_time.substring(
                        0,
                        record.for_time.length - 1
                      ),
                      severity: record.severity,
                      status: record.status,
                    });
                  } else if (record.quota_type == 1) {
                    setRuleType("1");
                    upDateForm.setFieldsValue({
                      quota_type: "1",
                      alert: record.alert,
                      expr: record.expr,
                      compare_str: record.compare_str,
                      threshold_value: record.threshold_value,
                      for_time: record.for_time.substring(
                        0,
                        record.for_time.length - 1
                      ),
                      service: record.service,
                      severity: record.severity,
                      status: record.status,
                      summary: record.summary,
                      description: record.description,
                    });
                  }
                }}
              >
                {context.edit}
              </a>
              <a
                style={{
                  marginLeft: 10,
                }}
                onClick={() => {
                  if (record.status == 1) {
                    setStopRowVisible(true);
                  } else {
                    setStartRowVisible(true);
                  }
                }}
              >
                {record.status == 1 ? context.disable : context.enable}
              </a>
              <a
                style={{
                  marginLeft: 10,
                  color:
                    record.forbidden && record.forbidden == 1
                      ? null
                      : "rgba(0, 0, 0, 0.25)",
                  cursor:
                    record.forbidden && record.forbidden == 1
                      ? "pointer"
                      : "not-allowed",
                }}
                onClick={() => {
                  if (record.forbidden && record.forbidden == 1) {
                    setDeleteMoadlVisible(true);
                  }
                }}
              >
                {context.delete}
              </a>
            </div>
          </div>
        );
      },
    },
  ];

  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    searchParams,
    ordering
  ) => {
    setLoading(true);
    fetchGet(apiRequest.ruleCenter.queryPromemonitor, {
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
            res.data.results.map((item, idx) => {
              return {
                ...item,
                _idx: idx + 1 + (pageParams.current - 1) * pageParams.pageSize,
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

  const dictionaries = useRef(null);

  // 请求内置规则的选择指标联级配置
  const queryBuiltinsQuota = () => {
    fetchGet(apiRequest.ruleCenter.queryBuiltinsQuota)
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.data) {
            dictionaries.current = res.data;
            let data = res.data;
            setCascaderOption(() => {
              return Object.keys(data).map((key) => {
                let children = data[key].map((item) => {
                  return {
                    label: item.name,
                    value: item.name,
                    disabled: item.name == "数据分区使用率" ? true : false,
                    // JSON.stringify({
                    //   description: item.description,
                    //   name: item.name,
                    //   expr: item.expr,
                    //   service: item.service,
                    // }),
                  };
                });
                return {
                  value: key,
                  label: key,
                  children,
                };
              });
            });
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  const addQuota = (data) => {
    let queryData = {};
    if (data.quota_type === "0") {
      let builtins_quota = data.builtins_quota;
      let result = dictionaries.current[builtins_quota[0]].filter(
        (f) => f.name == builtins_quota[1]
      )[0];

      queryData = {
        threshold_value: data.threshold_value,
        compare_str: data.compare_str,
        for_time: `${data.for_time}${forTimeCompany}`,
        severity: data.severity,
        alert: data.alert,
        status: data.status ? 1 : 0,
        quota_type: Number(data.quota_type),
        builtins_quota: {
          description: result.description,
          name: result.name,
          expr: result.expr,
          service: result.service,
        },
      };
    } else if (data.quota_type === "1") {
      queryData = {
        summary: data.summary,
        description: data.description,
        expr: data.expr,
        service: data.service,
        threshold_value: data.threshold_value,
        compare_str: data.compare_str,
        for_time: `${data.for_time}${forTimeCompany}`,
        severity: data.severity,
        alert: data.alert,
        status: data.status ? 1 : 0,
        quota_type: Number(data.quota_type),
      };
    }

    setLoading(true);
    fetchPost(apiRequest.ruleCenter.addQuota, {
      body: {
        env_id: 1,
        ...queryData,
      },
    })
      .then((res) => {
        //console.log(operateObj[operateAciton])
        handleResponse(res, (res) => {
          message.success(context.add + context.ln + context.succeeded);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setAddMoadlVisible(false);
        fetchData(
          {
            current: 1,
            pageSize: pagination.pageSize,
          },
          {
            ...pagination.searchParams,
          }
        );
      });
  };

  // 测试promsql规则
  const fetchTestData = (str) => {
    setLoading(true);
    fetchPost(apiRequest.ruleCenter.testPromSql, {
      body: {
        expr: str,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setTestQueryResults(
            res.data.map((e) => {
              let name = e.metric.__name__;
              delete e.metric.__name__;
              let str = JSON.stringify(e.metric).replace(/:/, "=");
              return {
                metric: `${name}${str}`,
                value: e.value[1],
              };
            })
          );
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 修改
  const uploadQuota = (data) => {
    let queryData = {};
    if (data.quota_type === "0") {
      let builtins_quota = data.builtins_quota;
      let result = dictionaries.current[builtins_quota[0]].filter(
        (f) => f.name == builtins_quota[1]
      )[0];

      if (row.name == "数据分区使用率") {
        result.expr = row.expr;
      }

      queryData = {
        threshold_value: data.threshold_value,
        compare_str: data.compare_str,
        for_time: `${data.for_time}${forTimeCompany}`,
        severity: data.severity,
        alert: data.alert,
        // status: data.status ? 1 : 0,
        status: row.status,
        quota_type: Number(data.quota_type),
        builtins_quota: {
          description: result?.description,
          name: result?.name,
          expr: result?.expr,
          service: result?.service,
        },
      };
    } else if (data.quota_type === "1") {
      queryData = {
        summary: data.summary,
        description: data.description,
        expr: data.expr,
        service: data.service,
        threshold_value: data.threshold_value,
        compare_str: data.compare_str,
        for_time: `${data.for_time}${forTimeCompany}`,
        severity: data.severity,
        alert: data.alert,
        status: data.status ? 1 : 0,
        quota_type: Number(data.quota_type),
      };
    }

    setLoading(true);
    fetchPost(apiRequest.ruleCenter.addQuota, {
      body: {
        env_id: 1,
        ...queryData,
        id: row.id,
      },
    })
      .then((res) => {
        //console.log(operateObj[operateAciton])
        handleResponse(res, (res) => {
          message.success(context.edit + context.ln + context.succeeded);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setUpDateVisible(false);
        fetchData(
          {
            current: 1,
            pageSize: pagination.pageSize,
          },
          {
            ...pagination.searchParams,
          }
        );
      });
  };

  // 删除接口
  const deleteQuota = (data) => {
    setLoading(true);
    fetchDelete(apiRequest.ruleCenter.deleteQuota, {
      params: {
        id: data.id,
      },
    })
      .then((res) => {
        //console.log(operateObj[operateAciton])
        handleResponse(res, (res) => {
          message.success(context.delete + context.ln + context.succeeded);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setDeleteMoadlVisible(false);
        fetchData(
          {
            current: 1,
            pageSize: pagination.pageSize,
          },
          {
            ...pagination.searchParams,
          }
        );
      });
  };

  // 停用或者启用操作
  const statusUpdate = (ids, status) => {
    setLoading(true);
    fetchPost(apiRequest.ruleCenter.batchUpdateRule, {
      body: {
        ids,
        status,
      },
    })
      .then((res) => {
        //console.log(operateObj[operateAciton])
        handleResponse(res, (res) => {
          if (status == 1) {
            message.success(context.indicator + context.ln + context.enabled);
          } else {
            message.success(context.indicator + context.ln + context.disabled);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        // 批量停用弹框控制器
        setStopVisible(false);
        // 单独停用弹框控制器
        setStopRowVisible(false);

        // 批量启用弹框控制器
        setStartVisible(false);
        // 单独启用弹框控制器
        setStartRowVisible(false);
        fetchData(
          {
            current: 1,
            pageSize: pagination.pageSize,
          },
          {
            ...pagination.searchParams,
          }
        );
      });
  };

  useEffect(() => {
    fetchData(pagination);
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部添加/更多/过滤 -- */}
      <div style={{ display: "flex" }}>
        <Button
          type="primary"
          onClick={() => {
            setRuleType("0");
            // 持续时长单位
            setForTimeCompany("s");
            queryBuiltinsQuota();
            setAddMoadlVisible(true);
          }}
        >
          {context.add}
        </Button>
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item
                key="openMaintain"
                style={{ textAlign: "center" }}
                onClick={() => setStartVisible(true)}
                disabled={checkedList.map((item) => item.id).length == 0}
              >
                {context.enable + context.ln + context.rule}
              </Menu.Item>
              <Menu.Item
                key="closeMaintain"
                style={{ textAlign: "center" }}
                disabled={checkedList.length == 0}
                onClick={() => setStopVisible(true)}
              >
                {context.disable + context.ln + context.rule}
              </Menu.Item>
            </Menu>
          }
          placement="bottomCenter"
        >
          <Button style={{ marginLeft: 10, paddingRight: 10, paddingLeft: 15 }}>
            {context.more}
            <DownOutlined />
          </Button>
        </Dropdown>
        <div style={{ display: "flex", marginLeft: "auto" }}>
          <span
            style={{ marginRight: 5, display: "flex", alignItems: "center" }}
          >
            {context.rule + context.ln + context.name + " : "}
          </span>
          <Input
            placeholder={
              context.input +
              context.ln +
              context.rule +
              context.ln +
              context.name
            }
            style={{ width: 200 }}
            allowClear
            value={selectValue}
            onChange={(e) => {
              setSelectValue(e.target.value);
              if (!e.target.value) {
                fetchData(
                  {
                    current: 1,
                    pageSize: pagination.pageSize,
                  },
                  {
                    ...pagination.searchParams,
                    alert: null,
                  }
                );
              }
            }}
            onBlur={() => {
              fetchData(
                {
                  current: 1,
                  pageSize: pagination.pageSize,
                },
                {
                  ...pagination.searchParams,
                  alert: selectValue,
                }
              );
            }}
            onPressEnter={() => {
              fetchData(
                {
                  current: 1,
                  pageSize: pagination.pageSize,
                },
                {
                  ...pagination.searchParams,
                  alert: selectValue,
                },
                pagination.ordering
              );
            }}
            suffix={
              !selectValue && (
                <SearchOutlined style={{ fontSize: 12, color: "#b6b6b6" }} />
              )
            }
          />
          <Button
            style={{ marginLeft: 10 }}
            onClick={() => {
              fetchData(
                { current: pagination.current, pageSize: pagination.pageSize },
                { search: selectValue },
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
          noScroll={true}
          loading={loading}
          onChange={(e, filters, sorter) => {
            let ordering = sorter.order
              ? `${sorter.order == "descend" ? "" : "-"}${sorter.columnKey}`
              : null;
            setTimeout(() => {
              fetchData(e, pagination.searchParams, ordering);
            }, 200);
          }}
          columns={columns}
          dataSource={dataSource}
          rowKey={(record) => record.id}
          checkedState={[checkedList, setCheckedList]}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: () => (
              <div
                style={{
                  display: "flex",
                  width: "200px",
                  lineHeight: 2.8,
                  justifyContent: "space-between",
                }}
              >
                <p>
                  {context.selected} {checkedList.length} {context.tiao}
                </p>
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

      {/* -- 添加规则 -- */}
      <OmpModal
        loading={loading}
        formLabelCol={{ span: 5 }}
        formWrapperCol={{ span: 18 }}
        width={800}
        setLoading={setLoading}
        visibleHandle={[addMoadlVisible, setAddMoadlVisible]}
        title={
          <span>
            <span style={{ position: "relative", left: "-10px" }}>
              <PlusSquareOutlined />
            </span>
            <span>{context.add + context.ln + context.rule}</span>
          </span>
        }
        form={modalForm}
        onFinish={(data) => addQuota(data)}
        context={context}
        initialValues={{
          compare_str: ">=",
          threshold_value: 30,
          quota_type: "0",
          for_time: 60,
          severity: "warning",
          status: true,
        }}
      >
        <div
          style={{
            transition: "all .2s ease-in",
            position: "relative",
            left: -10,
          }}
        >
          <Form.Item
            label={context.rule + context.ln + context.name}
            name="alert"
            key="alert"
            rules={[
              {
                required: true,
                message: context.input + context.ln + context.name,
              },
            ]}
          >
            <Form.Item noStyle name="alert">
              <Input
                style={{ width: 520 }}
                placeholder={context.input + context.ln + context.name}
              />
            </Form.Item>
            <span
              name="tishi"
              style={{
                paddingLeft: 20,
                position: "relative",
                top: 1,
              }}
            >
              {" "}
              <Tooltip title={msgMap[locale].nameMsg}>
                <QuestionCircleOutlined />
              </Tooltip>
            </span>
          </Form.Item>

          <Form.Item
            label={context.type}
            name="quota_type"
            key="quota_type"
            rules={[
              {
                required: true,
                message: context.select + context.ln + context.type,
              },
            ]}
          >
            <Form.Item noStyle name="quota_type">
              <Radio.Group
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
              >
                <Radio.Button value="0">{context.builtIn}</Radio.Button>
                <Radio.Button value="1">
                  {context.custom + " PromSQL"}
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
            <span
              name="tishi"
              style={{
                paddingLeft: 20,
                position: "relative",
                top: 1,
              }}
            >
              {" "}
              <Tooltip title={msgMap[locale].typeMsg}>
                <QuestionCircleOutlined />
              </Tooltip>
            </span>
          </Form.Item>

          {ruleType === "0" && (
            <>
              <Form.Item
                label={context.indicator}
                name="builtins_quota"
                key="builtins_quota"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.indicator,
                  },
                ]}
              >
                <Form.Item noStyle name="builtins_quota">
                  <Cascader
                    style={{ width: 520 }}
                    options={cascaderOption}
                    placeholder={
                      context.select + context.ln + context.indicator
                    }
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].selectMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.compare}
                name="compare_str"
                key="compare_str"
                rules={[
                  {
                    required: true,
                    message: context.selelct + context.ln + context.compare,
                  },
                ]}
              >
                <Select
                  placeholder={context.selelct + context.ln + context.compare}
                  style={{ width: 520 }}
                >
                  <Select.Option value=">=">{`${">="}`}</Select.Option>
                  <Select.Option value=">">{`${">"}`}</Select.Option>
                  <Select.Option value="==">{`${"=="}`}</Select.Option>
                  <Select.Option value="!=">{`${"!="}`}</Select.Option>
                  <Select.Option value="<=">{`${"<="}`}</Select.Option>
                  <Select.Option value="<">{`${"<"}`}</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={context.threshold}
                name="threshold_value"
                key="threshold_value"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.threshold,
                  },
                ]}
              >
                <Form.Item noStyle name="threshold_value">
                  <InputNumber style={{ width: 520 }} min={0} />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].numMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.durationS}
                name="for_time"
                key="for_time"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.durationS,
                  },
                  {
                    validator: (rule, value, callback) => {
                      if (value == 0) {
                        return Promise.reject(`只支持大于0的数字`);
                      } else {
                        return Promise.resolve("success");
                      }
                    },
                  },
                ]}
              >
                <Form.Item noStyle name="for_time">
                  <InputNumber
                    style={{ width: 520 }}
                    addonAfter={
                      <Select
                        style={{ width: 80 }}
                        value={forTimeCompany}
                        onChange={(e) => setForTimeCompany(e)}
                      >
                        <Select.Option value="s">s</Select.Option>
                        <Select.Option value="m">min</Select.Option>
                        <Select.Option value="h">h</Select.Option>
                      </Select>
                    }
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 5,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].timeMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.severity}
                name="severity"
                key="severity"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.severity,
                  },
                ]}
              >
                <Radio.Group>
                  <Radio value="warning">warning</Radio>
                  <Radio value="critical">critical</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                label={context.open}
                name="status"
                key="status"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </>
          )}

          {ruleType === "1" && (
            <>
              <Form.Item
                label="PromSQL"
                name="expr"
                key="expr"
                rules={[
                  {
                    required: true,
                    message: context.input + " PromSQL",
                  },
                ]}
              >
                <Form.Item noStyle name="expr">
                  <Input
                    style={{ width: 400 }}
                    placeholder={context.input + " PromSQL"}
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                  }}
                >
                  {" "}
                  <Button
                    type="primary"
                    onClick={() => {
                      fetchTestData(modalForm.getFieldValue("expr"));
                      setTestVisible(true);
                    }}
                  >
                    {msgMap[locale].queryMsg}
                  </Button>
                </span>
              </Form.Item>

              <Form.Item
                label={context.compare}
                name="compare_str"
                key="compare_str"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.compare,
                  },
                ]}
              >
                <Select
                  placeholder={context.select + context.ln + context.compare}
                  style={{ width: 520 }}
                >
                  <Select.Option value=">=">{`${">="}`}</Select.Option>
                  <Select.Option value=">">{`${">"}`}</Select.Option>
                  <Select.Option value="==">{`${"=="}`}</Select.Option>
                  <Select.Option value="!=">{`${"!="}`}</Select.Option>
                  <Select.Option value="<=">{`${"<="}`}</Select.Option>
                  <Select.Option value="<">{`${"<"}`}</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={context.threshold}
                name="threshold_value"
                key="threshold_value"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.threshold,
                  },
                ]}
              >
                <Form.Item noStyle name="threshold_value">
                  <InputNumber style={{ width: 520 }} min={0} />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].numMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.durationS}
                name="for_time"
                key="for_time"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.durationS,
                  },
                  {
                    validator: (rule, value, callback) => {
                      if (value == 0) {
                        return Promise.reject(`只支持大于0的数字`);
                      } else {
                        return Promise.resolve("success");
                      }
                    },
                  },
                ]}
              >
                <Form.Item noStyle name="for_time">
                  <InputNumber
                    style={{ width: 520 }}
                    addonAfter={
                      <Select
                        style={{ width: 80 }}
                        value={forTimeCompany}
                        onChange={(e) => setForTimeCompany(e)}
                      >
                        <Select.Option value="s">s</Select.Option>
                        <Select.Option value="m">min</Select.Option>
                        <Select.Option value="h">h</Select.Option>
                      </Select>
                    }
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 5,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].timeMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={msgMap[locale].serviceMsg}
                name="service"
                key="service"
                rules={[
                  {
                    required: true,
                    message:
                      context.input + context.ln + msgMap[locale].serviceMsg,
                  },
                ]}
              >
                <Form.Item noStyle name="service">
                  <Input
                    style={{ width: 520 }}
                    placeholder={
                      context.input + context.ln + msgMap[locale].serviceMsg
                    }
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].connMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.severity}
                name="severity"
                key="severity"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.severity,
                  },
                ]}
              >
                <Radio.Group>
                  <Radio value="warning">warning</Radio>
                  <Radio value="critical">critical</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                label={context.open}
                name="status"
                key="status"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label={context.alarm + context.ln + context.title}
                name="summary"
                key="summary"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.title,
                  },
                ]}
              >
                <Form.Item noStyle name="summary">
                  <Input
                    style={{ width: 520 }}
                    placeholder={context.input + context.ln + context.title}
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].titleMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.alarm + context.ln + context.content}
                name="description"
                key="description"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.content,
                  },
                ]}
              >
                <Form.Item noStyle name="description">
                  <Input.TextArea
                    rows={4}
                    style={{ width: 520 }}
                    placeholder={context.input + context.ln + context.content}
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: -70,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].titleMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>
            </>
          )}
        </div>
      </OmpModal>

      {/* -- 删除指标 -- */}
      <OmpMessageModal
        visibleHandle={[deleteMoadlVisible, setDeleteMoadlVisible]}
        context={context}
        loading={loading}
        onFinish={() => deleteQuota(row)}
      >
        <div style={{ padding: "20px" }}>{msgMap[locale].deleteMsg}</div>
      </OmpMessageModal>

      <OmpMessageModal
        width={900}
        visibleHandle={[testVisible, setTestVisible]}
        noFooter
        style={{ position: "relative", top: 180 }}
        title={<span>PromSQL查询结果</span>}
        loading={loading}
      >
        <div style={{ border: "1px solid #d6d6d6" }}>
          <Table
            showHeader={false}
            scroll={{ x: 1200 }}
            columns={[
              {
                title: "内存使用率",
                key: "metric",
                dataIndex: "metric",
                align: "center",
              },
              {
                title: "内存使用率12",
                key: "value",
                dataIndex: "value",
                align: "center",
                width: 120,
                fixed: "right",
              },
            ]}
            dataSource={testQueryResults.map((i, idx) => ({ ...i, key: idx }))}
          />
        </div>
      </OmpMessageModal>

      {/* -- 编辑指标 -- */}
      <OmpModal
        loading={loading}
        width={800}
        formLabelCol={{ span: 5 }}
        formWrapperCol={{ span: 18 }}
        setLoading={setLoading}
        visibleHandle={[upDateVisible, setUpDateVisible]}
        title={
          <span>
            <span style={{ position: "relative", left: "-10px" }}>
              <PlusSquareOutlined />
            </span>
            <span>{context.edit + context.ln + context.rule}</span>
          </span>
        }
        form={upDateForm}
        onFinish={(data) => uploadQuota(data)}
        context={context}
        initialValues={{
          compare_str: ">=",
          threshold_value: 30,
          quota_type: "0",
          for_time: 60,
          severity: "warning",
          status: true,
        }}
      >
        <div
          style={{
            transition: "all .2s ease-in",
            position: "relative",
            left: -10,
          }}
        >
          <Form.Item
            label={context.rule + context.ln + context.name}
            name="alert"
            key="alert"
            rules={[
              {
                required: true,
                message: context.input + context.ln + context.name,
              },
            ]}
          >
            <Form.Item noStyle name="alert">
              <Input
                disabled={row.forbidden == 2}
                style={{ width: 520 }}
                placeholder={context.input + context.ln + context.name}
              />
            </Form.Item>
            <span
              name="tishi"
              style={{
                paddingLeft: 20,
                position: "relative",
                top: 1,
              }}
            >
              {" "}
              <Tooltip title={msgMap[locale].nameMsg}>
                <QuestionCircleOutlined onClick={() => console.log(row)} />
              </Tooltip>
            </span>
          </Form.Item>

          <Form.Item
            label={context.type}
            name="quota_type"
            key="quota_type"
            rules={[
              {
                required: true,
                message: context.select + context.ln + context.type,
              },
            ]}
          >
            <Form.Item noStyle name="quota_type">
              <Radio.Group
                disabled={true}
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
              >
                <Radio.Button value="0">{context.builtIn}</Radio.Button>
                <Radio.Button value="1">
                  {context.custom + " PromSQL"}
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
            <span
              name="tishi"
              style={{
                paddingLeft: 20,
                position: "relative",
                top: 1,
              }}
            >
              {" "}
              <Tooltip title={msgMap[locale].typeMsg}>
                <QuestionCircleOutlined />
              </Tooltip>
            </span>
          </Form.Item>

          {ruleType === "0" && (
            <>
              <Form.Item
                label={context.indicator}
                name="builtins_quota"
                key="builtins_quota"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.indicator,
                  },
                ]}
              >
                <Form.Item noStyle name="builtins_quota">
                  <Cascader
                    disabled={true}
                    style={{ width: 520 }}
                    options={cascaderOption}
                    placeholder={
                      context.select + context.ln + context.indicator
                    }
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].selectMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.compare}
                name="compare_str"
                key="compare_str"
                rules={[
                  {
                    required: true,
                    message: context.selelct + context.ln + context.compare,
                  },
                ]}
              >
                <Select
                  placeholder={context.selelct + context.ln + context.compare}
                  style={{ width: 520 }}
                >
                  <Select.Option value=">=">{`${">="}`}</Select.Option>
                  <Select.Option value=">">{`${">"}`}</Select.Option>
                  <Select.Option value="==">{`${"=="}`}</Select.Option>
                  <Select.Option value="!=">{`${"!="}`}</Select.Option>
                  <Select.Option value="<=">{`${"<="}`}</Select.Option>
                  <Select.Option value="<">{`${"<"}`}</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={context.threshold}
                name="threshold_value"
                key="threshold_value"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.threshold,
                  },
                ]}
              >
                <Form.Item noStyle name="threshold_value">
                  <InputNumber style={{ width: 520 }} min={0} />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].numMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.durationS}
                name="for_time"
                key="for_time"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.durationS,
                  },
                  {
                    validator: (rule, value, callback) => {
                      if (value == 0) {
                        return Promise.reject(`只支持大于0的数字`);
                      } else {
                        return Promise.resolve("success");
                      }
                    },
                  },
                ]}
              >
                <Form.Item noStyle name="for_time">
                  <InputNumber
                    style={{ width: 520 }}
                    addonAfter={
                      <Select
                        style={{ width: 80 }}
                        value={forTimeCompany}
                        onChange={(e) => setForTimeCompany(e)}
                      >
                        <Select.Option value="s">s</Select.Option>
                        <Select.Option value="m">min</Select.Option>
                        <Select.Option value="h">h</Select.Option>
                      </Select>
                    }
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 5,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].timeMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.severity}
                name="severity"
                key="severity"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.severity,
                  },
                ]}
              >
                <Radio.Group>
                  <Radio value="warning">warning</Radio>
                  <Radio value="critical">critical</Radio>
                </Radio.Group>
              </Form.Item>
            </>
          )}

          {ruleType === "1" && (
            <>
              <Form.Item
                label="PromSQL"
                name="expr"
                key="expr"
                rules={[
                  {
                    required: true,
                    message: context.input + " PromSQL",
                  },
                ]}
              >
                <Form.Item noStyle name="expr">
                  <Input
                    style={{ width: 400 }}
                    placeholder={context.input + " PromSQL"}
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                  }}
                >
                  {" "}
                  <Button
                    type="primary"
                    onClick={() => {
                      fetchTestData(upDateForm.getFieldValue("expr"));
                      setTestVisible(true);
                    }}
                  >
                    {msgMap[locale].queryMsg}
                  </Button>
                </span>
              </Form.Item>

              <Form.Item
                label={context.compare}
                name="compare_str"
                key="compare_str"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.compare,
                  },
                ]}
              >
                <Select
                  placeholder={context.select + context.ln + context.compare}
                  style={{ width: 520 }}
                >
                  <Select.Option value=">=">{`${">="}`}</Select.Option>
                  <Select.Option value=">">{`${">"}`}</Select.Option>
                  <Select.Option value="==">{`${"=="}`}</Select.Option>
                  <Select.Option value="!=">{`${"!="}`}</Select.Option>
                  <Select.Option value="<=">{`${"<="}`}</Select.Option>
                  <Select.Option value="<">{`${"<"}`}</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={context.threshold}
                name="threshold_value"
                key="threshold_value"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.threshold,
                  },
                ]}
              >
                <Form.Item noStyle name="threshold_value">
                  <InputNumber style={{ width: 520 }} min={0} />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].numMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.durationS}
                name="for_time"
                key="for_time"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.durationS,
                  },
                  {
                    validator: (rule, value, callback) => {
                      if (value == 0) {
                        return Promise.reject(`只支持大于0的数字`);
                      } else {
                        return Promise.resolve("success");
                      }
                    },
                  },
                ]}
              >
                <Form.Item noStyle name="for_time">
                  <InputNumber
                    style={{ width: 520 }}
                    addonAfter={
                      <Select
                        style={{ width: 80 }}
                        value={forTimeCompany}
                        onChange={(e) => setForTimeCompany(e)}
                      >
                        <Select.Option value="s">s</Select.Option>
                        <Select.Option value="m">min</Select.Option>
                        <Select.Option value="h">h</Select.Option>
                      </Select>
                    }
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 5,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].timeMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={msgMap[locale].serviceMsg}
                name="service"
                key="service"
                rules={[
                  {
                    required: true,
                    message:
                      context.input + context.ln + msgMap[locale].serviceMsg,
                  },
                ]}
              >
                <Form.Item noStyle name="service">
                  <Input
                    style={{ width: 520 }}
                    placeholder={
                      context.input + context.ln + msgMap[locale].serviceMsg
                    }
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].connMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.severity}
                name="severity"
                key="severity"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.severity,
                  },
                ]}
              >
                <Radio.Group>
                  <Radio value="warning">warning</Radio>
                  <Radio value="critical">critical</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                label={context.open}
                name="status"
                key="status"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label={context.alarm + context.ln + context.title}
                name="summary"
                key="summary"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.title,
                  },
                ]}
              >
                <Form.Item noStyle name="summary">
                  <Input
                    style={{ width: 520 }}
                    placeholder={context.input + context.ln + context.title}
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].titleMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>

              <Form.Item
                label={context.alarm + context.ln + context.content}
                name="description"
                key="description"
                rules={[
                  {
                    required: true,
                    message: context.input + context.ln + context.content,
                  },
                ]}
              >
                <Form.Item noStyle name="description">
                  <Input.TextArea
                    rows={4}
                    style={{ width: 520 }}
                    placeholder={context.input + context.ln + context.content}
                  />
                </Form.Item>
                <span
                  name="tishi"
                  style={{
                    paddingLeft: 20,
                    position: "relative",
                    top: -70,
                  }}
                >
                  {" "}
                  <Tooltip title={msgMap[locale].titleMsg}>
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              </Form.Item>
            </>
          )}
        </div>
      </OmpModal>

      {/* -- 批量停用操作 -- */}
      <OmpMessageModal
        visibleHandle={[stopVisible, setStopVisible]}
        context={context}
        loading={loading}
        onFinish={() => {
          statusUpdate(
            checkedList.map((i) => i.id),
            0
          );
          setCheckedList([]);
        }}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].tLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].tRight}
        </div>
      </OmpMessageModal>

      {/* -- 单独停用操作 --  */}
      <OmpMessageModal
        visibleHandle={[stopRowVisible, setStopRowVisible]}
        context={context}
        loading={loading}
        onFinish={() => statusUpdate([row.id], 0)}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].tLeft}
          <span style={{ fontWeight: 600, color: "red" }}>{" 1 "}</span>
          {msgMap[locale].tRight}
        </div>
      </OmpMessageModal>

      {/* -- 批量启用操作 -- */}
      <OmpMessageModal
        visibleHandle={[startVisible, setStartVisible]}
        context={context}
        loading={loading}
        onFinish={() => {
          statusUpdate(
            checkedList.map((i) => i.id),
            1
          );
          setCheckedList([]);
          // deleteQuota(row);
        }}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].qLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].qRight}
        </div>
      </OmpMessageModal>

      {/* -- 单独启用操作 -- */}
      <OmpMessageModal
        visibleHandle={[startRowVisible, setStartRowVisible]}
        context={context}
        loading={loading}
        onFinish={() => statusUpdate([row.id], 1)}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].qLeft}
          <span style={{ fontWeight: 600, color: "red" }}>{" 1 "}</span>
          {msgMap[locale].qRight}
        </div>
      </OmpMessageModal>
    </OmpContentWrapper>
  );
};

export default RuleIndicator;
