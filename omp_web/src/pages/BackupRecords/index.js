import { OmpContentWrapper, OmpTable, OmpMessageModal } from "@/components";
import { Button, message } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit } from "@/utils/utils";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import getColumnsConfig from "./config/columns";
import { useLocation } from "react-router-dom";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    deleteLeft: "Are you sure to delete a total of",
    deleteRight: "records?",
  },
  "zh-CN": {
    deleteLeft: "确认删除共计",
    deleteRight: "条记录吗?",
  },
};

const BackupRecords = ({ locale }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  //选中的数据
  const [checkedList, setCheckedList] = useState([]);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });
  // 定义row存数据
  const [row, setRow] = useState({});
  // 删除文件
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteOneModal, setDeleteOneModal] = useState(false);
  const context = locales[locale].common;

  // 列表查询
  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    searchParams,
    ordering
  ) => {
    setLoading(true);
    fetchGet(apiRequest.dataBackup.queryBackupHistory, {
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
      });
  };

  // 删除
  const deleteBackup = (deleteType = null) => {
    setDeleteLoading(true);
    fetchPost(apiRequest.dataBackup.queryBackupHistory, {
      body: {
        ids: deleteType === "only" ? [row.id] : checkedList.map((e) => e.id),
      },
    })
      .then((res) => {
        if (res && res.data) {
          if (res.data.code == 1) {
            message.warning(res.data.message);
          }
          if (res.data.code == 0) {
            message.success(context.delete + context.ln + context.succeeded);
            setCheckedList([]);
            setDeleteModal(false);
            setDeleteOneModal(false);
            fetchData({
              current: pagination.current,
              pageSize: pagination.pageSize,
            });
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => setDeleteLoading(false));
  };

  useEffect(() => {
    fetchData({ current: pagination.current, pageSize: pagination.pageSize });
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部删除/刷新 -- */}
      <div style={{ display: "flex" }}>
        <Button
          style={{ marginRight: 15 }}
          disabled={checkedList.length == 0}
          type="primary"
          onClick={() => setDeleteModal(true)}
        >
          {context.delete}
        </Button>

        <div style={{ display: "flex", marginLeft: "auto" }}>
          <Button
            style={{ marginLeft: 10 }}
            onClick={() => {
              setCheckedList([]);
              fetchData({
                current: pagination.current,
                pageSize: pagination.pageSize,
              });
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
            let ordering = sorter.order
              ? `${sorter.order == "descend" ? "" : "-"}${sorter.columnKey}`
              : null;
            setTimeout(() => {
              fetchData(e, pagination.searchParams, ordering);
            }, 200);
          }}
          columns={getColumnsConfig(setRow, setDeleteOneModal, context)}
          notSelectable={(record) => ({
            // 执行中不能选中
            disabled: record.result === 2,
          })}
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

      {/* -- 删除记录多条 -- */}
      <OmpMessageModal
        visibleHandle={[deleteModal, setDeleteModal]}
        context={context}
        loading={deleteLoading}
        onFinish={() => deleteBackup()}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].deleteLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].deleteRight}
        </div>
      </OmpMessageModal>

      {/* -- 删除记录一条 -- */}
      <OmpMessageModal
        visibleHandle={[deleteOneModal, setDeleteOneModal]}
        context={context}
        loading={deleteLoading}
        onFinish={() => deleteBackup("only")}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].deleteLeft}
          <span style={{ fontWeight: 600, color: "red" }}>{" 1 "}</span>
          {msgMap[locale].deleteRight}
        </div>
      </OmpMessageModal>
    </OmpContentWrapper>
  );
};

export default BackupRecords;
