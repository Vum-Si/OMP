import styles from "./index.module.less";
import { LeftOutlined } from "@ant-design/icons";
import { message, Select, Spin, Table } from "antd";
import { useEffect, useState } from "react";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { useHistory, useLocation } from "react-router-dom";
import { handleResponse } from "@/utils/utils";
import moment from "moment";
import { getTabKeyChangeAction } from "../store/actionsCreators";
import { useDispatch } from "react-redux";
import { getStep1ChangeAction } from "./Installation/store/actionsCreators";
import { getUniqueKeyChangeAction } from "../store/actionsCreators";
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

const AppStoreDetail = ({ locale }) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  let arr = location.pathname.split("/");
  let name = arr[arr.length - 2];
  let verson = arr[arr.length - 1];
  // true 是组件， false是服务
  let keyTab = location.pathname.includes("component");
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState({});
  const [versionValue, setVersionValue] = useState("");
  // 定义全部实例信息
  const [allInstancesInfo, setAllInstancesInfo] = useState([]);
  // 是否查看全部版本
  const [isAll, setIsAll] = useState(false);
  const context = locales[locale].common;

  //定义命名
  let nameObj = keyTab
    ? {
        logo: "app_logo",
        name: "app_name",
        version: "app_version",
        description: "app_description",
        instance_number: "instance_number",
        package_name: "app_package_name",
        package_md5: "app_package_md5",
        type: "app_labels",
        user: "app_operation_user",
        dependence: "app_dependence",
        instances_info: "app_instances_info",
      }
    : {
        logo: "pro_logo",
        name: "pro_name",
        version: "pro_version",
        description: "pro_description",
        instance_number: "instance_number",
        package_name: "pro_package_name",
        package_md5: "pro_package_md5",
        type: "pro_labels",
        user: "pro_operation_user",
        dependence: "pro_dependence",
        pro_services: "pro_services",
        instances_info: "pro_instances_info",
      };

  const fetchData = () => {
    setLoading(true);
    fetchGet(
      keyTab
        ? apiRequest.appStore.ProductDetail
        : apiRequest.appStore.ApplicationDetail,
      {
        params: {
          [keyTab ? "app_name" : "pro_name"]: name,
        },
      }
    )
      .then((res) => {
        handleResponse(res, (res) => {
          setAllInstancesInfo(() => {
            return res.data.versions
              .map((item) => {
                return item[nameObj.instances_info];
              })
              .flat();
          });
          setVersionValue(verson);
          let y = (res.data.versions = res.data.versions.map((item) => {
            // arr 为全部数据中version重复数据
            let arr = [];
            res.data.versions
              .filter((i) => i[nameObj.version] == item[nameObj.version])
              .map((v) => {
                arr = [...arr, ...v[nameObj.instances_info]];
              });
            return {
              ...item,
              [nameObj.instances_info]: arr,
            };
          }));

          setDataSource(() => {
            let obj = {};
            res.data.versions.map((item) => {
              obj[item[nameObj.version]] = item;
            });
            return {
              ...res.data,
              versionObj: obj,
            };
          });
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  let currentVersionDataSource = dataSource.versionObj
    ? dataSource.versionObj[versionValue]
    : {};

  let tableData = isAll
    ? allInstancesInfo
    : currentVersionDataSource[nameObj.instances_info];

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className={styles.detailContainer}>
      <Spin spinning={loading}>
        {/* -- 顶部名称/版本 -- */}
        <div className={styles.detailHeader}>
          <div>
            <LeftOutlined
              style={{ fontSize: 16 }}
              className={styles.backIcon}
              onClick={() => {
                keyTab
                  ? dispatch(getTabKeyChangeAction("component"))
                  : dispatch(getTabKeyChangeAction("service"));
                history?.push({
                  pathname: `/application_management/app_store`,
                });
              }}
            />{" "}
            <span style={{ paddingLeft: 20, fontSize: 16, color: "#4c4c4c" }}>
              {dataSource[nameObj.name]}
            </span>
          </div>
          <div style={{ marginRight: 30 }}>
            {context.version + " : "}
            <Select
              style={{ marginLeft: 10 }}
              value={versionValue}
              onChange={(e) => {
                setIsAll(false);
                setVersionValue(e);
              }}
            >
              {dataSource.versionObj &&
                Object.keys(dataSource?.versionObj).map((item) => {
                  return (
                    <Select.Option key={item} value={item}>
                      {item}
                    </Select.Option>
                  );
                })}
            </Select>
          </div>
        </div>

        {/* -- logo -- */}
        <div className={styles.detailTitle}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "1px solid #eaeaea",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {currentVersionDataSource[nameObj.logo] ? (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#fff",
                }}
                dangerouslySetInnerHTML={{
                  __html: currentVersionDataSource[nameObj.logo],
                }}
              ></div>
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: 30,
                  backgroundImage:
                    "linear-gradient(to right, #4f85f6, #669aee)",
                  // backgroundColor:"#5c8df6",
                  color: "#fff",
                }}
              >
                <div style={{ textAlign: "center", position: "relative" }}>
                  {dataSource[nameObj.name] &&
                    dataSource[nameObj.name][0].toLocaleUpperCase()}
                </div>
              </div>
            )}
          </div>
          <div className={styles.detailTitleDescribe}>
            <div className={styles.detailTitleDescribeText}>
              {currentVersionDataSource[nameObj.description]}
            </div>
          </div>
        </div>

        {/* -- 类型/时间/md5/发布人 -- */}
        <div className={styles.detailContent}>
          <div className={styles.detailContentItem}>
            <div className={styles.detailContentItemLabel}>
              {context.type + " : "}
            </div>
            <div>
              {locale === "zh-CN"
                ? currentVersionDataSource[nameObj.type]?.join(", ")
                : currentVersionDataSource[nameObj.type]
                    ?.map((e) => englishMap[e])
                    .join(", ")}
            </div>
          </div>
          <div className={styles.detailContentItem}>
            <div className={styles.detailContentItemLabel}>
              {context.created + " : "}
            </div>
            <div>
              {moment(currentVersionDataSource?.created).format(
                "YYYY-MM-DD HH:mm:ss"
              )}
            </div>
          </div>
          <div className={styles.detailContentItem}>
            <div className={styles.detailContentItemLabel}>
              {context.package + " : "}
            </div>
            <div>{currentVersionDataSource[nameObj.package_name]}</div>
          </div>
          <div className={styles.detailContentItem}>
            <div className={styles.detailContentItemLabel}>MD5 : </div>
            <div>{currentVersionDataSource[nameObj.package_md5]}</div>
          </div>
          <div className={styles.detailContentItem}>
            <div className={styles.detailContentItemLabel}>
              {context.operator + " : "}
            </div>
            <div>{currentVersionDataSource[nameObj.user]}</div>
          </div>
        </div>

        {/* -- 依赖信息 -- */}
        <div className={styles.detailDependence}>
          <div>{context.application + context.ln + context.dependence}</div>
          {JSON.parse(currentVersionDataSource[nameObj.dependence] || "[]")
            ?.length > 0 ? (
            <div className={styles.detailDependenceTable}>
              <Table
                size="middle"
                columns={[
                  {
                    title: context.application + context.name,
                    key: "name",
                    dataIndex: "name",
                    align: "center",
                  },
                  {
                    title: context.version,
                    key: "version",
                    dataIndex: "version",
                    align: "center",
                  },
                ]}
                pagination={false}
                dataSource={JSON.parse(
                  currentVersionDataSource[nameObj.dependence]
                )}
              />
            </div>
          ) : (
            <p style={{ paddingTop: 10, fontSize: 14, marginLeft: 20 }}>
              {context.none}
            </p>
          )}
        </div>

        {/* -- 包含服务 -- */}
        {!keyTab && (
          <div className={styles.detailDependence}>
            <div>{context.including + context.ln + context.service}</div>
            {currentVersionDataSource.pro_services ? (
              <div className={styles.detailDependenceTable}>
                <Table
                  size="middle"
                  columns={[
                    {
                      title: context.service + context.ln + context.name,
                      key: "name",
                      dataIndex: "name",
                      align: "center",
                    },
                    {
                      title: context.version,
                      key: "version",
                      dataIndex: "version",
                      align: "center",
                      render: (text) => text || "-",
                    },
                    {
                      title: context.package + context.ln + context.name,
                      key: "package_name",
                      dataIndex: "package_name",
                      align: "center",
                      render: (text) => text || "-",
                    },
                    {
                      title: "MD5",
                      key: "md5",
                      dataIndex: "md5",
                      align: "center",
                      render: (text) => text || "-",
                    },
                    {
                      title: context.created,
                      key: "created",
                      dataIndex: "created",
                      align: "center",
                      render: (text) => text || "-",
                    },
                    {
                      title: context.action,
                      key: "c",
                      dataIndex: "c",
                      align: "center",
                      render: (text, record) => {
                        return (
                          <a
                            onClick={() => {
                              setLoading(true);
                              fetchPost(
                                apiRequest.appStore.createComponentInstallInfo,
                                {
                                  body: {
                                    high_availability: false,
                                    install_component: [
                                      {
                                        name: record.name,
                                        version: record.version,
                                        self_deploy_mode: "",
                                      },
                                    ],
                                  },
                                }
                              )
                                .then((res) => {
                                  handleResponse(res, (res) => {
                                    if (res.data && res.data.data) {
                                      dispatch(
                                        getStep1ChangeAction(res.data.data)
                                      );
                                      dispatch(
                                        getUniqueKeyChangeAction(
                                          res.data.unique_key
                                        )
                                      );
                                    }
                                    history.push(
                                      "/application_management/app_store/installation"
                                    );
                                  });
                                })
                                .catch((e) => console.log(e))
                                .finally(() => {
                                  setLoading(false);
                                });
                            }}
                          >
                            {context.install}
                          </a>
                        );
                      },
                    },
                  ]}
                  pagination={false}
                  dataSource={currentVersionDataSource.pro_services}
                />
              </div>
            ) : (
              <p style={{ paddingTop: 10, fontSize: 14, marginLeft: 20 }}>
                {context.none}
              </p>
            )}
          </div>
        )}

        {/* -- 实例信息 -- */}
        {keyTab ? (
          <div className={styles.detailDependence}>
            <div>
              {context.serviceInstance}
              <span style={{ paddingLeft: 20, fontSize: 14, color: "#1f8aee" }}>
                {isAll ? (
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => setIsAll(false)}
                  >
                    {context.current + context.ln + context.version}
                  </span>
                ) : (
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => setIsAll(true)}
                  >
                    {context.all + context.ln + context.version}
                  </span>
                )}
              </span>
            </div>
            {tableData && tableData.length == 0 ? (
              <p style={{ paddingTop: 10, fontSize: 14, marginLeft: 20 }}>
                {context.none}
              </p>
            ) : (
              <div className={styles.detailDependenceTable}>
                <Table
                  size="middle"
                  columns={[
                    {
                      title: context.serviceInstance,
                      key: "instance_name",
                      dataIndex: "instance_name",
                      align: "center",
                    },
                    {
                      title: context.ip,
                      key: "host_ip",
                      dataIndex: "host_ip",
                      align: "center",
                    },
                    {
                      title: context.port,
                      key: "service_port",
                      dataIndex: "service_port",
                      align: "center",
                      render: (text) => {
                        if (text.length === 0) {
                          return "-";
                        }
                        return text.map((i) => i.default).join(", ");
                      },
                    },
                    {
                      title: context.version,
                      key: "app_version",
                      dataIndex: "app_version",
                      align: "center",
                    },
                    {
                      title: context.clusterMode,
                      key: "mode",
                      dataIndex: "mode",
                      align: "center",
                      render: (text) =>
                        text === "单实例" ? context.single : context.cluster,
                    },
                    {
                      title: context.created,
                      key: "created",
                      dataIndex: "created",
                      align: "center",
                      render: (text) => {
                        return moment(text).format("YYYY-MM-DD HH:mm:ss");
                      },
                    },
                  ]}
                  dataSource={tableData}
                />
              </div>
            )}
          </div>
        ) : (
          <div className={styles.detailDependence}>
            <div>
              {context.serviceInstance}
              <span style={{ paddingLeft: 20, fontSize: 14, color: "#1f8aee" }}>
                {isAll ? (
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setIsAll(false);
                    }}
                  >
                    {context.current + context.ln + context.version}
                  </span>
                ) : (
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setIsAll(true);
                    }}
                  >
                    {context.all + context.ln + context.version}
                  </span>
                )}
              </span>
            </div>
            {tableData && tableData.length == 0 ? (
              <p style={{ paddingTop: 10, fontSize: 14, marginLeft: 20 }}>
                {context.none}
              </p>
            ) : (
              <div className={styles.detailDependenceTable}>
                <Table
                  size="middle"
                  columns={[
                    {
                      title: context.serviceInstance,
                      key: "instance_name",
                      dataIndex: "instance_name",
                      align: "center",
                    },
                    {
                      title: context.version,
                      key: "version",
                      dataIndex: "version",
                      align: "center",
                    },
                    {
                      title: context.service + context.ln + context.name,
                      key: "app_name",
                      dataIndex: "app_name",
                      align: "center",
                    },
                    {
                      title: context.version,
                      key: "app_version",
                      dataIndex: "app_version",
                      align: "center",
                    },
                    {
                      title: context.ip,
                      key: "host_ip",
                      dataIndex: "host_ip",
                      align: "center",
                    },
                    {
                      title: context.port,
                      key: "service_port",
                      dataIndex: "service_port",
                      align: "center",
                      render: (text) => {
                        if (text.length === 0) {
                          return "-";
                        }
                        return text.map((i) => i.default).join(",");
                      },
                    },
                    {
                      title: context.created,
                      key: "created",
                      dataIndex: "created",
                      align: "center",
                      render: (text) => {
                        return moment(text).format("YYYY-MM-DD HH:mm:ss");
                      },
                    },
                  ]}
                  dataSource={tableData}
                />
              </div>
            )}
          </div>
        )}
      </Spin>
    </div>
  );
};

export default AppStoreDetail;
