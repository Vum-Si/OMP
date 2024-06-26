import { Button, Anchor, Spin, Progress } from "antd";
import { useSelector } from "react-redux";
import InstallInfoItem from "../component/InstallInfoItem";
import { useEffect, useRef, useState } from "react";
import { LoadingOutlined } from "@ant-design/icons";
import { apiRequest } from "@/config/requestApi";
import { fetchGet } from "@/utils/request";
import { handleResponse } from "@/utils/utils";
import { useHistory, useLocation } from "react-router-dom";
import { fetchPost } from "src/utils/request";
import { logCreate } from "../component/logUtil";

const { Link } = Anchor;

const Step5 = ({ context, locale }) => {
  const renderStatus = {
    0: context.waiting,
    1: context.installing,
    2: context.succeeded,
    3: context.installFailed,
    4: context.registering,
  };
  const history = useHistory();
  const viewHeight = useSelector((state) => state.layouts.viewSize.height);
  const viewWidth = useSelector((state) => state.layouts.viewSize.width);
  const [openName, setOpenName] = useState("");
  // 在轮训时使用ref存值
  const openNameRef = useRef(null);
  const location = useLocation();
  const defaultUniqueKey = location.state?.uniqueKey;
  const uniqueKey = useSelector((state) => state.appStore.uniqueKey);
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState(false);
  // 轮训控制器
  const hostAgentTimer = useRef(null);
  // start 按钮加载
  const [startLoading, setStartLoading] = useState(false);
  const [data, setData] = useState({
    detail: {},
    status: 0,
  });
  const [log, setLog] = useState("");
  // 轮训的timer控制器
  const timer = useRef(null);

  const queryInstallProcess = () => {
    !timer.current && setLoading(true);
    fetchGet(apiRequest.appStore.queryInstallProcess, {
      params: {
        unique_key: defaultUniqueKey || uniqueKey,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setData(res.data);
          if (
            res.data.status == 0 ||
            res.data.status == 1 ||
            res.data.status == 4
          ) {
            // 状态为未安装或者安装中
            if (openNameRef.current) {
              let arr = openNameRef.current.split("=");
              queryDetailInfo(defaultUniqueKey || uniqueKey, arr[1], arr[0]);
            }

            timer.current = setTimeout(() => {
              queryInstallProcess();
            }, 5000);
          } else {
            if (openNameRef.current) {
              let arr = openNameRef.current.split("=");
              queryDetailInfo(defaultUniqueKey || uniqueKey, arr[1], arr[0]);
            }
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 请求详细信息
  const queryDetailInfo = (uniqueKey, ip, app_name) => {
    fetchGet(apiRequest.appStore.showSingleServiceInstallLog, {
      params: {
        unique_key: uniqueKey,
        app_name: app_name,
        ip: ip,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (locale === "zh-CN") {
            setLog(res.data.log);
          } else {
            setLog(logCreate(app_name, res.data.log, context));
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  const retryInstall = () => {
    setRetryLoading(true);
    setOpenName("");
    openNameRef.current = "";
    fetchPost(apiRequest.appStore.retryInstall, {
      body: {
        unique_key: defaultUniqueKey || uniqueKey,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            queryInstallProcess();
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setRetryLoading(false);
      });
  };

  // 查询主机 agent 状态
  const queryHostAgent = () => {
    // 构造 ip 集合
    let ipSet = new Set();
    Object.keys(data.detail).map((key, idx) => {
      data.detail[key].forEach((e) => {
        if (e.ip !== "postAction") {
          ipSet.add(e.ip);
        }
      });
    });
    fetchPost(apiRequest.machineManagement.hostsAgentStatus, {
      body: {
        ip_list: Array.from(ipSet),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0 && res.data) {
            // 调用安装
            retryInstall();
            // 清除定时器
            clearInterval(hostAgentTimer.current);
            setStartLoading(false);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {});
  };

  // 开始安装
  const startInstall = () => {
    setStartLoading(true);
    hostAgentTimer.current = setInterval(() => {
      queryHostAgent();
    }, 1000);
  };

  useEffect(() => {
    queryInstallProcess();
    return () => {
      // 页面销毁时清除延时器
      clearTimeout(timer.current);
      clearInterval(hostAgentTimer.current);
    };
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          paddingTop: 20,
          width: viewWidth - 230,
        }}
      >
        {/* -- 左侧安装细节 -- */}
        <Spin spinning={loading}>
          <div
            id="Step4Wrapper"
            style={{
              flex: 1,
              height: viewHeight - 260,
              overflowY: "auto",
              width: viewWidth - 480,
            }}
          >
            <div>
              {Object.keys(data.detail).map((key, idx) => {
                return (
                  <InstallInfoItem
                    openName={openName}
                    setOpenName={(n) => {
                      setLog("");
                      if (n) {
                        let arr = n.split("=");
                        queryDetailInfo(
                          defaultUniqueKey || uniqueKey,
                          arr[1],
                          arr[0]
                        );
                      }
                      setOpenName(n);
                      openNameRef.current = n;
                    }}
                    id={`a${key}`}
                    key={key}
                    title={key}
                    data={data.detail[key]}
                    log={log}
                    idx={idx}
                    context={context}
                  />
                );
              })}
            </div>
          </div>
        </Spin>

        {/* -- 右侧安装状态 -- */}
        <div
          style={{
            //height: 300,
            width: 220,
            backgroundColor: "#fff",
            marginLeft: 20,
            paddingTop: 10,
          }}
        >
          <div style={{ paddingLeft: 5 }}>
            <Anchor
              affix={false}
              getContainer={() => {
                let con = document.getElementById("Step4Wrapper");
                return con;
              }}
              style={{
                height: viewHeight - 270,
                overflowY: "auto",
              }}
              onClick={(e) => e.preventDefault()}
            >
              {Object.keys(data.detail).map((key) => {
                let ingArr = 0;
                let successArr = 0;
                let errArr = 0;
                for (let i = 0; i < data.detail[key].length; i++) {
                  const element = data.detail[key][i];
                  switch (element.status) {
                    case 0:
                      break;
                    case 1:
                      ingArr += 1;
                      break;
                    case 2:
                      successArr += 1;
                      break;
                    case 3:
                      errArr += 1;
                      break;
                    default:
                      break;
                  }
                }
                let colorRes = "#f0c242";
                if (errArr !== 0) {
                  colorRes = "#da4e48";
                } else if (successArr === data.detail[key].length) {
                  colorRes = "rgb(118,204,104)";
                } else if (ingArr > 0) {
                  colorRes = "rgba(0, 0, 0, 0.85)";
                }
                return (
                  <div style={{ padding: 2 }}>
                    <Link
                      href={`#a${key}`}
                      title={
                        <span style={{ color: colorRes }}>
                          {" "}
                          {key === "初始化安装流程"
                            ? context.install + context.ln + context.init
                            : key === "安装后续任务"
                            ? context.post + context.ln + context.task
                            : key}
                        </span>
                      }
                    />
                  </div>
                );
              })}
            </Anchor>
          </div>
        </div>
      </div>

      {/* -- 底部进度条 -- */}
      <div
        style={{
          position: "fixed",
          backgroundColor: "#fff",
          width: "calc(100% - 230px)",
          bottom: 10,
          padding: "10px 0px",
          display: "flex",
          justifyContent: "space-between",
          paddingRight: 30,
          boxShadow: "0px 0px 10px #999999",
          alignItems: "center",
          borderRadius: 2,
        }}
      >
        <div style={{ paddingLeft: 20, display: "flex" }}>
          <div style={{ width: 100 }}>
            {renderStatus[data.status]}
            {(data.status == 0 || data.status == 1 || data.status == 4) && (
              <LoadingOutlined style={{ marginLeft: 10, fontWeight: 600 }} />
            )}
          </div>
        </div>
        <div style={{ width: "70%" }}>
          <Progress
            percent={data.percentage}
            status={data.status == 3 && "exception"}
          />
        </div>
        <div style={{ paddingLeft: 40 }}>
          {data.status == 0 && (
            <Button
              loading={startLoading}
              style={{ marginLeft: 4 }}
              type="primary"
              onClick={() => startInstall()}
            >
              {context.begin}
            </Button>
          )}
          {data.status == 3 && (
            <Button
              loading={retryLoading}
              style={{ marginLeft: 4 }}
              type="primary"
              //disabled={unassignedServices !== 0}
              onClick={() => retryInstall()}
            >
              {context.retry}
            </Button>
          )}

          <Button
            style={{ marginLeft: 4 }}
            type="primary"
            //disabled={unassignedServices !== 0}
            onClick={() => {
              history?.push("/application_management/install-record");
            }}
          >
            {context.ok}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step5;
