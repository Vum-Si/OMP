import { OmpContentWrapper, OmpTable, OmpMessageModal } from "@/components";
import { Button, message } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit } from "@/utils/utils";
import { fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
//import updata from "@/store_global/globalStore";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import getColumnsConfig from "./config/columns";
import { ImportPlanModal } from "./config/models";
import { useHistory } from "react-router-dom";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    pushMsg: "Please publish services in the app store",
  },
  "zh-CN": {
    pushMsg: "请在应用商店发布服务",
  },
};

const DeploymentPlan = ({ locale }) => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [operable, setOperable] = useState(false);
  // 导入弹框
  const [importPlan, setImportPlan] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });
  const context = locales[locale].common;

  // 获取导入模板按钮是否可操作
  const getOpreable = () => {
    fetchGet(apiRequest.deloymentPlan.deploymentOperable)
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code === 0 && res.data === true) {
            setOperable(true);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    searchParams,
    ordering
  ) => {
    setLoading(true);
    fetchGet(apiRequest.deloymentPlan.deploymentList, {
      params: {
        page: pageParams.current,
        size: pageParams.pageSize,
        ordering: ordering ? ordering : null,
        ...searchParams,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setDataSource(
            res.data.results.map((item, idx) => {
              return {
                ...item,
                _idx: idx + 1 + (pageParams.current - 1) * pageParams.pageSize,
              };
            })
          );
          setPagination({
            ...pagination,
            total: res.data.count,
            pageSize: pageParams.pageSize,
            current: pageParams.current,
            ordering: ordering,
            searchParams: searchParams,
          });
        });
        // 获取按钮是否可操作
        getOpreable();
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 查询生成模板数据
  const checkCreateDeployment = () => {
    setLoading(true);
    fetchGet(apiRequest.deloymentPlan.installTempFirst)
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.data.pro_info.length === 0) {
            message.info(msgMap[locale].pushMsg);
          } else {
            history.push({
              pathname: "/application_management/create-deployment",
              state: {
                oneData: res.data,
              },
            });
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData(pagination);
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部区域 -- */}
      <div style={{ display: "flex" }}>
        <Button
          type="primary"
          disabled={!operable}
          onClick={() => setImportPlan(true)}
        >
          {context.import}
        </Button>
        <Button
          type="primary"
          style={{ marginLeft: 10 }}
          onClick={() => checkCreateDeployment()}
        >
          {context.generate}
        </Button>
      </div>

      {/* -- 表格 -- */}
      <div
        style={{
          border: "1px solid #ebeef2",
          backgroundColor: "white",
          marginTop: 10,
        }}
      >
        <OmpTable
          noScroll={true}
          loading={loading}
          onChange={(e, filters, sorter) => {
            let ordering = sorter.order
              ? `${sorter.order == "descend" ? "" : "-"}${sorter.columnKey}`
              : null;
            setTimeout(() => {
              fetchData(e, pagination.searchParams, ordering);
            }, 200);
          }}
          columns={getColumnsConfig(history, context, locale)}
          dataSource={dataSource}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: () => (
              <div
                style={{
                  display: "flex",
                  width: "200px",
                  lineHeight: 2.8,
                  flexDirection: "row-reverse",
                }}
              >
                <p style={{ color: "rgb(152, 157, 171)" }}>
                  {context.total}{" "}
                  <span style={{ color: "rgb(63, 64, 70)" }}>
                    {pagination.total}
                  </span>
                  {context.tiao}
                </p>
              </div>
            ),
            ...pagination,
          }}
          rowKey={(record) => record.id}
        />
      </div>

      {/* -- 导入模板 -- */}
      <ImportPlanModal
        importPlan={importPlan}
        setImportPlan={setImportPlan}
        context={context}
        locale={locale}
      />
    </OmpContentWrapper>
  );
};

export default DeploymentPlan;
