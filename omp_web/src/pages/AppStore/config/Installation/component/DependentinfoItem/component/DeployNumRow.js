import RenderArr from "./RenderArr";
import RenderNum from "./RenderNum";

const DeployNumRow = ({ data, form, context }) => {
  return (
    <>
      <div style={{ flex: 1 }}>{data.name}</div>
      <div style={{ flex: 1 }}>{data.version}</div>
      {Array.isArray(data.deploy_mode) ? (
        <RenderArr data={data} form={form} context={context} />
      ) : (
        <RenderNum data={data} form={form} context={context} />
      )}
      <div
        style={{ flex: 2, display: "flex", justifyContent: "space-between" }}
      ></div>
    </>
  );
};

export default DeployNumRow;
