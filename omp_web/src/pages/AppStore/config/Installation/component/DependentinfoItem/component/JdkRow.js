import { Checkbox } from "antd";
const JdkRow = ({ data, isBaseEnv, context }) => {
  return (
    <>
      <div style={{ flex: 1 }}>{data.name}</div>
      <div style={{ flex: 1 }}>{data.version}</div>
      <div style={{ flex: 3 }}></div>
      <div
        style={{ flex: 5, display: "flex", justifyContent: "space-between" }}
      >
        <div />
      </div>
      <div
        style={{ flex: 2, display: "flex", justifyContent: "space-between" }}
      >
        <div />
        <div
          style={{
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            flexDirection: "row-reverse",
            paddingRight: 70,
          }}
        >
          {!isBaseEnv && (
            <Checkbox checked disabled>
              {context.install}
            </Checkbox>
          )}
        </div>
      </div>
    </>
  );
};

export default JdkRow;
