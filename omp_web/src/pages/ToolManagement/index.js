import { Input, Button, Pagination, Empty, Spin } from "antd";
import { useEffect, useState } from "react";
import styles from "./index.module.less";
import { SearchOutlined } from "@ant-design/icons";
import Card from "./config/card.js";
import AutoTestModal from "./config/modal";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse } from "@/utils/utils";
import { locales } from "@/config/locales";

const ToolManagement = ({ locale }) => {
  // 视口高度
  const viewHeight = useSelector((state) => state.layouts.viewSize.height);
  const history = useHistory();
  const [tabKey, setTabKey] = useState();
  const [searchName, setSearchName] = useState("");
  const [total, setTotal] = useState(0);
  const [modalVisibility, setModalVisibility] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: viewHeight > 955 ? 16 : 12,
    total: 0,
    searchParams: {},
  });
  const [planType, setPlanType] = useState({});
  const context = locales[locale].common;

  const fetchData = (
    pageParams = { current: 1, pageSize: 8 },
    searchParams
  ) => {
    setLoading(true);
    fetchGet(apiRequest.utilitie.queryList, {
      params: {
        page: pageParams.current,
        size: pageParams.pageSize,
        ...searchParams,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setTotal(res.data.count);
          setDataSource(res.data.results);
          setPagination({
            ...pagination,
            total: res.data.count,
            pageSize: pageParams.pageSize,
            current: pageParams.current,
            searchParams: searchParams,
          });
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        location.state = {};
        setLoading(false);
        // fetchSearchlist();
        //fetchIPlist();
      });
  };

  const queryHostInfo = () => {
    setModalLoading(true);
    fetchGet(apiRequest.utilitie.autoTest)
      .then((res) => {
        handleResponse(res, (res) => {
          setPlanType(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setModalLoading(false);
      });
  };

  useEffect(() => {
    fetchData(
      { current: 1, pageSize: pagination.pageSize },
      {
        ...pagination.searchParams,
        kind: tabKey,
      }
    );
  }, [tabKey]);

  return (
    <div>
      {/* -- 顶部区域 -- */}
      <div className={styles.header}>
        <div className={styles.headerTabRow}>
          {/* -- tab 标签 -- */}
          <div
            className={styles.headerTab}
            onClick={(e) => {
              setPagination({
                current: 1,
                pageSize: viewHeight > 955 ? 16 : 12,
                total: 0,
                searchParams: {},
              });
              if (e.target.innerHTML === context.all) {
                setTabKey();
              } else if (
                e.target.innerHTML ===
                context.management + context.ln + context.tool
              ) {
                setTabKey(0);
              } else if (
                e.target.innerHTML ===
                context.security + context.ln + context.tool
              ) {
                setTabKey(2);
              }
            }}
          >
            <div
              style={tabKey == undefined ? { color: "rgb(46, 124, 238)" } : {}}
            >
              {context.all}
            </div>
            <div>|</div>
            <div style={tabKey == "0" ? { color: "rgb(46, 124, 238)" } : {}}>
              {context.management + context.ln + context.tool}
            </div>
            <div>|</div>
            <div style={tabKey == "2" ? { color: "rgb(46, 124, 238)" } : {}}>
              {context.security + context.ln + context.tool}
            </div>
          </div>

          {/* -- 过滤/自动化测试 -- */}
          <div className={styles.headerBtn}>
            <Input
              placeholder={
                context.input +
                context.ln +
                context.task +
                context.ln +
                context.name
              }
              suffix={
                !searchName && <SearchOutlined style={{ color: "#b6b6b6" }} />
              }
              style={{ marginRight: 10, width: 280 }}
              value={searchName}
              allowClear
              onChange={(e) => {
                setSearchName(e.target.value);
                if (!e.target.value) {
                  fetchData(
                    {
                      current: 1,
                      pageSize: pagination.pageSize,
                    },
                    {
                      ...pagination.searchParams,
                      kind: tabKey,
                      name: null,
                    }
                  );
                }
              }}
              onBlur={() => {
                fetchData(
                  {
                    current: 1,
                    pageSize: pagination.pageSize,
                  },
                  {
                    ...pagination.searchParams,
                    name: searchName,
                    kind: tabKey,
                  }
                );
              }}
              onPressEnter={() => {
                fetchData(
                  {
                    current: 1,
                    pageSize: pagination.pageSize,
                  },
                  {
                    ...pagination.searchParams,
                    name: searchName,
                    kind: tabKey,
                  }
                );
              }}
            />
            <Button
              style={{ marginRight: 10 }}
              type="primary"
              onClick={() => {
                queryHostInfo();
                setModalVisibility(true);
              }}
            >
              {context.automatedTest}
            </Button>
          </div>
        </div>

        <hr className={styles.headerHr} />
        <div className={styles.headerSearch}>
          <div className={styles.headerSearchCondition}></div>
          <div className={styles.headerSearchInfo} style={{ paddingTop: 8 }}>
            {context.total} {total}
          </div>
        </div>
      </div>

      {/* -- 小工具卡片 -- */}
      <Spin spinning={loading}>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {dataSource.length == 0 ? (
            <Empty
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: viewHeight > 955 ? 500 : 300,
                flexDirection: "column",
              }}
              description={context.noData}
            />
          ) : (
            <>
              {dataSource.map((item, idx) => {
                return (
                  <Card
                    history={history}
                    key={idx}
                    idx={idx + 1}
                    info={item}
                    context={context}
                  />
                );
              })}
            </>
          )}
        </div>
      </Spin>

      {/* -- 分页 -- */}
      {dataSource.length !== 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            position: "relative",
            top: 25,
          }}
        >
          <Pagination
            onChange={(e) => {
              fetchData(
                { ...pagination, current: e },
                {
                  ...pagination.searchParams,
                  kind: tabKey,
                }
              );
            }}
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
          />
        </div>
      )}

      {/* -- 自动化测试 -- */}
      <AutoTestModal
        modalVisibility={modalVisibility}
        setModalVisibility={setModalVisibility}
        modalLoading={modalLoading}
        setModalLoading={setModalLoading}
        planType={planType}
        history={history}
        context={context}
      />
    </div>
  );
};

export default ToolManagement;
