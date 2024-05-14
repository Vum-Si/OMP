// 服务的升级和回滚
import { useHistory, useLocation } from "react-router-dom";
import styles from "./index.module.less";

import { LeftOutlined } from "@ant-design/icons";
import Content from "./content/index.js";
import { locales } from "@/config/locales";

const Upgrade = ({ locale }) => {
  const history = useHistory();
  const context = locales[locale].common;

  return (
    <div>
      <div
        style={{
          height: 50,
          backgroundColor: "#fff",
          display: "flex",
          paddingLeft: 20,
          paddingRight: 50,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 16 }}>
          <LeftOutlined
            style={{ fontSize: 16, marginRight: 20 }}
            className={styles.backIcon}
            onClick={() => {
              history.push({
                pathname: "/application_management/install-record",
                state: {
                  tabKey: "upgrade",
                },
              });
            }}
          />
          {context.upgrade}
        </div>
        <div />
      </div>
      <Content context={context} locale={locale} />
    </div>
  );
};

export default Upgrade;
