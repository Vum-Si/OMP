import { apiRequest } from "@/config/requestApi";
import { fetchGet } from "@/utils/request";
import { handleResponse } from "@/utils/utils";
import { Spin } from "antd";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import styles from "./index.module.less";
import OmpStateBlock from "@/components/OmpStateBlock";
import { OmpProgress, OmpContentWrapper } from "@/components";
import ExceptionList from "./warningList";
import { locales } from "@/config/locales";

const calcPercentage = (normal = 0, total = 1) => {
  const percent = ((normal / total) * 100).toFixed(0);
  return isNaN(Number(percent)) ? 100 : Number(percent);
};

const Homepage = ({ locale }) => {
  const history = useHistory();
  const [isLoading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState({});
  const context = locales[locale].common;

  // data数据源，key聚合数据的唯一值
  const dataAggregation = (data, key) => {
    let arr = [];
    data?.map((i, d) => {
      let isExistenceArr = arr.filter((e) => e[key] == i[key]);
      if (isExistenceArr.length == 0) {
        arr.push({
          [key]: i[key],
          severity: i.severity,
          info: [
            {
              ...i,
            },
          ],
        });
      } else {
        let m = data[d];
        let idx = arr.indexOf(isExistenceArr[0]);
        arr[idx] = {
          [key]: i[key],
          severity: i.severity,
          info: [
            ...arr[idx].info,
            {
              ...m,
            },
          ],
        };
      }
    });
    return arr;
  };

  const queryData = () => {
    setLoading(true);
    fetchGet(apiRequest.homepage.instrumentPanel)
      .then((res) => {
        handleResponse(res, (res) => {
          setDataSource(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    queryData();
  }, []);

  return (
    <OmpContentWrapper
      wrapperStyle={{
        width: "100%",
        height: "calc(100% - 40px)",
        backgroundColor: "#edf0f3",
        padding: 0,
      }}
    >
      <div className={styles.homepageWrapper}>
        <Spin spinning={isLoading}>
          {/* -- 状态概览 -- */}
          <div
            className={styles.pageBlock}
            style={{
              borderRadius: 4,
              marginBottom: "15px",
              backgroundColor: "white",
            }}
          >
            <div className={styles.blockTitle}>{context.statusOverview}</div>
            <div
              style={{
                display: "flex",
                flexFlow: "row wrap",
                justifyContent: "space-around",
              }}
              className={styles.blockContent}
            >
              {/* -- 服务实例 -- */}
              <div className={styles.blockOverviewItem}>
                <OmpProgress
                  percent={calcPercentage(
                    dataSource.service?.service_info_all_count -
                      dataSource.service?.service_info_exc_count -
                      dataSource.service?.service_info_no_monitor_count,
                    dataSource.service?.service_info_all_count
                  )}
                  trafficWay={[
                    {
                      name: "异常",
                      value: dataSource.service?.service_info_exc_count,
                    },
                    {
                      name: "未监控",
                      value: dataSource.service?.service_info_no_monitor_count,
                    },
                    {
                      name: "正常",
                      value:
                        dataSource.service?.service_info_all_count -
                        dataSource.service?.service_info_exc_count -
                        dataSource.service?.service_info_no_monitor_count,
                    },
                  ]}
                />
                <div className={styles.progressInfo}>
                  <div>{context.serviceInstance}</div>
                  <div
                    onClick={() =>
                      dataSource.service?.service_info_all_count &&
                      history.push({
                        pathname: "/application_management/service_management",
                        state: {
                          app_type: "1",
                        },
                      })
                    }
                    style={
                      dataSource.service?.service_info_all_count
                        ? { cursor: "pointer", marginBottom: 2 }
                        : { marginBottom: 2 }
                    }
                  >
                    {context.total}:{" "}
                    <span
                      style={
                        dataSource.service?.service_info_all_count
                          ? { color: "#1890ff" }
                          : {}
                      }
                    >
                      {dataSource.service?.service_info_all_count}
                      {context.ge}
                    </span>
                  </div>
                  <div
                    style={
                      dataSource.service?.service_info_exc_count > 0
                        ? { cursor: "pointer", paddingTop: 10 }
                        : { paddingTop: 10 }
                    }
                    onClick={() =>
                      dataSource.service?.service_info_exc_count &&
                      history.push({
                        pathname: "/application-monitoring/exception-list",
                        state: {
                          type: "service",
                        },
                      })
                    }
                  >
                    {context.exception}:{" "}
                    <span
                      style={
                        dataSource.service?.service_info_exc_count > 0
                          ? { color: "#cf1322" }
                          : {}
                      }
                    >
                      {dataSource.service?.service_info_exc_count}
                      {context.ge}
                    </span>
                  </div>
                </div>
              </div>

              {/* -- 基础组件 -- */}
              <div className={styles.blockOverviewItem}>
                <OmpProgress
                  percent={calcPercentage(
                    dataSource.component?.component_info_all_count -
                      dataSource.component?.component_info_exc_count -
                      dataSource.component?.component_info_no_monitor_count,
                    dataSource.component?.component_info_all_count
                  )}
                  trafficWay={[
                    {
                      name: "异常",
                      value: dataSource.component?.component_info_exc_count,
                    },
                    {
                      name: "未监控",
                      value:
                        dataSource.component?.component_info_no_monitor_count,
                    },
                    {
                      name: "正常",
                      value:
                        dataSource.component?.component_info_all_count -
                        dataSource.component?.component_info_exc_count -
                        dataSource.component?.component_info_no_monitor_count,
                    },
                  ]}
                />
                <div className={styles.progressInfo}>
                  <div>{context.component}</div>
                  <div
                    onClick={() =>
                      dataSource.component?.component_info_all_count &&
                      history.push({
                        pathname: "/application_management/service_management",
                        state: {
                          app_type: "0",
                        },
                      })
                    }
                    style={
                      dataSource.component?.component_info_all_count
                        ? { cursor: "pointer", marginBottom: 2 }
                        : { marginBottom: 2 }
                    }
                  >
                    {context.total}:{" "}
                    <span
                      style={
                        dataSource.component?.component_info_all_count
                          ? { color: "#1890ff" }
                          : {}
                      }
                    >
                      {dataSource.component?.component_info_all_count}
                      {context.ge}
                    </span>
                  </div>
                  <div
                    style={
                      dataSource.component?.component_info_exc_count > 0
                        ? { cursor: "pointer", paddingTop: 10 }
                        : { paddingTop: 10 }
                    }
                    onClick={() =>
                      dataSource.component?.component_info_exc_count &&
                      history.push({
                        pathname: "/application-monitoring/exception-list",
                        state: {
                          type: "component",
                        },
                      })
                    }
                  >
                    {context.exception}:{" "}
                    <span
                      style={
                        dataSource.component?.component_info_exc_count > 0
                          ? { color: "#cf1322" }
                          : {}
                      }
                    >
                      {dataSource.component?.component_info_exc_count}
                      {context.ge}
                    </span>
                  </div>
                </div>
              </div>

              {/* -- 数据库 -- */}
              <div className={styles.blockOverviewItem}>
                <OmpProgress
                  percent={calcPercentage(
                    dataSource.database?.database_info_all_count -
                      dataSource.database?.database_info_exc_count -
                      dataSource.database?.database_info_no_monitor_count,
                    dataSource.database?.database_info_all_count
                  )}
                  trafficWay={[
                    {
                      name: "异常",
                      value: dataSource.database?.database_info_exc_count,
                    },
                    {
                      name: "未监控",
                      value:
                        dataSource.database?.database_info_no_monitor_count,
                    },
                    {
                      name: "正常",
                      value:
                        dataSource.database?.database_info_all_count -
                        dataSource.database?.database_info_exc_count -
                        dataSource.database?.database_info_no_monitor_count,
                    },
                  ]}
                />
                <div className={styles.progressInfo}>
                  <div>{context.database}</div>
                  <div
                    onClick={() =>
                      dataSource.database?.database_info_all_count &&
                      history.push({
                        pathname: "/application_management/service_management",
                        state: {
                          label_name: "数据库",
                        },
                      })
                    }
                    style={
                      dataSource.database?.database_info_all_count
                        ? { cursor: "pointer", marginBottom: 2 }
                        : { marginBottom: 2 }
                    }
                  >
                    {context.total}:{" "}
                    <span
                      style={
                        dataSource.database?.database_info_all_count > 0
                          ? { color: "#1890ff" }
                          : {}
                      }
                    >
                      {dataSource.database?.database_info_all_count}
                      {context.ge}
                    </span>
                  </div>
                  <div
                    style={
                      dataSource.database?.database_info_exc_count > 0
                        ? { cursor: "pointer", paddingTop: 10 }
                        : { paddingTop: 10 }
                    }
                    onClick={() =>
                      dataSource.database?.database_info_exc_count &&
                      history.push({
                        pathname: "/application-monitoring/exception-list",
                        state: {
                          type: "database",
                        },
                      })
                    }
                  >
                    {context.exception}:{" "}
                    <span
                      style={
                        dataSource.database?.database_info_exc_count > 0
                          ? { color: "#cf1322" }
                          : {}
                      }
                    >
                      {dataSource.database?.database_info_exc_count}
                      {context.ge}
                    </span>
                  </div>
                </div>
              </div>

              {/* -- 主机 -- */}
              <div className={styles.blockOverviewItem}>
                <OmpProgress
                  percent={calcPercentage(
                    dataSource.host?.host_info_all_count -
                      dataSource.host?.host_info_exc_count -
                      dataSource.host?.host_info_no_monitor_count,
                    dataSource.host?.host_info_all_count
                  )}
                  trafficWay={[
                    {
                      name: "异常",
                      value: dataSource.host?.host_info_exc_count,
                    },
                    {
                      name: "未监控",
                      value: dataSource.host?.host_info_no_monitor_count,
                    },
                    {
                      name: "正常",
                      value:
                        dataSource.host?.host_info_all_count -
                        dataSource.host?.host_info_exc_count -
                        dataSource.host?.host_info_no_monitor_count,
                    },
                  ]}
                />
                <div className={styles.progressInfo}>
                  <div>{context.host}</div>
                  <div
                    onClick={() =>
                      dataSource.host?.host_info_all_count &&
                      history.push({
                        pathname: "/resource-management/machine-management",
                      })
                    }
                    style={
                      dataSource.host?.host_info_all_count
                        ? { cursor: "pointer" }
                        : {}
                    }
                  >
                    {context.total}:{" "}
                    <span
                      style={
                        dataSource.host?.host_info_all_count
                          ? { color: "#1890ff" }
                          : {}
                      }
                    >
                      {dataSource.host?.host_info_all_count}
                      {context.ge}
                    </span>
                  </div>
                  <div
                    style={
                      dataSource.host?.host_info_exc_count > 0
                        ? { cursor: "pointer" }
                        : {}
                    }
                    onClick={() =>
                      dataSource.host?.host_info_exc_count &&
                      history.push({
                        pathname: "/application-monitoring/exception-list",
                        state: {
                          type: "host",
                        },
                      })
                    }
                  >
                    {context.exception}:{" "}
                    <span
                      style={
                        dataSource.host?.host_info_exc_count > 0
                          ? { color: "#cf1322" }
                          : {}
                      }
                    >
                      {dataSource.host?.host_info_exc_count}
                      {context.ge}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* -- 异常清单 -- */}
          <div
            style={{
              marginBottom: 10,
              backgroundColor: "#fff",
              paddingBottom: 0,
            }}
          >
            <p
              style={{
                padding: 10,
                paddingBottom: 0,
                paddingTop: 10,
                margin: 0,
                fontWeight: 500,
              }}
            >
              {context.exceptionList}
            </p>
            <ExceptionList context={context} />
          </div>

          {/* -- 服务实例 -- */}
          <div className={styles.pageBlock}>
            <OmpStateBlock
              locale={locale}
              title={context.serviceInstance}
              link={(data) => {
                history.push({
                  pathname: "/application_management/service_management",
                  state: {
                    ip: data?.info[0]?.ip,
                    app_type: "1",
                  },
                });
              }}
              criticalLink={(data) => {
                history.push({
                  pathname: "/application-monitoring/exception-list",
                  state: {
                    ip: data?.info[0]?.ip,
                    type: "service",
                  },
                });
              }}
              data={dataAggregation(
                dataSource.service?.service_info_list,
                "instance_name"
              )}
            />
          </div>

          {/* -- 基础组件 -- */}
          <div className={styles.pageBlock}>
            <OmpStateBlock
              locale={locale}
              title={context.component}
              link={(data) => {
                history.push({
                  pathname: "/application_management/service_management",
                  state: {
                    ip: data?.info[0]?.ip,
                    app_type: "0",
                  },
                });
              }}
              criticalLink={(data) => {
                history.push({
                  pathname: "/application-monitoring/exception-list",
                  state: {
                    instance_name: data?.info[0]?.instance_name,
                    type: "component",
                  },
                });
              }}
              data={dataAggregation(
                dataSource.component?.component_info_list,
                "instance_name"
              )}
            />
          </div>

          {/* -- 数据库 -- */}
          <div className={styles.pageBlock}>
            <OmpStateBlock
              locale={locale}
              title={context.database}
              link={(data) => {
                history.push({
                  pathname: "/application_management/service_management",
                  state: {
                    ip: data?.info[0]?.ip,
                    label_name: "数据库",
                  },
                });
              }}
              criticalLink={(data) => {
                history.push({
                  pathname: "/application-monitoring/exception-list",
                  state: {
                    instance_name: data?.info[0]?.instance_name,
                    type: "database",
                  },
                });
              }}
              data={dataAggregation(
                dataSource.database?.database_info_list,
                "instance_name"
              )}
            />
          </div>

          {/* -- 主机 -- */}
          <div className={styles.pageBlock}>
            <OmpStateBlock
              locale={locale}
              title={context.host}
              link={(data) => {
                history.push({
                  pathname: "/resource-management/machine-management",
                  state: {
                    ip: data?.info[0]?.ip,
                  },
                });
              }}
              criticalLink={(data) => {
                history.push({
                  pathname: "/application-monitoring/exception-list",
                  state: {
                    ip: data?.info[0]?.ip,
                    type: "host",
                  },
                });
              }}
              data={dataAggregation(dataSource.host?.host_info_list, "ip")}
            />
          </div>
        </Spin>
      </div>
    </OmpContentWrapper>
  );
};

export default React.memo(Homepage);
