import InstallDetail from "./component/InstallDetail";
const InstallInfoItem = ({
  id,
  data,
  title,
  openName,
  setOpenName,
  log,
  idx,
  context,
}) => {
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
          {title === "初始化安装流程"
            ? context.install + context.ln + context.init
            : title === "安装后续任务"
            ? context.post + context.ln + context.task
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
        {data.map((item) => {
          return (
            <InstallDetail
              title={title}
              openName={openName}
              setOpenName={setOpenName}
              key={`${title}=${item.ip}`}
              status={item.status}
              ip={item.ip}
              log={log}
              context={context}
            />
          );
        })}
      </div>
    </div>
  );
};

export default InstallInfoItem;
