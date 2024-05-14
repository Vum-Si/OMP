import DeployNumRow from "./DeployNumRow";
import DeployInstanceRow from "./DeployInstanceRow";

const DeployRow = ({ data, form, context }) => {
  return (
    <>
      {data.is_use_exist ? (
        <DeployInstanceRow data={data} form={form} context={context} />
      ) : (
        <DeployNumRow data={data} form={form} context={context} />
      )}
    </>
  );
};

export default DeployRow;
