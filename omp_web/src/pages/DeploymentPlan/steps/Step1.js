import { fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse } from "@/utils/utils";
import { Table, Button, Form, Spin, Select } from "antd";
import { useState } from "react";

const Step1 = ({
  setStepNum,
  oneData,
  oneList,
  setOneList,
  oneProVer,
  setOneProVer,
  setTwoData,
  viewHeight,
  firstForm,
  setProInfo,
  setAppInfo,
  setProInfoInit,
  setAppInfoInit,
  context,
}) => {
  const [loading, setLoading] = useState(false);
  const columns = [
    {
      title: context.product + context.ln + context.name,
      key: "pro_name",
      dataIndex: "pro_name",
      align: "center",
      ellipsis: true,
      width: 80,
    },
    {
      title: context.product + context.ln + context.version,
      key: "pro_version",
      dataIndex: "pro_version",
      align: "center",
      ellipsis: true,
      width: 120,
      render: (text, record) => {
        if (text.length === 1) {
          return text;
        } else {
          return (
            <Select
              defaultValue={oneProVer[record.pro_name] || text[0]}
              style={{ width: 120, textAlign: "left" }}
              onSelect={(e) => {
                oneProVer[record.pro_name] = e;
                setOneProVer(oneProVer);
              }}
            >
              {text.map((item) => {
                return (
                  <Select.Option
                    value={item}
                    key={`${record.pro_name}-${item}`}
                  >
                    {item}
                  </Select.Option>
                );
              })}
            </Select>
          );
        }
      },
    },
  ];

  const selectMap = {
    单服务模式: context.single + context.ln + context.mode,
    基础组件高可用: context.component + context.ln + context.highAvailability,
    全高可用模式:
      context.all +
      context.ln +
      context.highAvailability +
      context.ln +
      context.mode,
  };

  // 进入第二步
  const toStepTwo = () => {
    setLoading(true);
    fetchPost(apiRequest.deloymentPlan.installTempFirst, {
      body: {
        pro_info: oneList.map((e) => {
          return {
            pro_name: e.pro_name,
            pro_version: oneProVer[e.pro_name] || e.pro_version[0],
          };
        }),
        support_dpcp_yaml_version: firstForm.getFieldValue(
          "support_dpcp_yaml_version"
        ),
        model_style: firstForm.getFieldValue("model_style"),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setTwoData(res.data);

          // 初始数据
          const proInfoInit = {};
          const appInfoInit = {};
          res.data?.pro_info.forEach((element) => {
            proInfoInit[element.pro_name] = element.pro_count;
          });
          res.data?.deploy_app.forEach((element) => {
            appInfoInit[element.app_name] = element.app_count;
          });
          setProInfoInit(proInfoInit);
          setAppInfoInit(appInfoInit);

          setProInfo(proInfoInit);
          setAppInfo(appInfoInit);
          setStepNum(1);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
      }}
    >
      <Spin spinning={loading}>
        {/* -- 顶部选择区域 -- */}
        <div
          style={{
            marginTop: 15,
            display: "flex",
            width: "calc(100%)",
            padding: 12,
          }}
        >
          <div style={{ display: "flex" }}>
            <Form
              name="firstData"
              form={firstForm}
              layout="inline"
              initialValues={{
                model_style: oneData?.model_style[0],
                support_dpcp_yaml_version:
                  oneData?.support_dpcp_yaml_version[0],
              }}
            >
              <Form.Item
                label={context.mode}
                name="model_style"
                key="model_style"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.mode,
                  },
                ]}
              >
                <Select style={{ width: 220 }}>
                  {oneData?.model_style.map((e) => {
                    return (
                      <Select.Option key={e} value={e}>
                        {selectMap[e] || e}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>

              <Form.Item
                label={context.rule}
                name="support_dpcp_yaml_version"
                key="support_dpcp_yaml_version"
                rules={[
                  {
                    required: true,
                    message: context.select + context.ln + context.rule,
                  },
                ]}
                style={{ marginLeft: 60 }}
              >
                <Select style={{ width: 200 }}>
                  {oneData?.support_dpcp_yaml_version.map((e) => {
                    return (
                      <Select.Option key={e} value={e}>
                        {e}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Form>
          </div>
        </div>

        {/* -- 表格 -- */}
        <div
          style={{
            padding: 20,
            paddingTop: 0,
            height: viewHeight - 305,
          }}
        >
          <div style={{ border: "1px solid rgb(235, 238, 242)" }}>
            <Table
              columns={columns}
              scroll={{ y: viewHeight - 360 }}
              dataSource={oneData?.pro_info}
              pagination={false}
              rowKey={(record) => record.pro_name}
              rowSelection={{
                onSelect: (record, selected, selectedRows) => {
                  if (selected) {
                    setOneList([...oneList, record]);
                  } else {
                    setOneList(
                      oneList.filter((m) => m.pro_name !== record.pro_name)
                    );
                  }
                },
                onSelectAll: (selected, selectedRows, changeRows) => {
                  if (selected) {
                    setOneList([...oneList, ...changeRows]);
                  } else {
                    setOneList((ls) => {
                      return ls.filter((l) => {
                        return !changeRows
                          .map((m) => m.pro_name)
                          .includes(l.pro_name);
                      });
                    });
                  }
                },

                selectedRowKeys: oneList?.map((item) => item?.pro_name),
                // 传入rowselect优先使用传入的
              }}
            />
          </div>
        </div>
      </Spin>

      {/* -- 底部计数 -- */}
      <div
        style={{
          position: "fixed",
          backgroundColor: "#fff",
          width: "calc(100% - 230px)",
          bottom: 4,
          padding: "10px 0px",
          display: "flex",
          justifyContent: "space-between",
          paddingRight: 30,
          boxShadow: "0px 0px 10px #999999",
          alignItems: "center",
          borderRadius: 2,
        }}
      >
        <div style={{ paddingLeft: 20 }}>
          {context.selected + ":"} {oneList.length}
          {context.ge}
        </div>
        <div>
          <Button
            style={{ marginLeft: 10 }}
            type="primary"
            disabled={oneList.length === 0}
            loading={loading}
            onClick={() => toStepTwo()}
          >
            {context.next}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step1;
