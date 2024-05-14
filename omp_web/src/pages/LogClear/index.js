import { OmpContentWrapper, OmpTable, OmpMessageModal } from "@/components";
import { Button, message, Dropdown, Menu, Form } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit } from "@/utils/utils";
import {
  fetchGet,
  fetchPost,
  fetchPatch,
  fetchDelete,
  fetchPut,
} from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import getColumnsConfig from "./config/columns";
import { DownOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import UpdateModal from "./modal";
import ScanLogClearModal from "./ScanLogClearModal";
import { HostModal, UpdateHostModal } from "./HostModal";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    closeLeft: "Are you sure to close a total of",
    closeRight: "strategys?",
    openLeft: "Are you sure to open a total of",
    openRight: "strategys?",
    deleteLeft: "Are you sure to delete a total of",
    deleteRight: "strategys?",
  },
  "zh-CN": {
    closeLeft: "确认关闭共计",
    closeRight: "个策略吗?",
    openLeft: "确认开启共计",
    openRight: "个策略吗?",
    deleteLeft: "确认删除共计",
    deleteRight: "个策略吗?",
  },
};

const LogClear = ({ locale }) => {
  const [loading, setLoading] = useState(false);
  const [checkedList, setCheckedList] = useState([]);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  // 更新等级 modal
  const [updateMoadlVisible, setUpdateMoadlVisible] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  // 开/关策略
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [modelLoading, setModalLoading] = useState(false);
  // 定义row存数据
  const [row, setRow] = useState({});
  // 扫描
  const [scanModalVisibility, setScanModalVisibility] = useState(false);
  // 主机探查周期
  const [hostModalLoading, setHostModalLoading] = useState(false);
  const [hostModalVisibility, setHostModalVisibility] = useState(false);
  const [hostData, setHostData] = useState([]);
  const [hostInitData, setHostInitData] = useState([]);
  const [updateHostVisibility, setUpdateHostVisibility] = useState(false);
  const [updateHostLoading, setUpdateHostLoading] = useState(false);
  const [hostRow, setHostRow] = useState({});
  const [hostCheckedList, setHostCheckedList] = useState([]);
  const [frequency, setFrequency] = useState("day");
  const [modeType, setModalType] = useState("default");
  const [hostForm] = Form.useForm();
  const context = locales[locale].common;

  // 星期汉字映射
  let weekData = [
    {
      name: context.monday,
      value: "星期一",
    },
    {
      name: context.tuesday,
      value: "星期二",
    },
    {
      name: context.wednesday,
      value: "星期三",
    },
    {
      name: context.thursday,
      value: "星期四",
    },
    {
      name: context.friday,
      value: "星期五",
    },
    {
      name: context.saturday,
      value: "星期六",
    },
    {
      name: context.sunday,
      value: "星期日",
    },
  ];

  // 列表查询
  const fetchData = () => {
    setCheckedList([]);
    setLoading(true);
    fetchGet(apiRequest.logManagement.logClearRule)
      .then((res) => {
        handleResponse(res, (res) => {
          setDataSource(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 开启｜关闭策略
  const fetchChange = (target) => {
    let result_arr = [];
    if (target === 0) {
      result_arr = checkedList.filter((item) => {
        return item.switch !== 0;
      });
    } else {
      result_arr = checkedList.filter((item) => {
        return item.switch === 0;
      });
    }
    if (result_arr.length == 0) {
      setModalLoading(false);
      setOpenModal(false);
      setCloseModal(false);
      setCheckedList([]);
      if (target === 0) {
        message.success(context.close + context.ln + context.succeeded);
      } else {
        message.success(context.open + context.ln + context.succeeded);
      }
      return;
    }
    console.log(
      result_arr.map((e) => {
        return {
          id: e.id,
          switch: target,
        };
      })
    );
    setModalLoading(true);
    fetchPost(
      apiRequest.logManagement.logClearRule,
      {
        body: result_arr.map((e) => {
          return {
            id: e.id,
            switch: target,
          };
        }),
      },
      true
    )
      .then((res) => {
        if (res.data.code == 0) {
          if (target === 0) {
            message.success(context.close + context.ln + context.succeeded);
          } else {
            message.success(context.open + context.ln + context.succeeded);
          }
        } else {
          message.warning(res.data.message);
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setModalLoading(false);
        setOpenModal(false);
        setCloseModal(false);
        setCheckedList([]);
        fetchData();
      });
  };

  // 更新策略
  const updateLogClear = (data) => {
    setUpdateLoading(true);
    fetchPatch(`${apiRequest.logManagement.logClearRule}${row.id}/`, {
      body: {
        exec_value: data.exec_value,
        exec_rule: data.exec_rule,
        switch: data.switch ? 1 : 0,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success(context.edit + context.ln + context.succeeded);
            fetchData();
            setUpdateMoadlVisible(false);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setUpdateLoading(false);
      });
  };

  // 删除策略
  const deleteLogClear = () => {
    setLoading(true);
    fetchDelete(apiRequest.logManagement.logClearRule, {
      body: {
        id: checkedList.map((e) => e.id),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success(context.delete + context.ln + context.succeeded);
            fetchData();
            setDeleteModal(false);
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

  // 查询主机探查周期
  const queryHost = () => {
    setHostModalLoading(true);
    fetchGet(apiRequest.logManagement.hostCron)
      .then((res) => {
        handleResponse(res, (res) => {
          const resData = res.data.map((item, idx) => {
            return {
              ...item,
              _idx: idx + 1,
            };
          });
          setHostData(resData);
          setHostInitData(resData);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setHostModalLoading(false);
      });
  };

  // 构建添加/修改备份策略的请求体
  const makeRequestBody = (data) => {
    const type = data.strategy.frequency;
    if (type === "hour") {
      return {
        month_of_year: "*",
        day_of_month: "*",
        day_of_week: "*",
        hour: `*/${data.strategy.hour}`,
        minute: "1",
      };
    }
    const timeInfo = data.strategy.time.format("HH:mm");
    return {
      month_of_year: "*",
      day_of_month: data.strategy.month || "*",
      day_of_week: data.strategy.week || "*",
      hour: timeInfo.split(":")[0] || "*",
      minute: timeInfo.split(":")[1] || "*",
    };
  };

  // 更新主机探查周期
  const updateHost = (data) => {
    setUpdateHostLoading(true);
    fetchPut(
      apiRequest.logManagement.hostCron,
      {
        body: [
          {
            id: hostRow.id,
            crontab_detail: makeRequestBody(data),
          },
        ],
      },
      true
    )
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success(context.edit + context.ln + context.succeeded);
            queryHost();
            setUpdateHostVisibility(false);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setUpdateHostLoading(false);
      });
  };

  // 批量更新主机周期
  const batchUpdateHost = (data) => {
    setUpdateHostLoading(true);
    fetchPut(
      apiRequest.logManagement.hostCron,
      {
        body: hostCheckedList.map((e) => {
          return {
            id: e.id,
            crontab_detail: makeRequestBody(data),
          };
        }),
      },
      true
    )
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            setHostCheckedList([]);
            message.success(
              context.batch +
                context.ln +
                context.edit +
                context.ln +
                context.succeeded
            );
            queryHost();
            setUpdateHostVisibility(false);
          } else {
            message.warning(res.message);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setUpdateHostLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <OmpContentWrapper>
      {/* -- 顶部扫描/检查/更多 -- */}
      <div style={{ display: "flex" }}>
        <Button
          style={{ marginRight: 10 }}
          type="primary"
          onClick={() => setScanModalVisibility(true)}
        >
          {context.scan + context.ln + context.strategy}
        </Button>
        <Button
          type="primary"
          onClick={() => {
            queryHost();
            setHostModalVisibility(true);
          }}
        >
          {context.check + context.ln + context.period}
        </Button>
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item
                key="open"
                style={{ textAlign: "center" }}
                disabled={checkedList.map((item) => item.id).length == 0}
                onClick={() => setOpenModal(true)}
              >
                {context.open}
              </Menu.Item>
              <Menu.Item
                key="close"
                style={{ textAlign: "center" }}
                disabled={checkedList.map((item) => item.id).length == 0}
                onClick={() => setCloseModal(true)}
              >
                {context.close}
              </Menu.Item>
              <Menu.Item
                key="delete"
                style={{ textAlign: "center" }}
                disabled={checkedList.map((item) => item.id).length == 0}
                onClick={() => setDeleteModal(true)}
              >
                {context.delete}
              </Menu.Item>
            </Menu>
          }
          placement="bottomCenter"
        >
          <Button style={{ marginLeft: 10, paddingRight: 10, paddingLeft: 15 }}>
            {context.more}
            <DownOutlined />
          </Button>
        </Dropdown>

        <div style={{ display: "flex", marginLeft: "auto" }}>
          <Button
            style={{ marginLeft: 10 }}
            onClick={() => {
              fetchData();
              setCheckedList([]);
            }}
          >
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
          columns={getColumnsConfig(setRow, setUpdateMoadlVisible, context)}
          dataSource={dataSource}
          pagination={{
            showSizeChanger: false,
            pageSize: 10,
            showTotal: () => (
              <div
                style={{
                  display: "flex",
                  width: "200px",
                  justifyContent: "space-between",
                  lineHeight: 2.8,
                }}
              >
                <p>
                  {context.selected} {checkedList.length} {context.tiao}
                </p>
                <p style={{ color: "rgb(152, 157, 171)" }}>
                  {context.total}{" "}
                  <span style={{ color: "rgb(63, 64, 70)" }}>
                    {dataSource.length}
                  </span>
                  {context.tiao}
                </p>
              </div>
            ),
          }}
          rowKey={(record) => record.id}
          checkedState={[checkedList, setCheckedList]}
        />
      </div>

      {/* -- 修改日志等级 -- */}
      {updateMoadlVisible && (
        <UpdateModal
          row={row}
          visibleHandle={[updateMoadlVisible, setUpdateMoadlVisible]}
          loading={updateLoading}
          setLoading={setUpdateLoading}
          updateLogClear={updateLogClear}
          context={context}
          locale={locale}
        />
      )}

      {/* -- 扫描清理策略 -- */}
      <ScanLogClearModal
        scanModalVisibility={scanModalVisibility}
        setScanModalVisibility={setScanModalVisibility}
        refresh={fetchData}
        context={context}
        locale={locale}
      />

      {/* -- 主机检查周期 -- */}
      <HostModal
        modalVisibility={hostModalVisibility}
        setModalVisibility={setHostModalVisibility}
        modalLoading={hostModalLoading}
        hostData={hostData}
        setHostData={setHostData}
        initData={hostInitData}
        setUpdateModalVisibility={setUpdateHostVisibility}
        modalForm={hostForm}
        setRow={setHostRow}
        setFrequency={setFrequency}
        hostCheckedList={hostCheckedList}
        setHostCheckedList={setHostCheckedList}
        setModalType={setModalType}
        weekData={weekData}
        context={context}
      />

      <UpdateHostModal
        loading={updateHostLoading}
        modalForm={hostForm}
        updateModalVisibility={updateHostVisibility}
        setUpdateModalVisibility={setUpdateHostVisibility}
        updateHost={updateHost}
        frequency={frequency}
        setFrequency={setFrequency}
        modeType={modeType}
        batchUpdateHost={batchUpdateHost}
        weekData={weekData}
        context={context}
      />

      {/* -- 关闭策略 -- */}
      <OmpMessageModal
        visibleHandle={[closeModal, setCloseModal]}
        context={context}
        loading={modelLoading}
        onFinish={() => fetchChange(0)}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].closeLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].closeRight}
        </div>
      </OmpMessageModal>

      {/* -- 开启策略 -- */}
      <OmpMessageModal
        visibleHandle={[openModal, setOpenModal]}
        context={context}
        loading={modelLoading}
        onFinish={() => fetchChange(1)}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].openLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].openRight}
        </div>
      </OmpMessageModal>

      {/* -- 删除策略 -- */}
      <OmpMessageModal
        visibleHandle={[deleteModal, setDeleteModal]}
        context={context}
        loading={modelLoading}
        onFinish={() => deleteLogClear()}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].deleteLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].deleteRight}
        </div>
      </OmpMessageModal>
    </OmpContentWrapper>
  );
};

export default LogClear;
