import {
  OmpContentWrapper,
  OmpTable,
  OmpSelect,
  OmpDatePicker,
  OmpDrawer,
} from "@/components";
import { Button, Select, message, Input } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit } from "@/utils/utils";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import getColumnsConfig from "./config/columns";
import { SearchOutlined } from "@ant-design/icons";
import moment from "moment";
import { useHistory, useLocation } from "react-router-dom";
import { locales } from "@/config/locales";

const SelfHealingRecord = ({ locale }) => {
  const history = useHistory();
  const location = useLocation();
  const initIp = location.state?.ip;
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  //选中的数据
  const [checkedList, setCheckedList] = useState([]);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [ipListSource, setIpListSource] = useState([]);
  const [selectValue, setSelectValue] = useState(initIp);
  const [instanceSelectValue, setInstanceSelectValue] = useState();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });
  // 筛选label
  const [labelControl, setLabelControl] = useState(
    initIp ? "ip" : "instance_name"
  );
  const [showIframe, setShowIframe] = useState({});
  const context = locales[locale].common;

  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    searchParams = {},
    ordering
  ) => {
    setLoading(true);
    fetchGet(apiRequest.faultSelfHealing.querySelfHealingList, {
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
        location.state = {};
        setLoading(false);
        fetchIPlist();
        //fetchNameList();
      });
  };

  const fetchIPlist = () => {
    setSearchLoading(true);
    fetchGet(apiRequest.machineManagement.ipList)
      .then((res) => {
        handleResponse(res, (res) => {
          setIpListSource(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setSearchLoading(false);
      });
  };

  const updateAlertRead = (ids = []) => {
    setLoading(true);
    fetchPost(apiRequest.faultSelfHealing.selfHeadlingIsRead, {
      body: {
        ids: ids,
        is_read: 1,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          message.success(context.succeeded);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setCheckedList([]);
        setLoading(false);
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ...pagination.searchParams },
          pagination.ordering
        );
      });
  };

  useEffect(() => {
    fetchData(pagination, { alert_host_ip: location.state?.ip });
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部批量已读/过滤 -- */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Button
          type="primary"
          disabled={checkedList.length == 0}
          onClick={() => {
            let ids = checkedList.map((item) => item.id);
            updateAlertRead(ids);
          }}
        >
          {context.batchRead}
        </Button>
        <div style={{ display: "flex" }}>
          <OmpDatePicker
            onChange={(e) => {
              if (!e) {
                fetchData(
                  {
                    current: 1,
                    pageSize: pagination.pageSize,
                  },
                  {
                    ...pagination.searchParams,
                    query_start_time: null,
                    query_end_time: null,
                  },
                  pagination.ordering
                );
              } else {
                let result = e.filter((item) => item);
                if (result.length == 2) {
                  fetchData(
                    {
                      current: 1,
                      pageSize: pagination.pageSize,
                    },
                    {
                      ...pagination.searchParams,
                      query_start_time: moment(e[0]).format(
                        "YYYY-MM-DD HH:mm:ss"
                      ),
                      query_end_time: moment(e[1]).format(
                        "YYYY-MM-DD HH:mm:ss"
                      ),
                    },
                    pagination.ordering
                  );
                }
              }
            }}
          />
          <div style={{ display: "flex", marginLeft: "10px" }}>
            <Input.Group compact style={{ display: "flex" }}>
              <Select
                value={labelControl}
                style={{ minWidth: 100 }}
                onChange={(e) => {
                  setLabelControl(e);
                  fetchData(
                    {
                      current: 1,
                      pageSize: pagination.pageSize,
                    },
                    {
                      ...pagination.searchParams,
                      host_ip: null,
                      instance_name: null,
                    },
                    pagination.ordering
                  );
                  setInstanceSelectValue();
                  setSelectValue();
                }}
              >
                <Select.Option value="ip">{context.ipAddress}</Select.Option>
                <Select.Option value="instance_name">
                  {context.serviceInstance}
                </Select.Option>
              </Select>
              {labelControl === "ip" && (
                <OmpSelect
                  placeholder={context.input + context.ln + context.ip}
                  searchLoading={searchLoading}
                  selectValue={selectValue}
                  listSource={ipListSource}
                  setSelectValue={setSelectValue}
                  fetchData={(value) => {
                    fetchData(
                      {
                        current: 1,
                        pageSize: pagination.pageSize,
                      },
                      { ...pagination.searchParams, host_ip: value },
                      pagination.ordering
                    );
                  }}
                  pagination={pagination}
                />
              )}
              {labelControl === "instance_name" && (
                <Input
                  placeholder={
                    context.input + context.ln + context.serviceInstance
                  }
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
                  onBlur={() => {
                    if (instanceSelectValue) {
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
            </Input.Group>

            <Button
              style={{ marginLeft: 10 }}
              onClick={() => {
                //   dispatch(refreshTime());
                fetchData(
                  {
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                  },
                  { ...pagination.searchParams },
                  pagination.ordering
                );
              }}
            >
              {context.refresh}
            </Button>
          </div>
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
          //scroll={{ x: 1400 }}
          onChange={(e, filters, sorter) => {
            let ordering = sorter.order
              ? `${sorter.order == "descend" ? "" : "-"}${sorter.columnKey}`
              : null;
            setTimeout(() => {
              fetchData(e, pagination.searchParams, ordering);
            }, 200);
          }}
          columns={getColumnsConfig(
            (params) => {
              // console.log(pagination.searchParams)
              fetchData(
                { current: 1, pageSize: pagination.pageSize },
                { ...pagination.searchParams, ...params },
                pagination.ordering
              );
            },
            setShowIframe,
            updateAlertRead,
            history,
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
                  justifyContent: "space-between",
                  lineHeight: 2.8,
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
          rowKey={(record) => record.id}
          checkedState={[checkedList, setCheckedList]}
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

export default SelfHealingRecord;
