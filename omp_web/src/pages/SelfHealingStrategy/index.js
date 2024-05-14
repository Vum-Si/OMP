import { OmpContentWrapper, OmpTable, OmpMessageModal } from "@/components";
import { Form, Button, message } from "antd";
import { useState, useEffect } from "react";
import { handleResponse } from "@/utils/utils";
import { fetchGet, fetchDelete, fetchPost, fetchPut } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import styles from "./index.module.less";
import getColumnsConfig from "./config/columns";
import { AddStrategyModal } from "./StrategyModal";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    delLeft: "Are you sure to",
    delRight: "this strategy?",
  },
  "zh-CN": {
    delLeft: "确认要",
    delRight: "该策略吗?",
  },
};

const BackupStrategy = ({ locale }) => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  // 增/改自愈策略共用
  const [strategyRow, setStrategyRow] = useState({});
  const [strategyModalType, setStrategyModalType] = useState("add");
  const [strategyModalVisibility, setStrategyModalVisibility] = useState(false);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [keyArr, setKeyArr] = useState([]);
  // 自愈策略表单
  const [strategyForm] = Form.useForm();
  // 自愈组件全量数据
  const [canHealingIns, setcanHealingIns] = useState([]);
  // 删除策略
  const [deleteStrategyModal, setDeleteStrategyModal] = useState(false);
  // 策略表单初始值
  const strategyFormInit = {
    repair_instance: [],
    fresh_rate: 30,
    max_healing_count: 5,
    instance_tp: 0,
    used: false,
  };
  const context = locales[locale].common;

  // 策略列表查询
  const fetchData = () => {
    setLoading(true);
    fetchGet(apiRequest.faultSelfHealing.selfHealingStrategy)
      .then((res) => {
        handleResponse(res, (res) => {
          setDataSource(
            res.data.map((item, idx) => {
              return {
                ...item,
                _idx: idx + 1,
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

  // 查询可自愈实例
  const queryCanHealing = () => {
    setStrategyLoading(true);
    fetchGet(apiRequest.faultSelfHealing.selfHealingStrategy, {
      params: {
        instance: true,
      },
    })
      .then((res) => {
        handleResponse(res, () => {
          setcanHealingIns(res.data.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setStrategyLoading(false);
      });
  };

  // 添加自愈策略
  const addStrategy = (data) => {
    setStrategyLoading(true);
    fetchPost(apiRequest.faultSelfHealing.selfHealingStrategy, {
      body: data,
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success(context.add + context.ln + context.succeeded);
            strategyForm.setFieldsValue(strategyFormInit);
            fetchData();
            setKeyArr([]);
            setStrategyModalVisibility(false);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setStrategyLoading(false);
      });
  };

  // 编辑自愈策略
  const updateStrategy = (data) => {
    setStrategyLoading(true);
    fetchPut(
      `${apiRequest.faultSelfHealing.selfHealingStrategy}${strategyRow.id}/`,
      {
        body: data,
      }
    )
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success(context.edit + context.ln + context.succeeded);
            strategyForm.setFieldsValue(strategyFormInit);
            fetchData();
            setKeyArr([]);
            setStrategyModalVisibility(false);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setStrategyLoading(false);
      });
  };

  // 删除自愈策略
  const deleteStrategy = () => {
    setLoading(true);
    fetchDelete(
      `${apiRequest.faultSelfHealing.selfHealingStrategy}${strategyRow.id}/`
    )
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success(context.delete + context.ln + context.succeeded);
            fetchData();
            setDeleteStrategyModal(false);
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
    fetchData();
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部添加/刷新 -- */}
      <div style={{ display: "flex" }}>
        <Button
          style={{ marginRight: 10 }}
          type="primary"
          onClick={() => {
            // 暂时写死三个维度，无需查询
            // queryCanHealing();
            setStrategyModalType("add");
            setStrategyModalVisibility(true);
          }}
        >
          {context.add}
        </Button>

        <div style={{ display: "flex", marginLeft: "auto" }}>
          <Button style={{ marginLeft: 10 }} onClick={() => fetchData()}>
            {context.refresh}
          </Button>
        </div>
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
          loading={loading}
          columns={getColumnsConfig(
            setStrategyRow,
            setDeleteStrategyModal,
            setStrategyModalType,
            setStrategyModalVisibility,
            strategyForm,
            queryCanHealing,
            context
          )}
          dataSource={dataSource}
          pagination={{ pageSize: 10 }}
          rowKey={(record) => record.id}
          noScroll={true}
        />
      </div>

      {/* -- 添加策略 -- */}
      <AddStrategyModal
        strategyModalType={strategyModalType}
        addStrategy={addStrategy}
        updateStrategy={updateStrategy}
        loading={strategyLoading}
        modalForm={strategyForm}
        addModalVisibility={strategyModalVisibility}
        setAddModalVisibility={setStrategyModalVisibility}
        canHealingIns={canHealingIns}
        strategyFormInit={strategyFormInit}
        keyArr={keyArr}
        setKeyArr={setKeyArr}
        context={context}
      />

      {/* -- 删除策略 -- */}
      <OmpMessageModal
        visibleHandle={[deleteStrategyModal, setDeleteStrategyModal]}
        context={context}
        loading={loading}
        onFinish={() => deleteStrategy()}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].delLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {context.delete}{" "}
          </span>
          {msgMap[locale].delRight}
        </div>
      </OmpMessageModal>
    </OmpContentWrapper>
  );
};

export default BackupStrategy;
