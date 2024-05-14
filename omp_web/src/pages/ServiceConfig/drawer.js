import { Drawer, Descriptions } from "antd";

export const ConfigDetail = ({
  isShowDrawer,
  setIsShowDrawer,
  drawerData,
  setDrawerData,
  setEditModalVisibility,
  confForm,
  context,
  msgMap,
  locale,
}) => {
  return (
    <Drawer
      title={
        drawerData
          ? msgMap[locale][drawerData.element.key] || drawerData.element.name
          : null
      }
      placement="right"
      closable={true}
      width={580}
      style={{ height: "calc(100%)" }}
      onClose={() => {
        setIsShowDrawer(false);
        setDrawerData(null);
      }}
      visible={isShowDrawer}
      destroyOnClose={true}
    >
      {["service_dependence", "app_dependence"].includes(
        drawerData?.element.key
      ) ? (
        <>
          {drawerData?.data.filter((e) => e.cluster_name).length > 0 && (
            <Descriptions bordered title={context.cluster}>
              {drawerData?.data
                .filter((e) => e.cluster_name)
                .map((e) => {
                  return (
                    <Descriptions.Item label={e.name} span={3} key={e.name}>
                      {e.cluster_name}
                    </Descriptions.Item>
                  );
                })}
            </Descriptions>
          )}
          {drawerData?.data.filter((e) => e.instance_name).length > 0 && (
            <Descriptions bordered title={context.single}>
              {drawerData?.data
                .filter((e) => e.instance_name)
                .map((e) => {
                  return (
                    <Descriptions.Item label={e.name} span={3} key={e.name}>
                      {e.instance_name}
                    </Descriptions.Item>
                  );
                })}
            </Descriptions>
          )}
          {drawerData?.data.filter((e) => e.version).length > 0 && (
            <Descriptions
              bordered
              title={context.package + context.ln + context.dependence}
            >
              {drawerData?.data
                .filter((e) => e.version)
                .map((e) => {
                  return (
                    <Descriptions.Item label={e.name} span={3} key={e.name}>
                      {e.version}
                    </Descriptions.Item>
                  );
                })}
            </Descriptions>
          )}
        </>
      ) : (
        <Descriptions bordered>
          {drawerData?.data.map((e) => {
            return (
              <Descriptions.Item label={e.name} span={3} key={e.name}>
                <span>
                  {e.value}
                  <a
                    style={{ float: "right", marginLeft: 10 }}
                    onClick={() => {
                      // setRow(e.id);
                      confForm.setFieldsValue({
                        ser_field: [`${drawerData.element.key}.${e.name}`],
                        char: e.value,
                      });
                      setEditModalVisibility(true);
                    }}
                  >
                    {context.edit}
                  </a>
                </span>
              </Descriptions.Item>
            );
          })}
        </Descriptions>
      )}
    </Drawer>
  );
};
