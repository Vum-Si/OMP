import { fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse } from "@/utils/utils";
import { Table, Button } from "antd";
import { useState } from "react";
import { CheckCircleFilled } from "@ant-design/icons";

const msgMap = {
  "en-US": {
    createMsg: "Template generated",
    resultMsg:
      "is the node where OMP is located, and the usage of host resources is as follows",
  },
  "zh-CN": {
    createMsg: "模板已生成",
    resultMsg: "为 OMP 所在节点，主机资源使用情况如下",
  },
};

const Step3 = ({
  setStepNum,
  viewHeight,
  twoData,
  threeData,
  context,
  locale,
}) => {
  // 加载
  const [loading, setLoading] = useState(false);
  // 结果页面主机展示表格
  const columns = [
    {
      title: context.hostname,
      key: "hostname",
      dataIndex: "hostname",
      align: "center",
      ellipsis: true,
    },
    {
      title: context.use + context.ln + context.memory,
      key: "use_mem",
      dataIndex: "use_mem",
      align: "center",
      ellipsis: true,
    },
    {
      title: context.all + context.ln + context.memory,
      key: "all_mem",
      dataIndex: "all_mem",
      align: "center",
      ellipsis: true,
    },
  ];

  // 生成模板
  const downLoadTemp = () => {
    setLoading(true);
    fetchPost(apiRequest.deloymentPlan.downLoadTemp, {
      body: {
        uuid: twoData.uuid,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          let a = document.createElement("a");
          a.href = `/${res.data}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
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
      {/* -- 生成结果 -- */}
      <div
        style={{
          marginTop: 15,
          width: "calc(100%)",
          padding: 10,
          paddingLeft: 0,
          textAlign: "center",
          height: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
        }}
      >
        <CheckCircleFilled
          style={{
            color: "#52c41a",
            marginRight: 16,
            fontSize: 30,
          }}
        />
        {msgMap[locale].createMsg}
        <strong style={{ margin: "0 6px", color: "rgb(74, 134, 247)" }}>
          docp01
        </strong>
        {msgMap[locale].resultMsg}
      </div>

      {/* -- 资源使用情况表格 --  */}
      <div
        style={{
          padding: 20,
          paddingTop: 0,
          height: viewHeight - 340,
        }}
      >
        <div style={{ border: "1px solid rgb(235, 238, 242)" }}>
          <Table
            columns={columns}
            scroll={{ y: viewHeight - 400 }}
            dataSource={threeData}
            pagination={false}
          />
        </div>
      </div>

      {/* -- 底部区域 -- */}
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
        <div style={{ paddingLeft: 20 }}></div>
        <div>
          <Button
            style={{ marginLeft: 10 }}
            type="primary"
            loading={loading}
            onClick={() => setStepNum(1)}
          >
            {context.previous}
          </Button>
          <Button
            style={{ marginLeft: 10 }}
            type="primary"
            loading={loading}
            onClick={() => downLoadTemp()}
          >
            {context.download}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step3;
