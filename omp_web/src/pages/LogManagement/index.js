import {
  OmpContentWrapper,
  OmpTable,
  OmpSelect,
  OmpDrawer,
} from "@/components";
import { Button, message, Input, Select } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit } from "@/utils/utils";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import getColumnsConfig from "./config/columns";
import { SearchOutlined } from "@ant-design/icons";
import UpdateModal from "./modal";
import { locales } from "@/config/locales";

const LogManagement = ({ locale }) => {
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [ipListSource, setIpListSource] = useState([]);
  const [selectValue, setSelectValue] = useState("");
  const [instanceSelectValue, setInstanceSelectValue] = useState("");
  // 更新等级 modal
  const [updateMoadlVisible, setUpdateMoadlVisible] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [labelControl, setLabelControl] = useState("instance_name");
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    ordering: "",
    searchParams: {},
  });
  const [showIframe, setShowIframe] = useState({});
  // 定义row存数据
  const [row, setRow] = useState({});
  const context = locales[locale].common;

  // 列表查询
  const fetchData = (pageParams = { current: 1 }, searchParams, ordering) => {
    setLoading(true);
    fetchGet(apiRequest.Alert.logManagementList, {
      params: {
        page: pageParams.current,
        ordering: ordering ? ordering : null,
        ...searchParams,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setDataSource(res.data.data);
          setPagination({
            ...pagination,
            total: res.data.count,
            current: pageParams.current,
            ordering: ordering,
            searchParams: searchParams,
          });
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        fetchIPlist();
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

  const updateLogLevel = (data, row) => {
    setUpdateLoading(true);
    fetchPost(apiRequest.Alert.logManagementList, {
      body: {
        data: [
          {
            id: row.id,
            ...data,
          },
        ],
      },
    })
      .then((res) => {
        if (res && res.data) {
          if (res.data.code == 1) {
            message.warning(res.data.message);
          }
          if (res.data.code == 0) {
            message.success(context.edit + context.ln + context.succeeded);
            fetchData(
              { current: pagination.current },
              {
                ...pagination.searchParams,
                ip: selectValue,
                service_instance_name: instanceSelectValue,
              },
              pagination.ordering
            );
            setUpdateMoadlVisible(false);
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setUpdateLoading(false);
      });
  };

  useEffect(() => {
    fetchData({ current: pagination.current });
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部过滤 -- */}
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", marginLeft: "auto" }}>
          <Input.Group compact style={{ display: "flex" }}>
            <Select
              value={labelControl}
              defaultValue="ip"
              style={{ minWidth: 100 }}
              onChange={(e) => {
                setLabelControl(e);
                fetchData(
                  {
                    current: 1,
                  },
                  {
                    ...pagination.searchParams,
                    ip: null,
                    service_instance_name: null,
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
                  fetchData({ current: 1 }, { ip: value }, pagination.ordering);
                }}
              />
            )}
            {labelControl === "instance_name" && (
              <Input
                placeholder={context.input + context.ln + context.instance}
                style={{ width: 200 }}
                allowClear
                value={instanceSelectValue}
                onChange={(e) => {
                  setInstanceSelectValue(e.target.value);
                  if (!e.target.value) {
                    fetchData(
                      { current: 1 },
                      {
                        ...pagination.searchParams,
                        service_instance_name: null,
                      },
                      pagination.ordering
                    );
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value !== instanceSelectValue) {
                    fetchData(
                      { current: 1 },
                      {
                        ...pagination.searchParams,
                        service_instance_name: instanceSelectValue,
                      },
                      pagination.ordering
                    );
                  }
                }}
                onPressEnter={() => {
                  fetchData(
                    { current: 1 },
                    {
                      ...pagination.searchParams,
                      service_instance_name: instanceSelectValue,
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
              fetchData(
                { current: pagination.current },
                {
                  ...pagination.searchParams,
                  ip: selectValue,
                  service_instance_name: instanceSelectValue,
                },
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
          columns={getColumnsConfig(
            setRow,
            setShowIframe,
            setUpdateMoadlVisible,
            context
          )}
          dataSource={dataSource}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
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
          rowKey={(record) => record.id}
        />
      </div>

      {/* -- 监控面板 -- */}
      <OmpDrawer
        showIframe={showIframe}
        setShowIframe={setShowIframe}
        context={context}
      />

      {updateMoadlVisible && (
        <UpdateModal
          row={row}
          visibleHandle={[updateMoadlVisible, setUpdateMoadlVisible]}
          loading={updateLoading}
          setLoading={setUpdateLoading}
          updateLogLevel={updateLogLevel}
          context={context}
        />
      )}
    </OmpContentWrapper>
  );
};

export default LogManagement;
