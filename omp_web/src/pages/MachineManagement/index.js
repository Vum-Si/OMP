import {
  OmpContentWrapper,
  OmpTable,
  OmpMessageModal,
  OmpSelect,
  OmpDrawer,
} from "@/components";
import { Button, message, Menu, Dropdown } from "antd";
import { useState, useEffect, useRef } from "react";
import { handleResponse, _idxInit, refreshTime } from "@/utils/utils";
import { fetchGet, fetchPost, fetchPatch } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import {
  AddMachineModal,
  UpDateMachineModal,
  BatchImportMachineModal,
} from "./config/modals";
import { useDispatch } from "react-redux";
import getColumnsConfig, { DetailHost, NoSshUrlInfo } from "./config/columns";
import { DownOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    restartLeft: "Are you sure to restart a total of",
    reinstallLeft: "Are you sure to reinstall a total of",
    hostAgentRight: "host Agent?",
    monitorAgentRight: "monitor Agent?",
    openmode: "Are you sure to open the maintain mode for a total of",
    closemode: "Are you sure to close the maintain mode for a total of",
    modeRight: "hosts?",
    deleteLeft: "Are you sure to delete a total of",
    deleteRight: "hosts?",
  },
  "zh-CN": {
    restartLeft: "确认重启共计",
    reinstallLeft: "确认重装共计",
    hostAgentRight: "个主机Agent吗?",
    monitorAgentRight: "个监控Agent吗?",
    openmode: "确认打开共",
    closemode: "确认关闭共",
    modeRight: "个主机的维护模式吗?",
    deleteLeft: "确认删除共计",
    deleteRight: "台主机吗?",
  },
};

