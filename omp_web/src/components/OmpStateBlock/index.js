import { useEffect, useState } from "react";
import { Button, Checkbox, Popover } from "antd";
import styles from "./index.module.less";
import * as R from "ramda";
import { locales } from "@/config/locales";

const colorObj = {
  normal: {
    background: "#eefaf4",
    borderColor: "#54bba6",
  },
  abnormal: {
    background: "#fbe7e6",
    borderColor: "#da4e48",
  },
  noMonitored: {
    background: "#e5e5e5",
    borderColor: "#aaaaaa",
  },
  warning: {
    background: "rgba(247, 231, 24, 0.2)",
    borderColor: "rgb(245, 199, 115)",
  },
};

const popContent = (item, context) => {
  return (
    <div>
      {item.info.map((i, idx) => (
        <div className={styles.popContent} key={idx}>
          {i.ip && (
            <span
              className={styles.ip}
              style={{ color: colorObj[item.frontendStatus]?.borderColor }}
            >
              {i.ip}
            </span>
          )}
          <span>
            {i.date ? (
              <span>{i.date}</span>
            ) : (
              <span
                style={{ color: colorObj[item.frontendStatus]?.borderColor }}
              >
                {item.frontendStatus === "noMonitored"
                  ? context.noMonitored
                  : context.normal}
              </span>
            )}
          </span>
          {i.describe && (
            <span>
              {i.describe.length > 100
                ? i.describe.slice(0, 100) + "..."
                : i.describe.slice(0, 100)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

const OmpStateBlock = (props) => {
  const { locale, title, data = [] } = props;
  const [allData, setAllData] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [isShowAll, setIsShowAll] = useState(false);
  const context = locales[locale].common;

  useEffect(() => {
    if (data && data.length > 0) {
      let handleData = data.map((item) => {
        //后端的critical和warning都渲染成红色，在前端对数据进行处理 noMonitored:"未监控" abnormal:"异常" normal:"正常"
        // let status = "noMonitored";
        // if (item.severity == "warning" || item.severity == "critical") {
        //   status = "abnormal";
        // } else if (item.severity == "normal") {
        //   status = "normal";
        // }
        // return {
        //   ...item,
        //   frontendStatus: status,
        // };

        let status = "noMonitored";
        if (item.severity == "critical") {
          status = "abnormal";
        } else if (item.severity == "normal") {
          status = "normal";
        } else if (item.severity == "warning") {
          status = "warning";
        }
        return {
          ...item,
          frontendStatus: status,
        };
      });
      setCurrentData(sortData(handleData));
      setAllData(sortData(handleData));
    }
  }, [data]);

  const sortData = (data) => {
    let normalArr = data.filter((i) => i.frontendStatus == "normal");
    let noMonitoredArr = data.filter((i) => i.frontendStatus == "noMonitored");
    let abnormalArr = data.filter((i) => i.frontendStatus == "abnormal");
    let warningArr = data.filter((i) => i.frontendStatus == "warning");

    let result = abnormalArr
      .concat(normalArr)
      .concat(noMonitoredArr)
      .concat(warningArr);
    return result;
  };

  return (
    <div className={styles.blockContent}>
      <div className={styles.checkboxGroup}>
        <span className={styles.blockTitle}>{title}</span>
        <div>
          {/* -- 异常 -- */}
          <Checkbox
            key="abnormal"
            defaultChecked={true}
            onChange={(e) => {
              if (e.target.checked) {
                setCurrentData(
                  sortData(
                    currentData.concat(
                      allData.filter(
                        (i) =>
                          i.frontendStatus == "abnormal" ||
                          i.frontendStatus == "warning"
                      )
                    )
                  )
                );
              } else {
                setCurrentData(
                  sortData(
                    currentData.filter(
                      (i) =>
                        i.frontendStatus !== "abnormal" ||
                        i.frontendStatus == "warning"
                    )
                  )
                );
              }
            }}
          >
            {context.abnormal}
          </Checkbox>

          {/* -- 正常 -- */}
          <Checkbox
            key="normal"
            defaultChecked={true}
            onChange={(e) => {
              if (e.target.checked) {
                setCurrentData(
                  sortData(
                    currentData.concat(
                      allData.filter((i) => i.frontendStatus == "normal")
                    )
                  )
                );
              } else {
                setCurrentData(
                  sortData(
                    currentData.filter((i) => i.frontendStatus !== "normal")
                  )
                );
              }
            }}
          >
            {context.normal}
          </Checkbox>

          {/* -- 未监控 -- */}
          <Checkbox
            key="noMonitored"
            defaultChecked={true}
            onChange={(e) => {
              if (e.target.checked) {
                setCurrentData(
                  sortData(
                    currentData.concat(
                      allData.filter((i) => i.frontendStatus == "noMonitored")
                    )
                  )
                );
              } else {
                setCurrentData(
                  sortData(
                    currentData.filter(
                      (i) => i.frontendStatus !== "noMonitored"
                    )
                  )
                );
              }
            }}
          >
            {context.noMonitored}
          </Checkbox>

          {/* -- 展开/收起 -- */}
          <Button
            className={styles.dropBtn}
            size={"small"}
            onClick={() => setIsShowAll(!isShowAll)}
          >
            {isShowAll ? context.close : context.all}
          </Button>
        </div>
      </div>

      {/* -- 悬停展示 -- */}
      {currentData.length > 0 ? (
        <div
          style={isShowAll ? {} : { maxHeight: 170, overflowY: "scroll" }}
          className={styles.blockItemWrapper}
        >
          {currentData.map((item, idx) => {
            return (
              <div
                key={`${title}-${idx}`}
                onClick={() => {
                  item.frontendStatus == "abnormal"
                    ? props.criticalLink(item)
                    : props.link(item);
                }}
              >
                <Popover
                  content={popContent(item || {}, context)}
                  title={context.detail}
                >
                  <Button
                    className={styles.stateButton}
                    style={colorObj[item.frontendStatus]}
                  >
                    <div>{item.instance_name || item.ip}</div>
                  </Button>
                </Popover>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyTable}>{context.noData}</div>
      )}
    </div>
  );
};

export default OmpStateBlock;
