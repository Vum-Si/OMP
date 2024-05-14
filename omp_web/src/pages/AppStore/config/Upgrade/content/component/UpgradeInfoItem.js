import UpgradeDetail from "./UpgradeDetail";
import { logCreate } from "../../../Installation/component/logUtil";

const UpgradeInfoItem = ({ id, data, title, log, idx, context, locale }) => {
  return (
    <div
      id={id}
      style={{
        backgroundColor: "#fff",
        padding: 10,
        marginTop: idx !== 0 && 15,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          position: "relative",
          height: 40,
          paddingTop: 10,
        }}
      >
        <div
          style={{
            fontWeight: 500,
            position: "absolute",
            left: 30,
            backgroundColor: "#fff",
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          {title === "升级前置操作"
            ? context.pre + context.ln + context.task
            : title}
        </div>
        <div style={{ height: 1, backgroundColor: "#b3b2b3", width: "100%" }} />
      </div>
      <div
        style={{
          paddingLeft: 20,
          marginTop: 10,
          paddingBottom: 5,
        }}
      >
        {data?.map((item) => {
          return (
            <UpgradeDetail
              title={title}
              key={`${title}=${item.ip}=${item.instance_name}`}
              status={item.upgrade_state}
              ip={item.ip}
              log={
                locale === "zh-CN"
                  ? item.message
                  : logCreate(title, item.message, context)
              }
              instance_name={item.instance_name}
              context={context}
            />
          );
        })}
      </div>
    </div>
  );
};

export default UpgradeInfoItem;
