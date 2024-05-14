import { Modal, Cascader, message, Select, InputNumber } from "antd";
import { useEffect, useState } from "react";
//import BMF from "browser-md5-file";
import { fetchPost, fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse, createDataByCascader } from "@/utils/utils";
import { WarningOutlined } from "@ant-design/icons";

const msgMap = {
  "en-US": {
    pkgMsg: "Existence time more than",
    moreMsg: "Time",
    rollbackMsg: "After the package is deleted, it cannot be rolled back",
  },
  "zh-CN": {
    pkgMsg: "安装包存在时间",
    moreMsg: "大于",
    rollbackMsg: "安装包被删除后，将无法进行回滚",
  },
};

const DeleteServerModal = ({
  deleteServerVisibility,
  setDeleteServerVisibility,
  tabKey,
  refresh,
  context,
  locale,
}) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [resApp, setResApp] = useState([]);
  const [initData, setInitData] = useState([]);
  // 删除应用商店规则
  const [delType, setDelType] = useState("name");
  const [preDay, setPreDay] = useState(7);

  // 获取可删除选项
  const queryData = () => {
    setLoading(true);
    fetchGet(apiRequest.appStore.deleteServer, {
      params: {
        type: tabKey === "component" ? "component" : "product",
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setInitData(res.data.data);
          setOptions(
            res.data.data.map((e) => {
              return {
                label: (
                  <>
                    {e.name.includes("|") ? (
                      <>
                        {e.name.split("|")[0]}
                        <span style={{ float: "right", marginLeft: 40 }}>
                          {e.name.split("|")[1]}
                        </span>
                      </>
                    ) : (
                      e.name
                    )}
                  </>
                ),
                value: e.name,
                children: e.versions.map((i) => {
                  return {
                    label: (
                      <>
                        {i.includes("|") ? (
                          i.split("|").length === 2 ? (
                            <>
                              {i.split("|")[0]}
                              <div
                                style={{
                                  marginTop: -6,
                                  marginRight: -4,
                                  fontSize: 8,
                                  color: "rgba(0, 0, 0, 0.4)",
                                }}
                              >
                                {i.split("|")[1]}
                              </div>
                            </>
                          ) : (
                            <div>
                              {i.split("|")[0]}
                              <span style={{ float: "right", marginLeft: 40 }}>
                                {i.split("|")[1]}
                              </span>
                              <div
                                style={{
                                  marginTop: -6,
                                  marginRight: -4,
                                  fontSize: 8,
                                  color: "rgba(0, 0, 0, 0.4)",
                                }}
                              >
                                {i.split("|")[2]}
                              </div>
                            </div>
                          )
                        ) : (
                          i
                        )}
                      </>
                    ),
                    value: i,
                  };
                }),
              };
            })
          );
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 删除操作
  const doDelete = () => {
    let body = {
      type: tabKey === "component" ? "component" : "product",
    };
    if (delType === "time") {
      if (preDay === null) {
        message.info("请指定天数值");
        return;
      }
      body["pre_day"] = preDay;
      body["data"] = null;
    } else {
      if (resApp.length === 0) {
        message.info("请先选择要删除的服务");
        return;
      }
      body["pre_day"] = null;
      body["data"] = createDataByCascader(resApp, initData);
    }
    setLoading(true);
    fetchPost(apiRequest.appStore.deleteServer, {
      body: body,
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0) {
            message.success("删除成功");
            setDeleteServerVisibility(false);
            queryData();
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    queryData();
  }, [tabKey]);

  return (
    <Modal
      zIndex={1000}
      title={
        <span>
          {context.delete + context.ln}
          {tabKey === "component" ? context.component : context.application}
        </span>
      }
      afterClose={() => {
        setResApp([]);
        refresh();
      }}
      onCancel={() => {
        setDeleteServerVisibility(false);
      }}
      visible={deleteServerVisibility}
      width={480}
      confirmLoading={loading}
      okText={loading ? context.waiting : context.delete}
      bodyStyle={{
        paddingLeft: 30,
        paddingRight: 30,
      }}
      destroyOnClose
      onOk={() => doDelete()}
    >
      {/* -- 规则 -- */}
      <div style={{ marginLeft: 10, display: "flex" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          {context.rule + " :"}
        </div>
        <div style={{ flex: 6 }}>
          <Select
            style={{
              marginLeft: 6,
              minWidth: 160,
            }}
            value={delType}
            onChange={(e) => setDelType(e)}
          >
            <Select.Option value="name">
              {context.name + " & " + context.version}
            </Select.Option>
            <Select.Option value="time">{msgMap[locale].pkgMsg}</Select.Option>
          </Select>
        </div>
      </div>

      {/* -- 名称 / 时间 -- */}
      <div
        style={{
          marginLeft: 10,
          marginTop: 10,
          marginBottom: 12,
          display: "flex",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          {delType === "name"
            ? context.name + " :"
            : msgMap[locale].moreMsg + " :"}
        </div>
        <div style={{ flex: 6 }}>
          {delType === "name" ? (
            <Cascader
              style={{ width: 300, marginLeft: 6 }}
              options={options}
              onChange={(value) => setResApp(value)}
              multiple
              maxTagCount="responsive"
              placeholder={
                tabKey === "component"
                  ? context.select + context.ln + context.component
                  : context.select + context.ln + context.application
              }
            />
          ) : (
            <InputNumber
              min={1}
              style={{ width: 130, marginLeft: 6 }}
              addonAfter={context.day}
              value={preDay}
              onChange={(e) => setPreDay(e)}
            />
          )}
        </div>
      </div>
      <div
        style={{
          marginLeft: 10,
          color: "red",
        }}
      >
        <WarningOutlined
          style={{
            marginRight: 6,
          }}
        />{" "}
        {msgMap[locale].rollbackMsg}
      </div>
    </Modal>
  );
};

export default DeleteServerModal;
