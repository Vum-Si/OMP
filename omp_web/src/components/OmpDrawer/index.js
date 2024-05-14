import { Drawer } from "antd";
import { DesktopOutlined } from "@ant-design/icons";
import { OmpIframe } from "@/components";

const OmpDrawer = ({ showIframe, setShowIframe, context }) => {
  return (
    <Drawer
      title={
        <div style={{ display: "flex" }}>
          <DesktopOutlined style={{ position: "relative", top: 3, left: -5 }} />
          {context.monitor + context.ln + context.info}
          {showIframe.record?.ip && (
            <span style={{ paddingLeft: 30, fontWeight: 400, fontSize: 15 }}>
              IP: {showIframe.record?.ip}
            </span>
          )}
        </div>
      }
      headerStyle={{
        padding: "19px 24px",
      }}
      placement="right"
      closable={true}
      width={`calc(100% - 200px)`}
      style={{
        height: "calc(100%)",
        // paddingTop: "60px",
      }}
      onClose={() => {
        setShowIframe({
          ...showIframe,
          isOpen: false,
        });
      }}
      visible={showIframe.isOpen}
      bodyStyle={{
        padding: 10,
        //paddingLeft:10,
        backgroundColor: "#e7e9f0", //"#f4f6f8"
        height: "calc(100%)",
      }}
      destroyOnClose={true}
      zIndex={9999}
    >
      <OmpIframe showIframe={showIframe} setShowIframe={setShowIframe} />
    </Drawer>
  );
};

export default OmpDrawer;
