import {
  OmpContentWrapper,
  OmpTable,
  OmpMessageModal,
  OmpSelect,
  OmpDrawer,
} from "@/components";
import { Button, message, Menu, Dropdown, Input, Select, Checkbox } from "antd";
import { useState, useEffect, useRef } from "react";
import { handleResponse, _idxInit, refreshTime } from "@/utils/utils";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { useDispatch } from "react-redux";
import getColumnsConfig, { DetailService, UrlInfo } from "./config/columns";
import {
  DownOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    exeLeft: "Are you sure to execute",
    exeMid: "for a total of",
    exeRight: "services?",
  },
  "zh-CN": {
    exeLeft: "确认下发",
    exeMid: "命令到总计",
    exeRight: "个服务吗?",
  },
};

const ServiceManagement = ({ locale }) => {
  const location = useLocation();
  const initIp = location.state?.ip;
  const history = useHistory();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  //选中的数据
  const [checkedList, setCheckedList] = useState([]);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [ipListSource, setIpListSource] = useState([]);
  const [selectValue, setSelectValue] = useState(initIp);
  const [labelsData, setLabelsData] = useState([]);
  const [instanceSelectValue, setInstanceSelectValue] = useState("");
  const [labelControl, setLabelControl] = useState(
    initIp ? "ip" : "instance_name"
  );
  const [installationRecordModal, setInstallationRecordModal] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });
  const [isShowDrawer, setIsShowDrawer] = useState({
    isOpen: false,
    src: "",
    record: {},
  });
  const [showIframe, setShowIframe] = useState({});
  // 定义row存数据
  const [row, setRow] = useState({});
  // 服务详情历史数据
  const [historyData, setHistoryData] = useState([]);
  // 服务详情loading
  const [historyLoading, setHistoryLoading] = useState([]);
  //const [showIframe, setShowIframe] = useState({});
  const [serviceAcitonModal, setServiceAcitonModal] = useState(false);
  const [currentSerAcitonModal, setCurrentSerAcitonModal] = useState(false);
  const [operateAciton, setOperateAciton] = useState(1);
  // 删除操作的提示语
  const [deleteMsg, setDeleteMsg] = useState("");
  // 删除操作的再次确认
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  // 确认删除的维度
  const [deleteDimension, setDeleteDimension] = useState(false);
  // 平台访问 url 入口
  const [isShowUrl, setIsShowUrl] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlData, setUrlData] = useState([]);
  const containerRef = useRef(null);
  const t = useRef(null);
  const timer = useRef(null);
  const [log, setLog] = useState("");
  const context = locales[locale].common;
  // 1启动，2停止，3重启，4删除
  let operateObj = {
    1: context.start,
    2: context.stop,
    3: context.restart,
    4: context.delete,
  };

  // 列表查询
  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    searchParams,
    ordering
  ) => {
    setLoading(true);
    fetchGet(apiRequest.appStore.services, {
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
        fetchSearchlist();
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

  // 功能模块筛选
  const fetchSearchlist = () => {
    fetchGet(apiRequest.appStore.queryLabels)
      .then((res) => {
        handleResponse(res, (res) => {
          setLabelsData(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  const fetchHistoryData = (id) => {
    setHistoryLoading(true);
    fetchGet(`${apiRequest.appStore.servicesDetail}/${id}/`, {
      // params: {
      //   id: id,
      // },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setHistoryData(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setHistoryLoading(false);
      });
  };

  // 服务的启动｜停止｜重启
  const operateService = (data, operate, del_file) => {
    setLoading(true);
    fetchPost(apiRequest.appStore.servicesAction, {
      body: {
        data: data.map((i) => ({
          action: operate,
          id: i.id,
          del_file: del_file || null,
          operation_user: localStorage.getItem("username"),
        })),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          message.success(
            operateObj[operateAciton] + context.ln + context.succeeded
          );
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setServiceAcitonModal(false);
        setCurrentSerAcitonModal(false);
        setCheckedList([]);
        setRow({});
        setLoading(true);
        t.current = setTimeout(() => {
          fetchData(
            { current: pagination.current, pageSize: pagination.pageSize },
            {
              ...pagination.searchParams,
              ip: selectValue,
              service_instance_name: instanceSelectValue,
            },
            pagination.ordering
          );
        }, 1500);
      });
  };

  const queryServiceInstallHistoryDetail = (id) => {
    fetchGet(apiRequest.appStore.serviceInstallHistoryDetail, {
      params: {
        id: id,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setLog(res.data[0].log);
          if (
            res.data[0].install_step_status == 1 ||
            res.data[0].install_step_status == 0
          ) {
            timer.current = setTimeout(() => {
              queryServiceInstallHistoryDetail(id);
            }, 2000);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      });
  };

  // 删除操作的提示语获取
  const queryDeleteMsg = (data) => {
    fetchPost(apiRequest.appStore.servicesDeleteMsg, {
      body: {
        data: data.map((i) => ({
          id: i.id,
          action: "4",
          operation_user: localStorage.getItem("username"),
        })),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res && res.data) {
            let key = res.data?.split(":")[0];
            let values = res.data?.split(":")[1];
            let arr = values?.split(",");
            let dom = (
              <div>
                <div>{key}</div>
                <div
                  style={{
                    overflow: "auto",
                    maxHeight: "240px",
                  }}
                >
                  <ExpandCollapseMsg length={6} all={arr} />
                </div>
              </div>
            );
            setDeleteMsg(dom);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  // 查询平台访问 url 信息
  const getUrlInfo = () => {
    setUrlLoading(true);
    fetchGet(apiRequest.appStore.getUrl)
      .then((res) => {
        handleResponse(res, (res) => {
          setUrlData(res.data);
          setIsShowUrl(true);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setUrlLoading(false);
      });
  };

  useEffect(() => {
    fetchData(
      { current: pagination.current, pageSize: pagination.pageSize },
      {
        ip: location.state?.ip,
        app_type: location.state?.app_type,
        label_name: location.state?.label_name,
      }
    );
    return () => {
      if (t.current) {
        clearTimeout(t.current);
      }
    };
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部区域 -- */}
      <div style={{ display: "flex" }}>
        {/* -- 安装 -- */}
        <Button
          type="primary"
          onClick={() => {
            history.push("/application_management/app_store");
          }}
        >
          {context.install}
        </Button>

        {/* -- 启动 -- */}
        <Button
          type="primary"
          style={{ marginLeft: 10 }}
          disabled={checkedList.length == 0}
          onClick={() => {
            setOperateAciton(1);
            setServiceAcitonModal(true);
          }}
        >
          {context.start}
        </Button>

        {/* -- 更多 -- */}
        <Dropdown
          overlay={
            <Menu>
              {/* <Menu.Item
                key="openMaintain"
                style={{ textAlign: "center" }}
                onClick={() => {
                  setOperateAciton(1);
                  setServiceAcitonModal(true);
                }}
                disabled={
                  checkedList.filter((e) => {
                    return e.operable;
                  }).length == 0
                }
              >
                启动
              </Menu.Item> */}
              <Menu.Item
                key="closeMaintain"
                style={{ textAlign: "center" }}
                disabled={
                  checkedList.filter((e) => {
                    return e.operable;
                  }).length == 0
                }
                onClick={() => {
                  setOperateAciton(2);
                  setServiceAcitonModal(true);
                }}
              >
                {context.stop}
              </Menu.Item>
              <Menu.Item
                key="reStartHost"
                style={{ textAlign: "center" }}
                disabled={
                  checkedList.filter((e) => {
                    return e.operable;
                  }).length == 0
                }
                onClick={() => {
                  setOperateAciton(3);
                  setServiceAcitonModal(true);
                }}
              >
                {context.restart}
              </Menu.Item>
              <Menu.Item
                key="reStartMonitor"
                style={{ textAlign: "center" }}
                disabled={checkedList.length == 0}
                onClick={() => {
                  queryDeleteMsg(checkedList);
                  setOperateAciton(4);
                  setServiceAcitonModal(true);
                  setConfirmDeletion(true);
                  setDeleteDimension(false);
                }}
              >
                {context.delete}
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

        {/* -- 平台访问 -- */}
        <Button
          type="primary"
          style={{ marginLeft: 10 }}
          onClick={() => getUrlInfo()}
          loading={urlLoading}
        >
          {context.platformAccess}
        </Button>

        {/* -- 搜索刷新 -- */}
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
                    pageSize: pagination.pageSize,
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
                  fetchData(
                    { current: 1, pageSize: pagination.pageSize },
                    { ip: value },
                    pagination.ordering
                  );
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
                    fetchData(
                      {
                        current: 1,
                        pageSize: pagination.pageSize,
                      },
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
                      {
                        current: 1,
                        pageSize: pagination.pageSize,
                      },
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
                    {
                      current: 1,
                      pageSize: pagination.pageSize,
                    },
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
              //location.state = {}
              dispatch(refreshTime());
              setCheckedList([]);
              fetchData(
                { current: pagination.current, pageSize: pagination.pageSize },
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
          columns={getColumnsConfig(
            setIsShowDrawer,
            setRow,
            fetchHistoryData,
            history,
            labelsData,
            (params) => {
              fetchData(
                { current: 1, pageSize: pagination.pageSize },
                { ...pagination.searchParams, ...params },
                pagination.ordering
              );
            },
            location.state?.app_type,
            location.state?.label_name,
            setShowIframe,
            setOperateAciton,
            setCurrentSerAcitonModal,
            queryDeleteMsg,
            context,
            () => {
              setConfirmDeletion(true);
              setDeleteDimension(false);
            }
          )}
          notSelectable={(record) => ({
            // 部署中的不能选中
            disabled: !(
              record.service_status === "正常" ||
              record.service_status === "停止" ||
              record.service_status === "未监控"
            ),
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

      {/* -- 监控面板 -- */}
      <OmpDrawer
        showIframe={showIframe}
        setShowIframe={setShowIframe}
        context={context}
      />

      {/* -- 服务详情 -- */}
      <DetailService
        isShowDrawer={isShowDrawer}
        setIsShowDrawer={setIsShowDrawer}
        loading={historyLoading}
        data={historyData}
        setInstallationRecordModal={setInstallationRecordModal}
        queryServiceInstallHistoryDetail={(id) =>
          queryServiceInstallHistoryDetail(id)
        }
        context={context}
      />

      {/* -- 平台访问 -- */}
      <UrlInfo
        isShowDrawer={isShowUrl}
        setIsShowDrawer={setIsShowUrl}
        urlData={urlData}
        context={context}
      />

      {/* -- 服务管控 -- */}
      <OmpMessageModal
        visibleHandle={[serviceAcitonModal, setServiceAcitonModal]}
        context={context}
        loading={loading}
        onFinish={() => {
          let data = null;
          if (operateAciton === 4) {
            data = checkedList;
          } else {
            data = checkedList.filter((e) => {
              return e.operable;
            });
          }
          operateService(data, operateAciton, deleteDimension);
        }}
      >
        <div style={{ padding: "20px", paddingBottom: "10px" }}>
          {msgMap[locale].exeLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {operateObj[operateAciton]}{" "}
          </span>
          {msgMap[locale].exeMid}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].exeRight}
          {operateAciton == 4 && deleteMsg && (
            <>
              {/* <div style={{ paddingTop: 10 }}>{deleteMsg}</div> */}
              <div style={{ position: "relative", top: 15 }}>
                <Checkbox
                  checked={deleteDimension}
                  onChange={(e) => setDeleteDimension(e.target.checked)}
                >
                  <span style={{ fontSize: 14 }}>
                    {context.uninstall +
                      context.ln +
                      context.service +
                      context.ln +
                      context.entity}
                  </span>
                </Checkbox>
              </div>
            </>
          )}
        </div>
      </OmpMessageModal>

      {/* -- 删除单个服务 -- */}
      <OmpMessageModal
        visibleHandle={[currentSerAcitonModal, setCurrentSerAcitonModal]}
        context={context}
        loading={loading}
        onFinish={() => {
          operateService([row], operateAciton, deleteDimension);
        }}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].exeLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {operateObj[operateAciton]}{" "}
          </span>
          {msgMap[locale].exeMid}
          <span style={{ fontWeight: 600, color: "red" }}> 1 </span>
          {msgMap[locale].exeRight}
          {operateAciton == 4 && deleteMsg && (
            <>
              <div style={{ position: "relative", top: 15 }}>
                <Checkbox
                  checked={deleteDimension}
                  onChange={(e) => setDeleteDimension(e.target.checked)}
                >
                  <span style={{ fontSize: 14 }}>
                    {context.uninstall +
                      context.ln +
                      context.service +
                      context.ln +
                      context.entity}
                  </span>
                </Checkbox>
              </div>
            </>
          )}
        </div>
      </OmpMessageModal>

      {/* -- 安装记录 -- */}
      <OmpMessageModal
        title={context.install + context.ln + context.record}
        bodyStyle={{
          backgroundColor: "#000",
          color: "#fff",
          padding: 0,
        }}
        style={{ top: 180 }}
        width={800}
        afterClose={() => {
          if (timer.current) {
            clearTimeout(timer.current);
          }
        }}
        noFooter={true}
        visibleHandle={[installationRecordModal, setInstallationRecordModal]}
      >
        <div
          ref={containerRef}
          style={{
            padding: 10,
            minHeight: 30,
            height: 300,
            color: "#fff",
            backgroundColor: "#000",
            wordWrap: "break-word",
            wordBreak: "break-all",
            whiteSpace: "pre-line",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {log ? log : context.installing + "..."}
        </div>
      </OmpMessageModal>
    </OmpContentWrapper>
  );
};

// 删除服务依赖信息
const ExpandCollapseMsg = ({ length, all }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!all) {
    return <></>;
  }
  if (isOpen) {
    return (
      <>
        {all.map((item) => {
          return <div key={item}>{item}</div>;
        })}
        <a onClick={() => setIsOpen(false)}>收起</a>
      </>
    );
  } else {
    return (
      <>
        {all?.slice(0, length).map((item) => {
          return <div key={item}>{item}</div>;
        })}
        {all.length > length && <a onClick={() => setIsOpen(true)}>...展开</a>}
      </>
    );
  }
};

export default ServiceManagement;
