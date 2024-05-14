import { Input, Button, Pagination, Empty, Spin, Dropdown, Menu } from "antd";
import { useEffect, useRef, useState } from "react";
import styles from "./index.module.less";
import {
  SearchOutlined,
  DownloadOutlined,
  DownOutlined,
  SendOutlined,
  ScanOutlined,
  ArrowUpOutlined,
  SyncOutlined,
  DeleteOutlined,
  ZoomInOutlined,
} from "@ant-design/icons";
import Card from "./config/card.js";
import { useSelector, useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse, downloadFile } from "@/utils/utils";
import ReleaseModal from "./config/ReleaseModal.js";
import ScanServerModal from "./config/ScanServerModal";
import DeleteServerModal from "./config/DeleteServerModal";
// 批量安装弹框组件
import BatchInstallationModal from "./config/BatchInstallationModal";
import ServiceUpgradeModal from "./config/ServiceUpgradeModal";
import ServiceRollbackModal from "./config/ServiceRollbackModal";
import GetServiceModal from "./config/GetServiceModal";
import {
  getTabKeyChangeAction,
  getUniqueKeyChangeAction,
} from "./store/actionsCreators";
import { locales } from "@/config/locales";

const englishMap = {
  中间件: "middleware",
  环境组件: "env",
  数据库: "database",
  消息队列: "queue",
  分布式存储: "distributed storage",
  时间序列数据库: "time-series DB",
  配置中心: "configuration",
  服务监控: "monitor",
  任务调度: "task scheduling",
  自研服务: "self developed",
  缓存中间件: "cache",
  反向代理: "reverse proxy",
  注册与配置中心: "configuration",
  监控客户端: "monitor client",
  链路监控: "link monitor",
};