const MachineManagement = ({ locale }) => {
  const location = useLocation();
  const history = useHistory();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  //添加弹框的控制state
  const [addModalVisible, setAddMoadlVisible] = useState(false);
  //修改弹框的控制state
  const [updateMoadlVisible, setUpdateMoadlVisible] = useState(false);
  // 批量导入弹框
  const [batchImport, setBatchImport] = useState(false);
  //选中的数据
  const [checkedList, setCheckedList] = useState([]);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [ipListSource, setIpListSource] = useState([]);
  const [selectValue, setSelectValue] = useState(location.state?.ip);
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
  // 定义row存数据
  const [row, setRow] = useState({});
  // 主机详情历史数据
  const [historyData, setHistoryData] = useState([]);
  // 主机详情基础组件信息
  const [baseEnvData, setBaseEnvData] = useState([]);
  // 主机详情loading
  const [historyLoading, setHistoryLoading] = useState([]);
  // 重启主机agent
  const [restartHostAgentModal, setRestartHostAgentModal] = useState(false);
  // 重启监控agent
  const [restartMonterAgentModal, setRestartMonterAgentModal] = useState(false);
  // 重装主机agent
  const [reInstallHostAgentModal, setReInstallHostAgentModal] = useState(false);
  // 重装监控agent
  const [reInstallMonterAgentModal, setReInstallMonterAgentModal] =
    useState(false);
  // 开启
  const [openMaintainModal, setOpenMaintainModal] = useState(false);
  // 关闭维护
  const [closeMaintainModal, setCloseMaintainModal] = useState(false);
  // 删除主机
  const [deleteHostModal, setDeleteHostModal] = useState(false);
  const [showIframe, setShowIframe] = useState({});
  // 无 SSH 自动安装 agent
  const [isShowNoSshUrl, setIsShowNoSshUrl] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlData, setUrlData] = useState("");
  const context = locales[locale].common;

  // 列表查询
  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    searchParams,
    ordering
  ) => {
    setLoading(true);
    fetchGet(apiRequest.machineManagement.hosts, {
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

  // 添加主机
  const createHost = (data) => {
    setLoading(true);
    data.ip = data.IPtext;
    delete data.IPtext;
    data.port = `${data.port}`;
    delete data.icon;
    fetchPost(apiRequest.machineManagement.hosts, {
      body: {
        ...data,
      },
    })
      .then((res) => {
        if (res && res.data) {
          if (res.data.code == 1) {
            message.warning(res.data.message);
          }
          if (res.data.code == 0) {
            message.success(context.add + context.ln + context.succeeded);
            fetchData(
              { current: pagination.current, pageSize: pagination.pageSize },
              { ip: selectValue },
              pagination.ordering
            );
            setAddMoadlVisible(false);
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 更新主机
  const upDateHost = (data) => {
    setLoading(true);
    data.ip = data.IPtext;
    delete data.IPtext;
    data.port = `${data.port}`;
    fetchPatch(`${apiRequest.machineManagement.hosts}${row.id}/`, {
      body: {
        ...data,
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
              { current: pagination.current, pageSize: pagination.pageSize },
              { ip: selectValue },
              pagination.ordering
            );
            setUpdateMoadlVisible(false);
          }
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 获取主机详情
  const fetchHostDetail = (id) => {
    setHistoryLoading(true);
    fetchGet(`${apiRequest.machineManagement.hostDetail}${id}`)
      .then((res) => {
        handleResponse(res, (res) => {
          const { deployment_information, history } = res.data;
          setHistoryData(history);
          setBaseEnvData(deployment_information);
          console.log(deployment_information);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setHistoryLoading(false);
      });
  };

  // 重启监控agent
  const fetchRestartMonitorAgent = () => {
    setLoading(true);
    fetchPost(apiRequest.machineManagement.restartMonitorAgent, {
      body: {
        host_ids: checkedList.map((item) => item.id),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0) {
            message.success(context.restart + context.ln + context.succeeded);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setRestartMonterAgentModal(false);
        setCheckedList([]);
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ip: selectValue },
          pagination.ordering
        );
      });
  };

  // 重启主机agent
  const fetchRestartHostAgent = () => {
    setLoading(true);
    fetchPost(apiRequest.machineManagement.restartHostAgent, {
      body: {
        host_ids: checkedList.map((item) => item.id),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0) {
            message.success(context.restart + context.ln + context.succeeded);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setRestartHostAgentModal(false);
        setCheckedList([]);
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ip: selectValue },
          pagination.ordering
        );
      });
  };

  // 重装主机agent
  const fetchInstallHostAgent = () => {
    setLoading(true);
    fetchPost(apiRequest.machineManagement.reInstallHostAgent, {
      body: {
        host_ids: checkedList.map((item) => item.id),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0) {
            message.success(context.reinstall + context.ln + context.succeeded);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setReInstallHostAgentModal(false);
        setCheckedList([]);
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ip: selectValue },
          pagination.ordering
        );
      });
  };

  // 重装监控agent
  const fetchInstallMonitorAgent = () => {
    setLoading(true);
    fetchPost(apiRequest.machineManagement.reInstallMonitorAgent, {
      body: {
        host_ids: checkedList.map((item) => item.id),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success(context.reinstall + context.ln + context.succeeded);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setReInstallMonterAgentModal(false);
        setCheckedList([]);
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ip: selectValue },
          pagination.ordering
        );
      });
  };

  // 主机进入｜退出维护模式
  const fetchMaintainChange = (e, checkedList) => {
    let host_arr = [];
    if (e) {
      host_arr = checkedList.filter((item) => {
        return !item.is_maintenance;
      });
    } else {
      host_arr = checkedList.filter((item) => {
        return item.is_maintenance;
      });
    }
    if (host_arr.length == 0) {
      setLoading(false);
      setOpenMaintainModal(false);
      setCloseMaintainModal(false);
      setCheckedList([]);
      if (e) {
        message.success(context.open + context.ln + context.succeeded);
      } else {
        message.success(context.close + context.ln + context.succeeded);
      }
      return;
    }
    setLoading(true);
    fetchPost(apiRequest.machineManagement.hostsMaintain, {
      body: {
        is_maintenance: e,
        host_ids: host_arr.map((item) => item.id),
      },
    })
      .then((res) => {
        if (res.data.code === 0) {
          if (e) {
            message.success(context.open + context.ln + context.succeeded);
          } else {
            message.success(context.close + context.ln + context.succeeded);
          }
        } else {
          message.warning(res.data.message);
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setOpenMaintainModal(false);
        setCloseMaintainModal(false);
        setCheckedList([]);
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ip: selectValue },
          pagination.ordering
        );
      });
  };

  // 主机删除
  const deleteHost = () => {
    setLoading(true);
    fetchPost(apiRequest.machineManagement.deleteHost, {
      body: {
        host_ids: checkedList.map((item) => item.id),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success(context.delete + context.ln + context.succeeded);
          }
          if (res.code == 1) {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
        setDeleteHostModal(false);
        setCheckedList([]);
        fetchData(
          { current: pagination.current, pageSize: pagination.pageSize },
          { ip: selectValue },
          pagination.ordering
        );
      });
  };

  // 获取无 SSH 场景导入主机的 URL
  const getNoSshUrl = () => {
    setUrlLoading(true);
    fetchGet(apiRequest.machineManagement.getNoSshUrl)
      .then((res) => {
        handleResponse(res, (res) => {
          setUrlData(res.data);
          setIsShowNoSshUrl(true);
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
      { ip: location.state?.ip }
    );
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部区域 -- */}
      <div style={{ display: "flex" }}>
        {/* -- 添加 -- */}
        <Button type="primary" onClick={() => setAddMoadlVisible(true)}>
          {context.add}
        </Button>

        {/* -- 无 SSH -- */}
        <Button
          type="primary"
          style={{ marginLeft: 10 }}
          onClick={() => getNoSshUrl()}
          loading={urlLoading}
        >
          {context.noSsh}
        </Button>

        {/* -- 导入 -- */}
        <Button
          type="primary"
          style={{ marginLeft: 10 }}
          onClick={() => setBatchImport(true)}
        >
          {context.import}
        </Button>

        {/* -- 更多 -- */}
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item
                key="openMaintain"
                style={{ textAlign: "center" }}
                onClick={() => setOpenMaintainModal(true)}
                disabled={checkedList.map((item) => item.id).length == 0}
              >
                {context.open + context.ln + context.maintainMode}
              </Menu.Item>
              <Menu.Item
                key="closeMaintain"
                style={{ textAlign: "center" }}
                disabled={checkedList.length == 0}
                onClick={() => setCloseMaintainModal(true)}
              >
                {context.close + context.ln + context.maintainMode}
              </Menu.Item>
              <Menu.Item
                key="reStartHost"
                style={{ textAlign: "center" }}
                disabled={checkedList.length == 0}
                onClick={() => setRestartHostAgentModal(true)}
              >
                {context.restart + context.ln + context.hostAgent}
              </Menu.Item>
              <Menu.Item
                key="reStartMonitor"
                style={{ textAlign: "center" }}
                disabled={checkedList.length == 0}
                onClick={() => setRestartMonterAgentModal(true)}
              >
                {context.restart + context.ln + context.monitorAgent}
              </Menu.Item>
              <Menu.Item
                key="reInstallHost"
                style={{ textAlign: "center" }}
                disabled={checkedList.length == 0}
                onClick={() => setReInstallHostAgentModal(true)}
              >
                {context.reinstall + context.ln + context.hostAgent}
              </Menu.Item>
              <Menu.Item
                key="reInstallMonitor"
                style={{ textAlign: "center" }}
                disabled={checkedList.length == 0}
                onClick={() => setReInstallMonterAgentModal(true)}
              >
                {context.reinstall + context.ln + context.monitorAgent}
              </Menu.Item>
              <Menu.Item
                key="deleteHost"
                style={{ textAlign: "center" }}
                disabled={checkedList.map((item) => item.id).length == 0}
                onClick={() => setDeleteHostModal(true)}
              >
                {context.delete + context.ln + context.host}
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

        {/* -- 搜索刷新 -- */}
        <div style={{ display: "flex", marginLeft: "auto" }}>
          <span style={{ width: 30, display: "flex", alignItems: "center" }}>
            {context.ip + " : "}
          </span>
          <OmpSelect
            placeholder={context.input + " " + context.ip}
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
          <Button
            style={{ marginLeft: 10 }}
            onClick={() => {
              dispatch(refreshTime());
              setCheckedList([]);
              fetchData(
                { current: pagination.current, pageSize: pagination.pageSize },
                { ip: selectValue },
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
            setUpdateMoadlVisible,
            fetchHostDetail,
            setShowIframe,
            history,
            context
          )}
          // notSelectable={(record) => ({
          //   // 部署中的不能选中
          //   disabled: record?.host_agent == 3 || record?.monitor_agent == 3,
          // })}
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

      {/* -- 添加主机 -- */}
      {addModalVisible && (
        <AddMachineModal
          setLoading={setLoading}
          loading={loading}
          visibleHandle={[addModalVisible, setAddMoadlVisible]}
          createHost={createHost}
          context={context}
          locale={locale}
        />
      )}

      {/* -- 编辑主机 -- */}
      {updateMoadlVisible && (
        <UpDateMachineModal
          loading={loading}
          setLoading={setLoading}
          visibleHandle={[updateMoadlVisible, setUpdateMoadlVisible]}
          createHost={upDateHost}
          row={row}
          context={context}
          locale={locale}
        />
      )}

      {/* -- 主机详情 -- */}
      <DetailHost
        isShowDrawer={isShowDrawer}
        setIsShowDrawer={setIsShowDrawer}
        loading={historyLoading}
        data={historyData}
        baseEnv={baseEnvData}
        context={context}
      />

      {/* -- 监控面板 -- */}
      <OmpDrawer
        showIframe={showIframe}
        setShowIframe={setShowIframe}
        context={context}
      />

      {/* -- 无 SSH 添加 -- */}
      <NoSshUrlInfo
        isShowDrawer={isShowNoSshUrl}
        setIsShowDrawer={setIsShowNoSshUrl}
        urlData={urlData}
        context={context}
        locale={locale}
      />

      {/* -- 批量添加主机 -- */}
      <BatchImportMachineModal
        batchImport={batchImport}
        setBatchImport={setBatchImport}
        refreshData={() => {
          fetchData(
            { current: pagination.current, pageSize: pagination.pageSize },
            { ip: selectValue },
            pagination.ordering
          );
        }}
        context={context}
        locale={locale}
      />

      {/* -- 开启维护模式 -- */}
      <OmpMessageModal
        visibleHandle={[openMaintainModal, setOpenMaintainModal]}
        loading={loading}
        context={context}
        onFinish={() => fetchMaintainChange(true, checkedList)}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].openmode}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].modeRight}
        </div>
      </OmpMessageModal>

      {/* -- 关闭维护模式 -- */}
      <OmpMessageModal
        visibleHandle={[closeMaintainModal, setCloseMaintainModal]}
        loading={loading}
        context={context}
        onFinish={() => fetchMaintainChange(false, checkedList)}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].closemode}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].modeRight}
        </div>
      </OmpMessageModal>

      {/* -- 重启主机 Agent -- */}
      <OmpMessageModal
        visibleHandle={[restartHostAgentModal, setRestartHostAgentModal]}
        loading={loading}
        context={context}
        onFinish={() => fetchRestartHostAgent()}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].restartLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].hostAgentRight}
        </div>
      </OmpMessageModal>

      {/* -- 重启监控 Agent -- */}
      <OmpMessageModal
        visibleHandle={[restartMonterAgentModal, setRestartMonterAgentModal]}
        loading={loading}
        context={context}
        onFinish={() => fetchRestartMonitorAgent()}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].restartLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].monitorAgentRight}
        </div>
      </OmpMessageModal>

      {/* -- 重装主机 Agent -- */}
      <OmpMessageModal
        visibleHandle={[reInstallHostAgentModal, setReInstallHostAgentModal]}
        loading={loading}
        context={context}
        onFinish={() => fetchInstallHostAgent()}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].reinstallLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].hostAgentRight}
        </div>
      </OmpMessageModal>

      {/* -- 重装监控 Agent -- */}
      <OmpMessageModal
        visibleHandle={[
          reInstallMonterAgentModal,
          setReInstallMonterAgentModal,
        ]}
        loading={loading}
        context={context}
        onFinish={() => fetchInstallMonitorAgent()}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].reinstallLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].monitorAgentRight}
        </div>
      </OmpMessageModal>

      {/* -- 删除主机 -- */}
      <OmpMessageModal
        visibleHandle={[deleteHostModal, setDeleteHostModal]}
        loading={loading}
        context={context}
        onFinish={() => deleteHost()}
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
    </OmpContentWrapper>
  );
};

export default MachineManagement;
