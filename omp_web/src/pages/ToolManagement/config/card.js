import styles from "./index.module.less";
import { useState } from "react";
import initLogo from "../initLogo/tools.svg";

const Card = ({ idx, history, info, context }) => {
  const [isHover, setIsHover] = useState(false);
  const kindMap = [
    context.management,
    context.check,
    context.security,
    context.other,
  ];

  return (
    <div
      className={styles.cardContainer}
      style={{
        transition: "all .2s ease-in-out",
        width: "calc(97.7% / 4)",
        marginLeft: (idx - 1) % 4 !== 0 && "0.75%",
        height: 145,
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
      onClick={() => {
        history?.push({
          pathname: `/utilitie/tool-management/tool-management-detail/${info.id}`,
        });
      }}
    >
      <div className={styles.cardContent}>
        {/* -- logo -- */}
        <div style={{ width: "100%", paddingTop: 5, display: "flex" }}>
          {!info.logo ? (
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
                backgroundColor: "#f5f5f5",
                color: "#fff",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <img
                  style={{
                    width: "35px",
                    height: "35px",
                    position: "relative",
                    top: 1,
                  }}
                  src={initLogo}
                />
              </div>
            </div>
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
                backgroundColor: "#f5f5f5",
                color: "#fff",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <img
                  style={{
                    width: "35px",
                    height: "35px",
                    position: "relative",
                    top: 1,
                  }}
                  src={`${info.logo}`}
                />
              </div>
            </div>
          )}

          <div
            style={{
              flex: 1,
              marginLeft: 10,
              display: "flex",
              alignItems: "center",
              color: isHover ? "#247fe6" : "#222222",
            }}
          >
            {info.name}
          </div>
        </div>

        {/* -- 类型/使用次数/描述 -- */}
        <div
          style={{
            //flex: 1,
            fontSize: 13,
            color: "#a2a2a2",
            position: "relative",
            width: "calc(100%)",
          }}
          onClick={() => {}}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              padding: "8px 10px 10px 10px",
              //fontSize:12
            }}
          >
            <span style={{ color: "#777373" }}>[ {kindMap[info.kind]} ]</span>
            <span style={{ color: "#383838" }}>
              {context.usageFrequency} : {info.used_number}
            </span>
          </div>
          <p className={styles.text}>{info.description}</p>
        </div>
      </div>
    </div>
  );
};

export default Card;