const AppStore = ({ locale }) => {
  const appStoreTabKey = useSelector((state) => state.appStore.appStoreTabKey);
  const dispatch = useDispatch();
  // 视口高度
  const viewHeight = useSelector((state) => state.layouts.viewSize.height);
  const history = useHistory();
  const [tabKey, setTabKey] = useState(appStoreTabKey);
  const [searchData, setSearchData] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [total, setTotal] = useState(0);
  const [timeUnix, setTimeUnix] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: viewHeight > 955 ? 12 : 8,
    total: 0,
    searchParams: {},
  });
  // 发布操作
  const [releaseModalVisibility, setReleaseModalVisibility] = useState(false);
  // 扫描服务端
  const [scanServerModalVisibility, setScanServerModalVisibility] =
    useState(false);
  // 服务升级操作弹框
  const [sUModalVisibility, setSUModalVisibility] = useState(false);
  // 服务回退操作弹框
  const [sRModalVisibility, setSRModalVisibility] = useState(false);
  // 批量安装弹框
  const [bIModalVisibility, setBIModalVisibility] = useState(false);
  // 删除应用商店
  const [deleteServerVisibility, setDeleteServerVisibility] = useState(false);
  // 服务纳管弹框
  const [serviceGetModalVisibility, setServiceGetModalVisibility] =
    useState(false);
  const [serviceGetData, setServiceGetData] = useState([]);
  const [initData, setInitData] = useState([]);
  // 批量安装的应用服务列表
  const [bIserviceList, setBIserviceList] = useState([]);
  // 部署类型字段
  const [deployTypeList, setDeployTypeList] = useState({});
  const context = locales[locale].common;

  const [searchKey, setSearchKey] = useState(context.all);
  // 批量安装标题文案
  const installTitle = useRef(context.batch);

  const fetchData = (
    pageParams = { current: 1, pageSize: 8 },
    searchParams
  ) => {
    setLoading(true);
    fetchGet(
      searchParams.tabKey == "component"
        ? apiRequest.appStore.queryComponents
        : apiRequest.appStore.queryServices,
      {
        params: {
          page: pageParams.current,
          size: pageParams.pageSize,
          ...searchParams,
          tabKey: null,
        },
      }
    )
      .then((res) => {
        handleResponse(res, (res) => {
          // 获得真正的总数，要查询条件都为空时
          let obj = { ...searchParams };
          delete obj.tabKey;
          let arr = Object.values(obj).filter((i) => i);
          if (arr.length == 0) {
            setTotal(res.data.count);
          }
          setDataSource(res.data.results);
          setPagination({
            ...pagination,
            total: res.data.count,
            pageSize: pageParams.pageSize,
            current: pageParams.current,
            searchParams: searchParams,
          });
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        location.state = {};
        setLoading(false);
        fetchSearchlist();
        //fetchIPlist();
      });
  };

  // 获取批量安装应用服务列表
  const queryBatchInstallationServiceList = (queryData) => {
    setLoading(true);
    fetchGet(apiRequest.appStore.queryBatchInstallationServiceList, {
      params: queryData,
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.data && res.data.data) {
            let serviceList = res.data.data.map((item) => ({
              ...item,
              id: item.name,
            }));
            let typeDict = {};
            for (const key in serviceList) {
              if (Object.hasOwnProperty.call(serviceList, key)) {
                const element = serviceList[key];
                typeDict[element.name] = "default";
              }
            }
            setDeployTypeList(typeDict);
            setBIserviceList(serviceList);
            dispatch(getUniqueKeyChangeAction(res.data.unique_key));
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 获取可纳管服务列表
  const queryAllAppList = () => {
    setLoading(true);
    fetchGet(apiRequest.appStore.queryAppList)
      .then((res) => {
        handleResponse(res, (res) => {
          const resArr = res.data;
          for (let i = 0; i < resArr.length; i++) {
            const element = resArr[i];
            if (element.hasOwnProperty("child")) {
              element.children = element.child[element.version[0]];
            }
          }
          setServiceGetData(resArr);
          setInitData(resArr);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 获取安装基础组件列表
  const queryInstallComponent = (queryData) => {
    setLoading(true);
    fetchGet(apiRequest.appStore.ProductDetail, {
      params: queryData,
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.data) {
            let serverlist = {};
            serverlist.name = res.data.app_name;
            serverlist.is_continue = true;
            serverlist.version = res.data.versions.map((item) => {
              return item.app_version;
            });
            let deployList = {};
            let typeDict = {};
            for (const key in res.data.versions) {
              if (Object.hasOwnProperty.call(res.data.versions, key)) {
                const element = res.data.versions[key];
                typeDict[element.app_name] = "default";
                deployList[element.app_version] = element.deploy_list;
              }
            }
            serverlist.deploy_list = deployList;
            setDeployTypeList(typeDict);
            setBIserviceList([serverlist]);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchSearchlist = () => {
    fetchGet(apiRequest.appStore.queryLabels, {
      params: {
        label_type: tabKey == "component" ? 0 : 1,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setSearchData(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        //setSearchLoading(false);
      });
  };

  useEffect(() => {
    setPagination({
      current: 1,
      pageSize: viewHeight > 955 ? 12 : 8,
      total: 0,
      searchParams: {},
    });
    setSearchName("");
    setSearchKey(context.all);

    fetchData(
      { current: 1, pageSize: pagination.pageSize },
      {
        ...pagination.searchParams,
        tabKey: tabKey,
        type: searchKey === context.all ? null : searchKey,
      }
    );

    return () => {
      dispatch(getTabKeyChangeAction(tabKey));
    };
  }, [tabKey, searchKey]);

  const refresh = () => {
    fetchData(
      { current: 1, pageSize: pagination.pageSize },
      {
        ...pagination.searchParams,
        tabKey: tabKey,
        type: searchKey === context.all ? null : searchKey,
      }
    );
  };

  return (
    <div>
      {/* -- 顶部区域 -- */}
      <div className={styles.header}>
        <div className={styles.headerTabRow}>
          {/* -- 基础组件/应用服务 标签 -- */}
          <div
            className={styles.headerTab}
            onClick={(e) => {
              if (e.target.innerHTML === context.application) {
                setTabKey("service");
              } else if (e.target.innerHTML === context.component) {
                setTabKey("component");
              }
            }}
          >
            <div
              style={
                tabKey === "component" ? { color: "rgb(46, 124, 238)" } : {}
              }
            >
              {context.component}
            </div>
            <div>|</div>
            <div
              style={tabKey === "service" ? { color: "rgb(46, 124, 238)" } : {}}
            >
              {context.application}
            </div>
          </div>

          {/* -- 搜索 批量 更多 -- */}
          <div className={styles.headerBtn}>
            <Input
              placeholder={context.input + context.ln + context.appName}
              suffix={
                !searchName && <SearchOutlined style={{ color: "#b6b6b6" }} />
              }
              style={{ marginRight: 10, width: 200 }}
              value={searchName}
              allowClear
              onChange={(e) => {
                setSearchName(e.target.value);
                if (!e.target.value) {
                  fetchData(
                    {
                      current: 1,
                      pageSize: pagination.pageSize,
                    },
                    {
                      ...pagination.searchParams,
                      [tabKey == "component" ? "app_name" : "pro_name"]: null,
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
                    [tabKey == "component" ? "app_name" : "pro_name"]:
                      searchName,
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
                    [tabKey == "component" ? "app_name" : "pro_name"]:
                      searchName,
                  }
                );
              }}
            />

            <Button
              style={{ marginRight: 10 }}
              type="primary"
              onClick={() => {
                installTitle.current = "批量";
                queryBatchInstallationServiceList();
                setBIModalVisibility(true);
              }}
            >
              {context.batch + context.ln + context.install}
            </Button>

            <Dropdown
              overlay={
                <Menu
                  style={{
                    width: "calc(100% + 30px)",
                    position: "relative",
                    left: -20,
                  }}
                >
                  <Menu.Item
                    key="publishing"
                    style={{ display: "flex" }}
                    onClick={() => {
                      setTimeUnix(new Date().getTime());
                      setReleaseModalVisibility(true);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px 0 5px 5px",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          backgroundColor: "#2e7cee",
                          borderRadius: "50%",
                        }}
                      >
                        <SendOutlined
                          style={{
                            color: "#fff",
                            position: "relative",
                            left: 6,
                          }}
                        />
                      </div>
                      <div style={{ paddingLeft: 20 }}>
                        {context.upload + context.ln + context.publish}
                      </div>
                    </div>
                  </Menu.Item>
                  <Menu.Item
                    key="scanServer"
                    style={{ display: "flex" }}
                    onClick={() => {
                      setScanServerModalVisibility(true);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px 0 5px 5px",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          backgroundColor: "#2e7cee",
                          borderRadius: "50%",
                        }}
                      >
                        <ScanOutlined
                          style={{
                            color: "#fff",
                            position: "relative",
                            left: 4,
                          }}
                        />
                      </div>
                      <div style={{ paddingLeft: 20 }}>
                        {context.scan + context.ln + context.publish}
                      </div>
                    </div>
                  </Menu.Item>
                  <Menu.Item
                    key="deleteServer"
                    style={{ display: "flex" }}
                    onClick={() => setDeleteServerVisibility(true)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px 0 5px 5px",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          backgroundColor: "#2e7cee",
                          borderRadius: "50%",
                        }}
                      >
                        <DeleteOutlined
                          style={{
                            color: "#fff",
                            position: "relative",
                            left: 4,
                          }}
                        />
                      </div>
                      <div style={{ paddingLeft: 20 }}>{context.delete}</div>
                    </div>
                  </Menu.Item>
                  <div
                    style={{
                      height: 1,
                      backgroundColor: "#e3e3e3",
                      margin: "6px 10px",
                    }}
                  />
                  <Menu.Item
                    key="upgrade"
                    style={{ display: "flex" }}
                    onClick={() => {
                      setSUModalVisibility(true);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px 0 5px 5px",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          backgroundColor: "#2e7cee",
                          borderRadius: "50%",
                        }}
                      >
                        <ArrowUpOutlined
                          style={{
                            color: "#fff",
                            position: "relative",
                            left: 4,
                          }}
                        />
                      </div>
                      <div style={{ paddingLeft: 20 }}>
                        {context.service + context.ln + context.upgrade}
                      </div>
                    </div>
                  </Menu.Item>
                  <Menu.Item
                    key="rollback"
                    style={{ display: "flex" }}
                    onClick={() => {
                      setSRModalVisibility(true);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px 0 5px 5px",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          backgroundColor: "#2e7cee",
                          borderRadius: "50%",
                        }}
                      >
                        <SyncOutlined
                          style={{
                            color: "#fff",
                            position: "relative",
                            left: 4,
                          }}
                        />
                      </div>
                      <div style={{ paddingLeft: 20 }}>
                        {context.service + context.ln + context.rollback}
                      </div>
                    </div>
                  </Menu.Item>
                  <div
                    style={{
                      height: 1,
                      backgroundColor: "#e3e3e3",
                      margin: "6px 6px",
                    }}
                  />
                  <Menu.Item
                    key="getService"
                    style={{ display: "flex" }}
                    onClick={() => {
                      queryAllAppList();
                      setServiceGetModalVisibility(true);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px 0 5px 5px",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          backgroundColor: "#2e7cee",
                          borderRadius: "50%",
                        }}
                      >
                        <ZoomInOutlined
                          style={{
                            color: "#fff",
                            position: "relative",
                            left: 4,
                          }}
                        />
                      </div>
                      <div style={{ paddingLeft: 20 }}>
                        {context.incorporate}
                      </div>
                    </div>
                  </Menu.Item>
                </Menu>
              }
              placement="bottomRight"
            >
              <Button
                style={{ marginRight: 10, paddingRight: 10, paddingLeft: 15 }}
              >
                {context.more}
                <DownOutlined style={{ position: "relative", top: 1 }} />
              </Button>
            </Dropdown>
          </div>
        </div>

        {/* -- 分割线 -- */}
        <hr className={styles.headerHr} />

        <div className={styles.headerSearch}>
          {/* -- 组件/服务分类标签 -- */}
          <div
            className={styles.headerSearchCondition}
            onClick={(e) => {
              let str = e.target.attributes.realname.nodeValue;
              if (searchData?.indexOf(str) !== -1 || str === context.all) {
                setSearchKey(str);
              }
            }}
          >
            <p
              style={
                searchKey === context.all ? { color: "rgb(46, 124, 238)" } : {}
              }
              key={context.all}
              realname={context.all}
            >
              {context.all}
            </p>
            {searchData.map((item) => {
              return (
                <p
                  style={
                    searchKey == item ? { color: "rgb(46, 124, 238)" } : {}
                  }
                  key={item}
                  realname={item}
                >
                  {locale === "en-US" ? englishMap[item] : item}
                </p>
              );
            })}
          </div>

          {/* -- 下载 总计 -- */}
          <div className={styles.headerSearchInfo}>
            <Button
              style={{ marginRight: 10, fontSize: 13 }}
              icon={<DownloadOutlined />}
              onClick={() => {
                downloadFile(apiRequest.appStore.applicationTemplate);
              }}
            >
              <span style={{ color: "#818181" }}>
                {context.download + context.ln + context.instruction}
              </span>
            </Button>
            {context.total + " " + pagination.total}
          </div>
        </div>
      </div>

      {/* -- 中部区域 -- */}
      <Spin spinning={loading}>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {dataSource.length == 0 ? (
            <Empty
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: viewHeight > 955 ? 500 : 300,
                flexDirection: "column",
              }}
              description={context.noData}
            />
          ) : (
            <>
              {dataSource.map((item, idx) => {
                return (
                  <Card
                    context={context}
                    history={history}
                    key={idx}
                    idx={idx + 1}
                    info={item}
                    tabKey={tabKey}
                    installOperation={(queryData, type) => {
                      installTitle.current = type;
                      if (type === "服务") {
                        queryBatchInstallationServiceList(queryData);
                      } else {
                        queryInstallComponent(queryData);
                      }
                      setBIModalVisibility(true);
                    }}
                  />
                );
              })}
            </>
          )}
        </div>
      </Spin>

      {/* -- 底部分页 -- */}
      {dataSource.length !== 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            position: "relative",
            top: 10,
          }}
        >
          <Pagination
            onChange={(e) => {
              fetchData(
                { ...pagination, current: e },
                {
                  ...pagination.searchParams,
                }
              );
            }}
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
          />
        </div>
      )}

      {/* -- 上传发布 -- */}
      <ReleaseModal
        timeUnix={timeUnix}
        releaseModalVisibility={releaseModalVisibility}
        setReleaseModalVisibility={setReleaseModalVisibility}
        refresh={refresh}
        context={context}
        locale={locale}
      />
      {/* -- 扫描发布 -- */}
      <ScanServerModal
        scanServerModalVisibility={scanServerModalVisibility}
        setScanServerModalVisibility={setScanServerModalVisibility}
        refresh={refresh}
        context={context}
        locale={locale}
      />
      {/* -- 批量安装 -- */}
      <BatchInstallationModal
        bIModalVisibility={bIModalVisibility}
        setBIModalVisibility={setBIModalVisibility}
        dataSource={bIserviceList}
        deployListInfo={[deployTypeList, setDeployTypeList]}
        installTitle={installTitle.current}
        initLoading={loading}
        context={context}
      />
      {/* -- 服务升级 -- */}
      <ServiceUpgradeModal
        sUModalVisibility={sUModalVisibility}
        setSUModalVisibility={setSUModalVisibility}
        initLoading={loading}
        context={context}
      />
      {/* -- 服务回滚 -- */}
      <ServiceRollbackModal
        sRModalVisibility={sRModalVisibility}
        setSRModalVisibility={setSRModalVisibility}
        initLoading={loading}
        context={context}
      />
      {/* -- 删除 -- */}
      <DeleteServerModal
        deleteServerVisibility={deleteServerVisibility}
        setDeleteServerVisibility={setDeleteServerVisibility}
        tabKey={tabKey}
        refresh={refresh}
        context={context}
        locale={locale}
      />
      {/* -- 服务纳管 -- */}
      <GetServiceModal
        modalVisibility={serviceGetModalVisibility}
        setModalVisibility={setServiceGetModalVisibility}
        initData={initData}
        dataSource={serviceGetData}
        setDataSource={setServiceGetData}
        initLoading={loading}
        context={context}
        locale={locale}
      />
    </div>
  );
};

export default AppStore;
