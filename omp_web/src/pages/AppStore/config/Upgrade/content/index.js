import { Button, Anchor, Spin, Progress } from "antd";
import { useSelector } from "react-redux";
import UpgradeInfoItem from "./component/UpgradeInfoItem";
import { useEffect, useRef, useState } from "react";
import { LoadingOutlined } from "@ant-design/icons";
import { apiRequest } from "@/config/requestApi";
import { fetchGet } from "@/utils/request";
import { handleResponse } from "@/utils/utils";
import { useHistory, useLocation } from "react-router-dom";
import { fetchPut } from "src/utils/request";
import ServiceRollbackModal from "../../ServiceRollbackModal";

const { Link } = Anchor;

const Content = ({ context, locale }) => {
  const renderStatus = {
    0: context.waiting,
    1: context.upgrading,
    2: context.succeeded,
    3: context.installFailed,
    4: context.registering,
  };
  const history = useHistory();
  const viewHeight = useSelector((state) => state.layouts.viewSize.height);
  // 在轮训时使用ref存值
  const openNameRef = useRef(null);
  const location = useLocation();
  if (!location?.state?.history) {
    history.push({
      pathname: "/application_management/install-record",
    });
  }
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState(false);
  const [data, setData] = useState({
    detail: {},
    upgrade_state: 0,
  });
  // 轮训的timer控制器
  const timer = useRef(null);
  const [vfModalVisibility, setVfModalVisibility] = useState(false);
  const [rowId, setRowId] = useState("");

  const queryUpgradeProcess = () => {
    !timer.current && setLoading(true);
    fetchGet(
      `${apiRequest.appStore.queryUpgradeProcess}/${location?.state?.history}`
    )
      .then((res) => {
        handleResponse(res, (res) => {
          setData(res.data);
          if (
            res.data.upgrade_state == 0 ||
            res.data.upgrade_state == 1 ||
            res.data.upgrade_state == 4
          ) {
            // 状态为未安装或者安装中
            timer.current = setTimeout(() => {
              queryUpgradeProcess();
            }, 5000);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  const retryUpgrade = () => {
    setRetryLoading(true);
    fetchPut(
      `${apiRequest.appStore.queryUpgradeProcess}/${location?.state?.history}/`
    )
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            queryUpgradeProcess();
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setRetryLoading(false);
      });
  };

  useEffect(() => {
    queryUpgradeProcess();
    return () => {
      // 页面销毁时清除延时器
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div>
      <div style={{ display: "flex", paddingTop: 20 }}>
        {/* -- 左侧升级细节 -- */}
        <Spin spinning={loading}>
          <div
            id="Step4Wrapper"
            style={{
              flex: 1,
              height: viewHeight - 270,
              overflowY: "auto",
            }}
          >
            <div>
              {data?.upgrade_detail?.map((item, idx) => {
                return (
                  <UpgradeInfoItem
                    id={`a${idx}`}
                    key={idx}
                    title={item.service_name}
                    data={item.upgrade_details}
                    idx={idx}
                    context={context}
                    locale={locale}
                  />
                );
              })}
            </div>
          </div>
        </Spin>

        {/* -- 右侧状态栏 -- */}
        <div
          style={{
            width: 200,
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
              onClick={(e) => e.preventDefault()}
              style={{
                height: viewHeight - 270,
                overflowY: "auto",
              }}
            >
              {data?.upgrade_detail?.map((item, idx) => {
                let ingArr = 0;
                let successArr = 0;
                let errArr = 0;
                for (let i = 0; i < item.upgrade_details.length; i++) {
                  const element = item.upgrade_details[i];
                  switch (element.upgrade_state) {
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
                } else if (successArr === item.upgrade_details.length) {
                  colorRes = "rgb(118,204,104)";
                } else if (ingArr > 0) {
                  colorRes = "rgba(0, 0, 0, 0.85)";
                }
                return (
                  <div style={{ padding: 5 }} key={idx}>
                    <Link
                      href={`#a${idx}`}
                      title={
                        <span style={{ color: colorRes }}>
                          {item.service_name === "升级前置操作"
                            ? context.pre + context.ln + context.task
                            : item.service_name}
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
            {renderStatus[data.upgrade_state]}
            {(data.upgrade_state == 0 ||
              data.upgrade_state == 1 ||
              data.upgrade_state == 4) && (
              <LoadingOutlined style={{ marginLeft: 10, fontWeight: 600 }} />
            )}
          </div>
        </div>
        <div style={{ width: "70%" }}>
          <Progress
            percent={((data.success_count / data.all_count) * 100).toFixed()}
            status={data.upgrade_state == 3 && "exception"}
          />
        </div>
        <div style={{ paddingLeft: 40 }}>
          {data.upgrade_state == 3 && (
            <>
              <Button
                loading={retryLoading}
                style={{ marginLeft: 4 }}
                type="primary"
                //disabled={unassignedServices !== 0}
                onClick={() => {
                  setRowId(location?.state?.history);
                  setVfModalVisibility(true);
                }}
              >
                {context.rollback}
              </Button>
              <Button
                loading={retryLoading}
                style={{ marginLeft: 4 }}
                type="primary"
                //disabled={unassignedServices !== 0}
                onClick={() => retryUpgrade()}
              >
                {context.retry}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* -- 服务回滚 -- */}
      <ServiceRollbackModal
        sRModalVisibility={vfModalVisibility}
        setSRModalVisibility={setVfModalVisibility}
        initLoading={retryLoading}
        fixedParams={`?history_id=${rowId}`}
        context={context}
      />
    </div>
  );
};

export default Content;
