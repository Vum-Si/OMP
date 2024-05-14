import { OmpContentWrapper, OmpTable } from "@/components";
import { Button, Input } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit, nonEmptyProcessing } from "@/utils/utils";
import { fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { SearchOutlined } from "@ant-design/icons";
import { locales } from "@/config/locales";

const SystemLog = ({ locale }) => {
  const [loading, setLoading] = useState(false);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [userListSource, setUserListSource] = useState([]);
  const [selectValue, setSelectValue] = useState();
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
      title: context.row,
      width: 40,
      key: "_idx",
      dataIndex: "_idx",
      align: "center",
      render: nonEmptyProcessing,
      fixed: "left",
    },
    {
      title: context.username,
      key: "username",
      width: 100,
      dataIndex: "username",
      sorter: (a, b) => a.username - b.username,
      sortDirections: ["descend", "ascend"],
      align: "center",
      render: nonEmptyProcessing,
    },
    {
      title: context.ip,
      key: "request_ip",
      dataIndex: "request_ip",
      sorter: (a, b) => a.request_ip - b.request_ip,
      sortDirections: ["descend", "ascend"],
      align: "center",
      width: 100,
      render: nonEmptyProcessing,
    },
    {
      title: context.type,
      key: "request_method",
      width: 100,
      dataIndex: "request_method",
      align: "center",
      render: (text) => {
        switch (text) {
          case "查看":
          case "查询":
            return context.query;
          case "修改":
            return context.edit;
          case "新增":
          case "增加":
            return context.add;
          case "删除":
            return context.delete;
          default:
            return text;
        }
      },
    },
    {
      title: context.description,
      key: "description",
      width: 100,
      dataIndex: "description",
      align: "center",
      render: nonEmptyProcessing,
    },
    {
      title: context.created,
      key: "create_time",
      dataIndex: "create_time",
      align: "center",
      width: 100,
      sorter: (a, b) => a.create_time - b.create_time,
      sortDirections: ["descend", "ascend"],
      render: nonEmptyProcessing,
    },
  ];

  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    searchParams,
    ordering
  ) => {
    setLoading(true);
    fetchGet(apiRequest.operationRecord.querySystemLog, {
      params: {
        page: pageParams.current,
        size: pageParams.pageSize,
        ordering: ordering ? ordering : null,
        ...searchParams,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (!searchParams) {
            setUserListSource(res.data.results.map((item) => item.username));
          }
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

  useEffect(() => {
    fetchData(pagination);
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部过滤 -- */}
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", marginLeft: "auto" }}>
          <span
            style={{ marginRight: 5, display: "flex", alignItems: "center" }}
          >
            {context.username + " : "}
          </span>
          <Input
            placeholder={context.username + context.ln + context.username}
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
                    username: null,
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
                  username: selectValue,
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
                  username: selectValue,
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
                { username: selectValue },
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
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
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
    </OmpContentWrapper>
  );
};

export default SystemLog;
