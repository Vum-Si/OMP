import {
  OmpContentWrapper,
  OmpTable,
  OmpSelect,
  OmpDrawer,
} from "@/components";
import { Button, Select, Input } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit } from "@/utils/utils";
import { fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import getColumnsConfig from "./config/columns";
import { SearchOutlined } from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import { locales } from "@/config/locales";

const ExceptionList = ({ locale }) => {
  const history = useHistory();
  const location = useLocation();
  const initIp = location.state?.ip;
  const initInstanceName = location.state?.instance_name;
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [ipListSource, setIpListSource] = useState([]);
  const [selectValue, setSelectValue] = useState(initIp);
  const [instanceSelectValue, setInstanceSelectValue] =
    useState(initInstanceName);
  const [searchParams, setSearchParams] = useState({});
  // 筛选label
  const [labelControl, setLabelControl] = useState(
    initIp ? "ip" : "instance_name"
  );
  const [showIframe, setShowIframe] = useState({});
  const context = locales[locale].common;

  const fetchData = (searchParams = {}) => {
    setLoading(true);
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
        location.state = {};
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

  useEffect(() => {
    fetchData({
      ip: location.state?.ip,
      type: location.state?.type,
      instance_name: location.state?.instance_name,
    });
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部搜索 -- */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div />
        <div style={{ display: "flex" }}>
          <div style={{ display: "flex", marginLeft: "10px" }}>
            <Input.Group compact style={{ display: "flex" }}>
              <Select
                value={labelControl}
                style={{ minWidth: 100 }}
                onChange={(e) => {
                  setLabelControl(e);
                  fetchData({
                    ...searchParams,
                    ip: null,
                    instance_name: null,
                  });
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
                    fetchData({ ...searchParams, ip: value });
                  }}
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
                      fetchData({
                        ...searchParams,
                        instance_name: null,
                      });
                    }
                  }}
                  onBlur={() => {
                    if (instanceSelectValue) {
                      fetchData({
                        ...searchParams,
                        instance_name: instanceSelectValue,
                      });
                    }
                  }}
                  onPressEnter={() => {
                    fetchData({
                      ...searchParams,
                      instance_name: instanceSelectValue,
                    });
                  }}
                  suffix={
                    !instanceSelectValue && (
                      <SearchOutlined
                        style={{ fontSize: 12, color: "#b6b6b6" }}
                      />
                    )
                  }
                />
              )}
            </Input.Group>

            <Button
              style={{ marginLeft: 10 }}
              onClick={() => {
                fetchData({ ...searchParams });
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
          onChange={(e, filters, sorter) => {
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
            location.state?.type,
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
                    {dataSource?.length}
                  </span>
                  {context.tiao}
                </p>
              </div>
            ),
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

export default ExceptionList;
