import { OmpContentWrapper, OmpTable, OmpDrawer } from "@/components";
import { Button, Input, Select } from "antd";
import { useState, useEffect } from "react";
import {
  handleResponse,
  _idxInit,
  refreshTime,
  renderDisc,
} from "@/utils/utils";
import { fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { useDispatch } from "react-redux";
import { SearchOutlined } from "@ant-design/icons";
import { useHistory } from "react-router-dom";

const ContainerService = () => {
  const history = useHistory();

  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  //table表格数据
  const [dataSource, setDataSource] = useState([]);

  // 过滤 select 数据
  const [ipSelectValue, setIpSelectValue] = useState("");
  const [instanceSelectValue, setInstanceSelectValue] = useState("");

  const [labelControl, setLabelControl] = useState("instance_name");

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });

  const [showIframe, setShowIframe] = useState({});

  // 定义row存数据
  const [row, setRow] = useState({});

  const columns = [
    {
      title: "实例名称",
      key: "instance_name",
      dataIndex: "instance_name",
      sorter: (a, b) => a.instance_name - b.instance_name,
      sortDirections: ["descend", "ascend"],
      align: "center",
      ellipsis: true,
      fixed: "left",
      width: 280,
    },
    {
      title: "主机IP",
      key: "node_ip",
      dataIndex: "node_ip",
      align: "center",
      width: 100,
    },
    {
      title: "主机名称",
      key: "node_name",
      dataIndex: "node_name",
      align: "center",
      width: 100,
    },
    {
      title: "Pod IP",
      key: "pod_ip",
      dataIndex: "pod_ip",
      align: "center",
      width: 100,
    },
    {
      title: "服务名称",
      key: "app_name",
      dataIndex: "app_name",
      align: "center",
      width: 160,
    },
    {
      title: "服务状态",
      key: "service_status",
      dataIndex: "service_status",
      align: "center",
      //ellipsis: true,
      width: 80,
      render: (text) => {
        if (text === "1") {
          return (
            <span>
              {renderDisc("normal", 7, -1)}
              正常
            </span>
          );
        } else if (text === "0") {
          return (
            <span>
              {renderDisc("critical", 7, -1)}
              异常
            </span>
          );
        } else {
          return (
            <span>
              {renderDisc("warning", 7, -1)}
              未知
            </span>
          );
        }
      },
    },
    {
      title: "操作",
      //width: 100,
      width: 80,
      key: "",
      dataIndex: "",
      align: "center",
      fixed: "right",
      render: (text, record) => {
        return (
          <div
            onClick={() => {
              setRow(record);
            }}
            style={{ display: "flex", justifyContent: "space-around" }}
          >
            <div style={{ margin: "auto" }}>
              {record.monitor_url ? (
                <a
                  onClick={() => {
                    setShowIframe({
                      isOpen: true,
                      src: record.monitor_url,
                      record: record,
                      isLog: false,
                    });
                  }}
                >
                  监控
                </a>
              ) : (
                <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>监控</span>
              )}

              {record.log_url ? (
                <a
                  style={{ marginLeft: 10 }}
                  onClick={() => {
                    setShowIframe({
                      isOpen: true,
                      src: record.log_url,
                      record: record,
                      isLog: true,
                    });
                  }}
                >
                  日志
                </a>
              ) : (
                <span style={{ color: "rgba(0, 0, 0, 0.25)", marginLeft: 10 }}>
                  日志
                </span>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  // 列表查询
  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    searchParams,
    ordering
  ) => {
    setLoading(true);
    fetchGet(apiRequest.appStore.queryContanerData, {
      params: {
        page: pageParams.current,
        size: pageParams.pageSize,
        ordering: ordering ? ordering : null,
        ...searchParams,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setDataSource(res.data.results);
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

  useEffect(() => {
    fetchData({ current: pagination.current, pageSize: pagination.pageSize });
  }, []);

  return (
    <OmpContentWrapper>
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", marginLeft: "auto" }}>
          <Input.Group compact style={{ display: "flex" }}>
            <Select
              value={labelControl}
              defaultValue="instance_name"
              style={{ width: 100 }}
              onChange={(e) => {
                setLabelControl(e);
                fetchData(
                  {
                    current: 1,
                    pageSize: pagination.pageSize,
                  },
                  {
                    ...pagination.searchParams,
                    pod_ip: null,
                    instance_name: null,
                  },
                  pagination.ordering
                );
                setInstanceSelectValue();
                setIpSelectValue();
              }}
            >
              <Select.Option value="instance_name">实例名称</Select.Option>
              <Select.Option value="pod_ip"> Pod IP </Select.Option>
            </Select>
            {labelControl === "instance_name" && (
              <Input
                placeholder="输入实例名称"
                style={{ width: 200 }}
                allowClear
                value={instanceSelectValue}
                onChange={(e) => {
                  setInstanceSelectValue(e.target.value);
                  if (!e.target.value) {
                    fetchData(
                      {
                        current: 1,
                        pageSize: pagination.pageSize,
                      },
                      {
                        ...pagination.searchParams,
                        instance_name: null,
                      },
                      pagination.ordering
                    );
                  }
                }}
                onPressEnter={() => {
                  fetchData(
                    {
                      current: 1,
                      pageSize: pagination.pageSize,
                    },
                    {
                      ...pagination.searchParams,
                      instance_name: instanceSelectValue,
                    },
                    pagination.ordering
                  );
                }}
                suffix={
                  !instanceSelectValue && (
                    <SearchOutlined style={{ color: "#b6b6b6" }} />
                  )
                }
              />
            )}
            {labelControl === "pod_ip" && (
              <Input
                placeholder="输入Pod IP"
                style={{ width: 200 }}
                allowClear
                value={ipSelectValue}
                onChange={(e) => {
                  setIpSelectValue(e.target.value);
                  if (!e.target.value) {
                    fetchData(
                      {
                        current: 1,
                        pageSize: pagination.pageSize,
                      },
                      {
                        ...pagination.searchParams,
                        pod_ip: null,
                      },
                      pagination.ordering
                    );
                  }
                }}
                onPressEnter={() => {
                  fetchData(
                    {
                      current: 1,
                      pageSize: pagination.pageSize,
                    },
                    {
                      ...pagination.searchParams,
                      pod_ip: ipSelectValue,
                    },
                    pagination.ordering
                  );
                }}
                suffix={
                  !ipSelectValue && (
                    <SearchOutlined style={{ color: "#b6b6b6" }} />
                  )
                }
              />
            )}
          </Input.Group>

          <Button
            style={{ marginLeft: 10 }}
            onClick={() => {
              dispatch(refreshTime());
              fetchData(
                { current: pagination.current, pageSize: pagination.pageSize },
                {
                  ...pagination.searchParams,
                  pod_ip: ipSelectValue,
                  instance_name: instanceSelectValue,
                },
                pagination.ordering
              );
            }}
          >
            刷新
          </Button>
        </div>
      </div>
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
          //scroll={{ x: 1900 }}
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
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: () => (
              <div
                style={{
                  display: "flex",
                  width: "200px",
                  //justifyContent: "space-between",
                  flexDirection: "row-reverse",
                  lineHeight: 2.8,
                }}
              >
                <p style={{ color: "rgb(152, 157, 171)" }}>
                  共计{" "}
                  <span style={{ color: "rgb(63, 64, 70)" }}>
                    {pagination.total}
                  </span>{" "}
                  条
                </p>
              </div>
            ),
            ...pagination,
          }}
          rowKey={(record) => record.id}
        />
      </div>
      <OmpDrawer showIframe={showIframe} setShowIframe={setShowIframe} />
    </OmpContentWrapper>
  );
};

export default ContainerService;
