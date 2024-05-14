import { OmpToolTip } from "@/components";
import styles from "./index.module.less";
import { useState } from "react";

const Card = ({ idx, history, info, tabKey, installOperation, context }) => {
  //定义命名
  let nameObj = {
    component: {
      logo: "app_logo",
      name: "app_name",
      version: "app_version",
      description: "app_description",
      instance_number: "instance_number",
    },
    service: {
      logo: "pro_logo",
      name: "pro_name",
      version: "pro_version",
      description: "pro_description",
      instance_number: "instance_number",
    },
  };
  const [isHover, setIsHover] = useState(false);

  return (
    <div
      className={styles.cardContainer}
      style={{
        transition: "all .2s ease-in-out",
        width: "calc(97.7% / 4)",
        marginLeft: (idx - 1) % 4 !== 0 && "0.75%",
        height: 200,
        boxSizing: "border-box",
        marginTop: 10,
        position: "relative",
        top: 0,
        backgroundColor: "#fff",
        paddingLeft: 10,
        paddingRight: 10,
      }}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div className={styles.cardContent}>
        {/* -- logo -- */}
        <div style={{ width: 80, paddingTop: 10 }}>
          {info[nameObj[tabKey].logo] ? (
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                border: "1px solid #a8d0f8",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: 10,
                marginRight: 10,
                overflow: "hidden",
              }}
              dangerouslySetInnerHTML={{
                __html: info[nameObj[tabKey].logo],
              }}
            />
          ) : (
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                border: "1px solid #a8d0f8",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: 10,
                marginRight: 10,
                overflow: "hidden",
                fontSize: 22,
                backgroundImage: "linear-gradient(to right, #4f85f6, #669aee)",
                // backgroundColor:"#5c8df6",
                color: "#fff",
              }}
            >
              <div style={{ textAlign: "center", position: "relative" }}>
                {info[nameObj[tabKey].name] &&
                  info[nameObj[tabKey].name][0].toLocaleUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* -- 上方信息 -- */}
        <div
          style={{
            fontSize: 13,
            color: "#a2a2a2",
            position: "relative",
            width: "calc(100% - 80px)",
          }}
          onClick={() => {
            history?.push({
              pathname: `/application_management/app_store/app-${tabKey}-detail/${
                info[nameObj[tabKey].name]
              }/${info[nameObj[tabKey].version]}`,
            });
          }}
        >
          {/* -- 名称 -- */}
          <div style={{ fontSize: 14, color: isHover ? "#247fe6" : "#222222" }}>
            {info[nameObj[tabKey].name]}
          </div>

          {/* -- 最新版本 -- */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              padding: "8px 10px 10px 0px",
            }}
          >
            <span>{context.latestVer}</span>
            <span>
              <OmpToolTip maxLength={14}>
                {info[nameObj[tabKey].version]}
              </OmpToolTip>
            </span>
          </div>

          {/* -- 描述信息 -- */}
          <p className={styles.text}>
            {/* <Tooltip placement="top" title={info[nameObj[tabKey].description]}> */}
            {info[nameObj[tabKey].description]}
            {/* </Tooltip> */}
          </p>

          {/* -- 服务实例总计 -- */}
          <span
            style={{
              float: "right",
              position: "absolute",
              bottom: 8,
              right: 10,
              fontSize: 12,
            }}
          >
            {context.serviceInstance + context.ln + context.total}{" "}
            {info[nameObj[tabKey].instance_number]} {context.ge}
          </span>
        </div>
      </div>

      {/* -- 下方按钮 查看/安装 -- */}
      <div
        className={styles.cardBtn}
        style={{ color: isHover ? "#247fe6" : "rgba(0,0,0,0.65)" }}
      >
        <div
          style={{ borderRight: "1px solid #e7e7e7" }}
          onClick={() => {
            history?.push({
              pathname: `/application_management/app_store/app-${tabKey}-detail/${
                info[nameObj[tabKey].name]
              }/${info[nameObj[tabKey].version]}`,
            });
          }}
        >
          {context.view}
        </div>
        <div
          onClick={() => {
            if (tabKey == "service") {
              installOperation({ product_name: info.pro_name }, "服务");
            } else {
              installOperation({ app_name: info.app_name }, "组件");
            }
          }}
        >
          {context.install}
        </div>
      </div>
    </div>
  );
};
export default Card;
