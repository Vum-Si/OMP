import {
  OmpContentWrapper,
  OmpTable,
  OmpMessageModal,
  OmpSelect,
  OmpDatePicker
} from "@/components";
import { Button, Select, message, Menu, Dropdown, Modal, Input } from "antd";
import { useState, useEffect, useRef } from "react";
import { handleResponse, _idxInit, refreshTime } from "@/utils/utils";
import { fetchGet, fetchPost, fetchPatch } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
//import updata from "@/store_global/globalStore";
import { useDispatch } from "react-redux";
import getColumnsConfig from "./config/columns";

const AlarmLog = () => {
  //console.log(location.state, "location.state");

  const [loading, setLoading] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);

  //选中的数据
  const [checkedList, setCheckedList] = useState({});

  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [ipListSource, setIpListSource] = useState([]);

  const [selectValue, setSelectValue] = useState();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });

  // 筛选label
  const [labelControl, setLabelControl] = useState("ip");

  function fetchData(
    pageParams = { current: 1, pageSize: 10 },
    searchParams = {},
    ordering
  ) {
    setLoading(true);
    fetchGet( apiRequest.Alert.listAlert, {
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
        fetchIPlist();
        fetchNameList()
      });
  }

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

  const fetchNameList = ()=> {
    setSearchLoading(true);
    fetchGet(apiRequest.Alert.instanceNameList)
      .then((res) => {
        handleResponse(res, (res) => {
          //setIpListSource(res.data);
          console.log(res)
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setSearchLoading(false);
      });
  }

  const updateAlertRead = () => {
    setLoading(true);
    fetchPost( apiRequest.Alert.listAlert, {
      body: {
        ids:Object.keys(checkedList)
        .map((k) => checkedList[k])
        .flat(1)
        .map((item) => item.id),
        is_read:1
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          message.success("已读成功")
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setCheckedList({})
        setLoading(false);
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ...pagination.searchParams },
          pagination.ordering
        );
      });
  }

  useEffect(() => {
    fetchData(pagination);
  }, []);

    console.log(Object.keys(checkedList).length == 0)

  return (
    <OmpContentWrapper>
      <div style={{ display: "flex", justifyContent:"space-between" }}>
        <Button
          type="primary"
          disabled={Object.keys(checkedList)
            .map((k) => checkedList[k])
            .flat(1)
            .map((item) => item.id).length == 0}
          onClick={() => {
            updateAlertRead()
          }}
        >
          批量已读
        </Button>
        <div style={{display:"flex"}}>
        <OmpDatePicker/>
        <div style={{ display: "flex", marginLeft: "10px" }}>
          <Input.Group compact style={{ display: "flex"}}> 
            <Select
              value={labelControl}
              style={{ width: 100 }}
              onChange={(e) => setLabelControl(e)}
            >
              <Select.Option value="ip"> IP地址</Select.Option>
              <Select.Option value="instance_name">实例名称</Select.Option>
            </Select>
            {labelControl === "ip" && (
              <OmpSelect
                searchLoading={searchLoading}
                selectValue={selectValue}
                listSource={ipListSource}
                setSelectValue={setSelectValue}
                fetchData={(value)=>{
                  fetchData(
                    { current: pagination.current, pageSize: pagination.pageSize  },
                    { ...pagination.searchParams, ip: value },
                    pagination.ordering
                  );
                }}
                pagination={pagination}
              />
            )}
             {labelControl === "instance_name" && (
              <Input placeholder="输入实例名称" style={{ width: 200 }}/>
            )}
          </Input.Group>

          <Button
            style={{ marginLeft: 10 }}
            onClick={() => {
              //   dispatch(refreshTime());
              fetchData(
                { current: pagination.current, pageSize: pagination.pageSize },
                { ...pagination.searchParams },
                pagination.ordering
              );
            }}
          >
            刷新
          </Button>
        </div>

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
          columns={getColumnsConfig((params)=>{
            console.log(pagination.searchParams)
            fetchData(
              { current: pagination.current, pageSize: pagination.pageSize },
              { ...pagination.searchParams, ...params },
              pagination.ordering
            );
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
                  已选中{" "}
                  {
                    Object.keys(checkedList)
                      .map((k) => checkedList[k])
                      .flat(1).length
                  }{" "}
                  条
                </p>
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
          checkedState={[checkedList, setCheckedList]}
        />
      </div>
    </OmpContentWrapper>
  );
};

export default AlarmLog;
