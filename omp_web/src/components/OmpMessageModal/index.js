import { Modal, Button } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

const OmpMessageModal = ({
  visibleHandle,
  children,
  title = null,
  onFinish,
  noFooter,
  context = null,
  loading = false,
  afterClose = () => {},
  disabled = false,
  ...residualParam
}) => {
  return (
    <Modal
      {...residualParam}
      title={
        title || (
          <span>
            <ExclamationCircleOutlined
              style={{
                fontSize: 20,
                color: "#f0a441",
                paddingRight: "10px",
                position: "relative",
                top: 2,
              }}
            />
            {context?.reminder || "提示"}
          </span>
        )
      }
      visible={visibleHandle[0]}
      onCancel={() => visibleHandle[1](false)}
      footer={null}
      destroyOnClose
      loading={loading}
      afterClose={afterClose}
    >
      {children}
      <div
        style={{
          textAlign: "center",
          position: "relative",
          top: 0,
          paddingTop: 20,
        }}
      >
        {noFooter ? (
          ""
        ) : (
          <>
            <Button
              style={{ marginRight: 16 }}
              onClick={() => visibleHandle[1](false)}
            >
              {context?.cancel || "取消"}
            </Button>
            <Button
              loading={loading}
              type="primary"
              htmlType="submit"
              onClick={onFinish}
              disabled={disabled}
            >
              {context?.ok || "确认"}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default OmpMessageModal;
