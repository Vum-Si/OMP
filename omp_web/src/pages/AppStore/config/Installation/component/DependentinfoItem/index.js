import styles from "../index.module.less";
import JdkRow from "./component/JdkRow";
import DeployRow from "./component/DeployRow";

const DependentInfoItem = ({ data, form, isBaseEnv, context }) => {
  const showErrorMsg = (data) => {
    if (data.error_msg) {
      if (data.error_msg.includes("安装包不存在") && data.is_use_exist) {
        return true;
      }
      return true;
    }
    return false;
  };

  return (
    <>
      <div className={styles.dependentinfoItem}>
        {data.is_base_env ? (
          <JdkRow data={data} isBaseEnv={isBaseEnv} context={context} />
        ) : (
          <DeployRow data={data} form={form} context={context} />
        )}
      </div>
      <div
        style={{
          marginTop: 2,
          color: "red",
          height: showErrorMsg(data) ? 20 : 0,
          transition: "all .2s ease-in",
        }}
      >
        {showErrorMsg(data) && data.error_msg}
      </div>
    </>
  );
};

export default DependentInfoItem;
