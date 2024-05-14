import "./index.css";
import {
  columnsConfig,
  formatTableRenderData,
  host_port_connectivity_columns,
  kafka_offsets_columns,
  kafka_partition_columns,
  kafka_topic_size_columns,
  handleResponse,
  downloadFile,
} from "@/utils/utils";
import { Card, Collapse, message, Table, Drawer } from "antd";
import * as R from "ramda";
import { useEffect, useState } from "react";
//import data from "./data.json";
import { useHistory, useLocation } from "react-router-dom";
import { locales } from "@/config/locales";
import { fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
const { Panel } = Collapse;

const PatrolInspectionDetail = ({ locale }) => {
  const location = useLocation();
  const history = useHistory();

  // /const data = localStorage.getItem("recordDetailData");

  let arr = location.pathname.split("/");
  const id = arr[arr.length - 1];
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerText, setDrawerText] = useState("");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  // 是否为主机巡检
  const [isHost, setIsHost] = useState(false);
  const context = locales[locale].common;
  const title = context.inspection + context.ln + context.report;

  const reportColumnConfig = [
    {
      ...columnsConfig.report_service_name,
      className: "_bigfontSize",
      title: context.service + context.ln + context.name,
    },
    {
      ...columnsConfig.report_host_ip,
      className: "_bigfontSize",
      title: context.ip,
    },
    {
      ...columnsConfig.report_service_port,
      className: "_bigfontSize",
      title: context.port,
    },
    {
      ...columnsConfig.report_service_status,
      className: "_bigfontSize",
      title: context.status,
    },
    {
      ...columnsConfig.report_cpu_usage,
      className: "_bigfontSize",
      title: context.cpu,
    },
    {
      ...columnsConfig.report_mem_usage,
      className: "_bigfontSize",
      title: context.memory,
    },
    {
      ...columnsConfig.report_run_time,
      className: "_bigfontSize",
      title: context.runtime,
      render: (text) => {
        if (text === "" || text === null || text === undefined) {
          return "-";
        }
        return text
          .replace("秒", context.s)
          .replace("分钟", context.m)
          .replace("小时", context.h)
          .replace("天", context.d);
      },
    },
    // {
    //   ...columnsConfig.report_log_level,
    //   className: "_bigfontSize",
    //   title: context.level,
    // },
    // { ...columnsConfig.report_cluster_name, className: styles._bigfontSize },
  ];

  const fetchDetailData = (id) => {
    setLoading(true);
    fetchGet(`${apiRequest.inspection.reportDetail}/${id}/`)
      .then((res) => {
        handleResponse(res, (res) => {
          setData(res.data);

          // 通过文件名判断是否为主机巡检
          if (res.data.file_name.indexOf("host") === 0) {
            setIsHost(true);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDetailData(id);
  }, []);

  if (!data) {
    return <div>{context.noData}</div>;
  }

  return (
    <div id="reportContent" className={"reportContent"}>
      <div className={"reportTitle"}>
        {/* -- 巡检报告标题 -- */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {title}
        </div>

        {/* -- 返回/下载 -- */}
        <div>
          <div
            className={"goBackElement"}
            id={"invisible"}
            style={{ paddingRight: 10 }}
            onClick={() =>
              history.push("/status-patrol/patrol-inspection-record")
            }
          >
            {context.back}
          </div>
          <div
            id={"invisible"}
            onClick={() => {
              message.success(
                context.download + context.ln + context.succeeded
              );
              // download();
              downloadFile(`/download-inspection/${data.file_name}`);
            }}
          >
            {context.export}
          </div>
        </div>
      </div>

      <div>
        <Collapse
          bordered={false}
          defaultActiveKey={[
            "overview",
            "risk",
            "map",
            "host",
            "database",
            "component",
            "service",
          ]}
          style={{ marginTop: 10 }}
        >
          {/* -- 基本信息 -- */}
          <Panel
            header={context.basic + context.ln + context.info}
            key="overview"
            className={"panelItem"}
          >
            <div className={"overviewItemWrapper"}>
              <OverviewItem
                data={data.summary?.task_info}
                type={"task_info"}
                context={context}
              />
              <OverviewItem
                data={data.summary?.time_info}
                type={"time_info"}
                context={context}
              />
              <OverviewItem
                data={data.summary?.scan_info}
                type={"scan_info"}
                isHost={isHost}
                context={context}
              />
              <OverviewItem
                data={data.summary?.scan_result}
                type={"scan_result"}
                context={context}
              />
            </div>
          </Panel>

          {/* -- 异常指标 -- */}
          {data.risks &&
            (!R.isEmpty(data.risks.host_list) ||
              !R.isEmpty(data.risks.service_list)) && (
              <Panel
                header={context.exception + context.ln + context.indicator}
                key="risk"
                className={"panelItem"}
              >
                {/* -- 主机异常 -- */}
                {data.risks.host_list.length > 0 && (
                  <Table
                    style={{ marginTop: 20 }}
                    bordered={true}
                    size={"small"}
                    pagination={false}
                    rowKey={(record, index) => record.id}
                    columns={[
                      {
                        ...columnsConfig.report_idx,
                        className: "_bigfontSize",
                        title: context.row,
                      },
                      {
                        ...columnsConfig.report_host_ip,
                        className: "_bigfontSize",
                        title: context.ip,
                      },
                      {
                        ...columnsConfig.report_system,
                        className: "_bigfontSize",
                        title: context.system,
                      },
                      {
                        ...columnsConfig.report_risk_level,
                        className: "_bigfontSize",
                        title: context.level,
                      },
                      {
                        ...columnsConfig.report_risk_describe,
                        className: "_bigfontSize",
                        title: context.description,
                        render: (text) => {
                          return (
                            <span
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                setDrawerText(text);
                                setDrawerVisible(true);
                              }}
                            >
                              {text}
                            </span>
                          );
                        },
                      },
                      {
                        ...columnsConfig.report_resolve_info,
                        title: context.solution,
                        className: "_bigfontSize",
                      },
                    ]}
                    title={() => context.host + context.ln + context.indicator}
                    dataSource={data.risks.host_list}
                  />
                )}

                {/* -- 服务异常 -- */}
                {data.risks.service_list.length > 0 && (
                  <Table
                    bordered={true}
                    style={{ marginTop: 20 }}
                    size={"small"}
                    pagination={false}
                    rowKey={(record, index) => record.id}
                    columns={[
                      {
                        ...columnsConfig.report_idx,
                        className: "_bigfontSize",
                        title: context.row,
                      },
                      {
                        ...columnsConfig.report_service_name,
                        className: "_bigfontSize",
                        title: context.service + context.ln + context.name,
                      },
                      {
                        ...columnsConfig.report_host_ip,
                        className: "_bigfontSize",
                        title: context.ip,
                      },
                      {
                        ...columnsConfig.report_service_port,
                        className: "_bigfontSize",
                        title: context.port,
                      },
                      {
                        ...columnsConfig.report_risk_level,
                        className: "_bigfontSize",
                        title: context.level,
                      },
                      {
                        ...columnsConfig.report_risk_describe,
                        className: "_bigfontSize",
                        title: context.description,
                        render: (text) => {
                          return (
                            <span
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                console.log(text);
                                setDrawerText(text);
                                setDrawerVisible(true);
                              }}
                            >
                              {text}
                            </span>
                          );
                        },
                      },
                      {
                        ...columnsConfig.report_resolve_info,
                        className: "_bigfontSize",
                        title: context.solution,
                      },
                    ]}
                    title={() =>
                      context.service + context.ln + context.indicator
                    }
                    dataSource={data.risks.service_list}
                  />
                )}
              </Panel>
            )}

          {/* -- 服务状态概览 -- */}
          {!R.either(R.isNil, R.isEmpty)(data?.service_topology) && (
            <Panel
              header={context.service + context.ln + context.statusOverview}
              key="map"
              className={"panelItem"}
            >
              <div
                style={{ display: "flex", flexFlow: "row wrap", margin: 10 }}
              >
                {R.addIndex(R.map)((item, index) => {
                  return (
                    <PlanChart
                      key={index}
                      title={item?.host_ip}
                      list={item?.service_list}
                      data={data}
                    />
                  );
                }, data?.service_topology)}
              </div>
            </Panel>
          )}

          {/* -- 主机列表 -- */}
          {!R.either(R.isNil, R.isEmpty)(data.detail_dict?.host) && (
            <Panel
              header={context.host + context.ln + context.list}
              key="host"
              className={"panelItem"}
            >
              <Table
                bordered={true}
                size={"small"}
                style={{ marginTop: 20 }}
                scroll={{ x: 1100 }}
                pagination={false}
                rowKey={(record, index) => record.id}
                columns={[
                  {
                    ...columnsConfig.report_idx,
                    className: "_bigfontSize",
                    title: context.row,
                  },
                  {
                    ...columnsConfig.report_host_ip,
                    className: "_bigfontSize",
                    title: context.ip,
                  },
                  {
                    ...columnsConfig.report_release_version,
                    className: "_bigfontSize",
                    title: context.version,
                  },
                  {
                    ...columnsConfig.report_host_massage,
                    className: "_bigfontSize",
                    title: context.message,
                  },
                  {
                    ...columnsConfig.report_cpu_usage,
                    className: "_bigfontSize",
                    title: context.cpu,
                  },
                  {
                    ...columnsConfig.report_mem_usage,
                    className: "_bigfontSize",
                    title: context.memory,
                  },
                  {
                    ...columnsConfig.report_disk_usage_root,
                    className: "_bigfontSize",
                    title: context.rootFolder,
                  },
                  {
                    ...columnsConfig.report_disk_usage_data,
                    className: "_bigfontSize",
                    title: context.dataFolder,
                  },
                  {
                    ...columnsConfig.report_run_time,
                    className: "_bigfontSize",
                    title: context.runtime,
                    render: (text) => {
                      if (text === "" || text === null || text === undefined) {
                        return "-";
                      }
                      return text
                        .replace("秒", context.s)
                        .replace("分钟", context.m)
                        .replace("小时", context.h)
                        .replace("天", context.d);
                    },
                  },
                  {
                    ...columnsConfig.report_sys_load,
                    className: "_bigfontSize",
                    title: context.systemLoad,
                  },
                ]}
                expandedRowRender={(...arg) => {
                  arg[0].basic = arg[0].basic.filter(
                    (item) => item.name !== "cluster_ip"
                  );
                  return RenderExpandedContent(
                    ...arg,
                    drawerVisible,
                    setDrawerVisible,
                    drawerText,
                    setDrawerText,
                    context,
                    locale
                  );
                }}
                // onExpand={(expanded, record) => {
                //   //console.log([...expandKey, record.id]);
                //   setExpandKey([...expandKey, record.id]);
                //   //console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
                // }}
                dataSource={data.detail_dict.host}
              />
            </Panel>
          )}

          {/* -- 数据库列表 -- */}
          {!R.either(R.isNil, R.isEmpty)(data.detail_dict?.database) && (
            <Panel
              header={context.database + context.ln + context.list}
              key="database"
              className={"panelItem"}
            >
              <Table
                size={"small"}
                bordered={true}
                style={{ marginTop: 20 }}
                pagination={false}
                rowKey={(record, index) => record.id}
                // defaultExpandAllRows
                columns={reportColumnConfig}
                expandedRowRender={(...arg) => {
                  arg[0].basic = arg[0].basic.filter(
                    (item) => item.name !== "cluster_ip"
                  );
                  RenderExpandedContent(
                    ...arg,
                    drawerVisible,
                    setDrawerVisible,
                    drawerText,
                    setDrawerText,
                    context,
                    locale
                  );
                }}
                dataSource={data.detail_dict.database}
              />
            </Panel>
          )}

          {!R.either(R.isNil, R.isEmpty)(data.detail_dict?.component) && (
            <Panel
              header={context.component + context.ln + context.list}
              key="component"
              className={"panelItem"}
            >
              <Table
                size={"small"}
                bordered={true}
                style={{ marginTop: 20 }}
                pagination={false}
                rowKey={(record, index) => record.id}
                // defaultExpandAllRows
                columns={reportColumnConfig}
                expandedRowRender={(...arg) => {
                  arg[0].basic = arg[0].basic.filter(
                    (item) => item.name !== "cluster_ip"
                  );
                  return RenderExpandedContent(
                    ...arg,
                    drawerVisible,
                    setDrawerVisible,
                    drawerText,
                    setDrawerText,
                    context,
                    locale
                  );
                }}
                dataSource={data.detail_dict.component}
              />
            </Panel>
          )}

          {!R.either(R.isNil, R.isEmpty)(data.detail_dict?.service) && (
            <Panel
              header={context.service + context.ln + context.list}
              key="service"
              className={"panelItem"}
            >
              <Table
                size={"small"}
                bordered={true}
                style={{ marginTop: 20 }}
                pagination={false}
                rowKey={(record, index) => record.id}
                columns={reportColumnConfig}
                expandedRowRender={(...arg) => {
                  arg[0].basic = arg[0].basic.filter(
                    (item) => item.name !== "cluster_ip"
                  );
                  return RenderExpandedContent(
                    ...arg,
                    drawerVisible,
                    setDrawerVisible,
                    drawerText,
                    setDrawerText,
                    context,
                    locale
                  );
                }}
                dataSource={data.detail_dict.service}
              />
            </Panel>
          )}
        </Collapse>
      </div>
      <Drawer
        title={context.process + context.ln + context.log}
        placement="right"
        closable={false}
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        width={720}
        destroyOnClose
      >
        {drawerText}
      </Drawer>
    </div>
  );
};

export default PatrolInspectionDetail;

const formatTime = (text = 0, context) => {
  let duration = text;
  const second = Math.round(Number(text)),
    days = Math.floor(second / 86400),
    hours = Math.floor((second % 86400) / 3600),
    minutes = Math.floor(((second % 86400) % 3600) / 60),
    seconds = Math.floor(((second % 86400) % 3600) % 60);

  if (days > 0) {
    duration =
      days +
      context.d +
      hours +
      context.h +
      minutes +
      context.m +
      seconds +
      context.s;
  } else if (hours > 0) {
    duration = hours + context.h + minutes + context.m + seconds + context.s;
  } else if (minutes > 0) {
    duration = minutes + context.m + seconds + context.s;
  } else if (seconds > 0) {
    duration = seconds + context.s;
  }

  return duration;
};

// 概览信息
const OverviewItem = ({ data, type, isHost = false, context }) => {
  switch (type) {
    case "task_info":
      return (
        <div className={"overviewItem"}>
          <div>{context.task + context.ln + context.info}</div>
          <div>
            <div>
              {context.name + " : "}
              {data?.task_name
                .replace("深度巡检", context.deep)
                .replace("主机巡检", context.host)
                .replace("组件巡检", context.component)}
            </div>
            <div>
              {context.operator + " : "}
              {data?.operator}
            </div>
            <div>
              {context.status + " : "}
              {data?.task_status === 2 ? context.succeeded : context.failed}
            </div>
          </div>
        </div>
      );
    case "time_info":
      return (
        <div className={"overviewItem"}>
          <div>{context.time + context.ln + context.info}</div>
          <div>
            <div>
              {context.beginTime + " : "}
              {data?.start_time}
            </div>
            <div>
              {context.endTime + " : "}
              {data?.end_time}
            </div>
            <div>
              {context.duration + " : "}
              {formatTime(data?.cost, context)}
            </div>
          </div>
        </div>
      );
    case "scan_info":
      return (
        <div className={"overviewItem"}>
          <div>{context.scan + context.ln + context.info}</div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div>
              {data?.host >= 0 && (
                <div>
                  {context.host + context.ln + context.total + " : "}
                  {data.host}
                  {context.tai}
                </div>
              )}
              {/* {data?.component >= 0 && <div>组件个数：{data.component}个</div>} */}
              {data?.service >= 0 && (
                <div>
                  {context.service + context.ln + context.total + " : "}
                  {data.service}
                  {context.ge}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    case "scan_result":
      return (
        <div className={"overviewItem"}>
          <div>{context.result}</div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div>
              <div>
                {context.indicator + context.ln + context.total + " : "}
                {data?.all_target_num}
              </div>
              <div>
                {context.exception + context.ln + context.total + " : "}
                {data?.abnormal_target}
              </div>
              {/* <div>健康度：{data.healthy}</div> */}
            </div>
          </div>
        </div>
      );
  }
};

//平面图
const PlanChart = ({ title, list, data }) => {
  return (
    <div className={"planChartWrapper"}>
      <div className={"planChartTitle"}>
        <span className={"planChartTitleCircular"} />
        {title}
      </div>
      <div className={"planChartBlockWrapper"}>
        {list?.map((item) => {
          return (
            <div className={"stateButton"} key={item}>
              <div>{item}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Table渲染的子项
// 注：此处需要针对特殊属性渲染额外效果，故将已在table渲染过的属性单独拿出来
const RenderExpandedContent = (
  {
    basic,
    host_ip,
    service_status,
    run_time,
    log_level,
    mem_usage,
    cpu_usage,
    service_name,
    service_port,
    cluster_name,
    release_version,
    host_massage,
    disk_usage_root,
    disk_usage_data,
    sys_load,
    ...specialProps
  },
  ...arg
) => {
  let [
    drawerVisible,
    setDrawerVisible,
    drawerText,
    setDrawerText,
    context,
    locale,
  ] = arg.slice(-6);

  const formattedData = Object.entries(specialProps).filter((item) =>
    Array.isArray(item[1])
  );

  let deal_host_memory_top_columns = [
    {
      title: "TOP",
      dataIndex: "TOP",
      //ellipsis: true,
      width: 50,
      className: "_bigfontSize",
    },
    {
      title: "PID",
      dataIndex: "PID",
      //ellipsis: true,
      align: "center",
      width: 100,
      className: "_bigfontSize",
    },
    {
      title: context.usage,
      dataIndex: "P_RATE",
      //ellipsis: true,
      align: "center",
      width: 100,
      className: "_bigfontSize",
    },
    {
      title: context.process,
      dataIndex: "P_CMD",
      ellipsis: true,
      className: "_bigfontSize",
      render: (text) => {
        return (
          <span
            style={{ cursor: "pointer" }}
            onClick={() => {
              setDrawerText(text);
              setDrawerVisible(true);
            }}
          >
            {text}
          </span>
        );
      },
    },
  ];

  const contentMap = {
    // 主机列表
    port_connectivity: {
      columns: host_port_connectivity_columns,
      dataSource: specialProps.port_connectivity,
      title: context.portconnectivity,
    },
    memory_top: {
      columns: deal_host_memory_top_columns,
      dataSource: specialProps.memory_top,
      title: context.memory + context.ln + context.usage + " TOP 10",
    },
    cpu_top: {
      columns: deal_host_memory_top_columns,
      dataSource: specialProps.cpu_top,
      title: context.cpu + context.ln + context.usage + " TOP 10",
    },
    kernel_parameters: {
      columns: [],
      dataSource: specialProps.kernel_parameters,
      title: context.kernel + context.ln + context.param,
    },
    //  服务列表
    topic_partition: {
      columns: kafka_partition_columns,
      dataSource: specialProps.topic_partition,
      title: context.partition + context.ln + context.info,
    },
    kafka_offsets: {
      columns: kafka_offsets_columns,
      dataSource: specialProps.kafka_offsets,
      title: context.consumerDisplacement,
    },
    topic_size: {
      columns: kafka_topic_size_columns,
      dataSource: specialProps.topic_size,
      title: "Topic " + context.size,
    },
  };

  return (
    <div className={"expandedRowWrapper"}>
      {Array.isArray(basic) && <BasicCard basic={basic} locale={locale} />}
      {formattedData.length > 0 && (
        <Collapse
          defaultActiveKey={R.keys(specialProps)}
          style={{ marginTop: 10 }}
        >
          {formattedData.map((item, idx) => {
            // 根据当前渲染项，找到对应的content配置数据
            const currentContent = contentMap[item[0]];

            // 只取目前已经配置了的数据
            if (!R.isNil(currentContent)) {
              return (
                <Panel header={currentContent.title} key={item[0]}>
                  {currentContent.columns.length > 0 ? (
                    <Table
                      bordered={true}
                      rowKey={(record, index) => record.id}
                      size={"small"}
                      columns={currentContent.columns}
                      dataSource={currentContent.dataSource}
                      pagination={false}
                    />
                  ) : (
                    <div className={"basicCardWrapper"}>
                      {currentContent.dataSource.map((item, idx) => {
                        return (
                          <div key={idx} className={"basicCardItem"}>
                            {item}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
              );
            } else {
              //   todo 其他数据项
              console.log(context.noData, item);
            }
          })}
        </Collapse>
      )}
      <Drawer
        title={context.process + context.ln + context.log}
        placement="right"
        closable={false}
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        width={720}
        destroyOnClose
      >
        {drawerText}
      </Drawer>
    </div>
  );
};

// 卡片面板
const BasicCard = ({ basic, locale }) => {
  return (
    <Card>
      <div className={"basicCardWrapper"}>
        {basic.map((item, idx) => (
          <div key={idx} className={"basicCardItem"}>
            <span style={{ color: "#333" }}>
              {locale === "zh-CN" ? item.name_cn : item.name}:{" "}
            </span>
            <span>{formatTableRenderData(JSON.stringify(item.value))}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
