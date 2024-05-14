import { OmpContentWrapper } from "@/components";
import { Button, Table, Tooltip, Spin } from "antd";
import { useState, useEffect } from "react";
import { handleResponse, _idxInit, downloadFile } from "@/utils/utils";
import { fetchGet } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { QuestionCircleOutlined, FileProtectOutlined } from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import styles from "./index.module.less";
import Readme from "./Readme.js";
import initLogo from "../initLogo/tools.svg";
import { locales } from "@/config/locales";

const msgMap = {
  "en-US": {
    targetMsg:
      "The target object type of the tool can be a host or a specific service",
  },
  "zh-CN": {
    targetMsg: "实用工具操作的目标对象类型，可以是主机或者具体服务",
  },
};

const Details = ({ locale }) => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const locationArr = useLocation().pathname.split("/");
  const [info, setInfo] = useState({});
  const context = locales[locale].common;
  const kindMap = [
    context.management + context.ln + context.tool,
    context.check + context.ln + context.tool,
    context.security + context.ln + context.tool,
    context.other + context.ln + context.tool,
  ];

  const argType = {
    select: context.radio,
    file: context.file,
    input: context.text,
  };

  const queryInfo = () => {
    setLoading(true);
    fetchGet(
      `${apiRequest.utilitie.queryList}${locationArr[locationArr.length - 1]}/`
    )
      .then((res) => {
        handleResponse(res, (res) => {
          setInfo(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    queryInfo();
  }, []);

  return (
    <OmpContentWrapper wrapperStyle={{ padding: "20px 30px" }}>
      <Spin spinning={loading}>
        <div className={styles.header}>
          {/* -- logo -- */}
          {!info.logo ? (
            <div className={styles.icon}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  fontSize: 22,
                  backgroundColor: "#f5f5f5",
                  color: "#fff",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <img
                    style={{
                      width: "65px",
                      height: "65px",
                      position: "relative",
                      top: 1,
                    }}
                    src={initLogo}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.icon}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  fontSize: 22,
                  backgroundColor: "#f5f5f5",
                  color: "#fff",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <img
                    style={{
                      width: "65px",
                      height: "65px",
                      position: "relative",
                      top: 1,
                    }}
                    src={`${info.logo}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* -- 执行/下载/返回 -- */}
          <div className={styles.headerContent}>
            <div className={styles.headerContentTitle}>{info.name}</div>
            <div className={styles.headerContentDescribe}>
              {info.description}
            </div>
            <div className={styles.headerContentBtn}>
              <Button
                style={{ padding: "3px 20px", height: 30 }}
                type="primary"
                onClick={() => {
                  history?.push({
                    pathname: `/utilitie/tool-management/tool-execution/${
                      locationArr[locationArr.length - 1]
                    }`,
                  });
                }}
              >
                {context.execute}
              </Button>
              <Button
                style={{ padding: "3px 20px", height: 30, marginLeft: 20 }}
                onClick={() => downloadFile(`/${info.tar_url}`)}
              >
                {context.download}
              </Button>
            </div>
          </div>
          <div className={styles.headerBtn}>
            <Button
              style={{ padding: "3px 20px", height: 30 }}
              onClick={() => {
                history?.goBack();
              }}
            >
              {context.back}
            </Button>
          </div>
        </div>

        {/* -- 类别/执行对象 -- */}
        <div className={styles.detailInfo}>
          <div className={styles.detailItem}>
            <div className={styles.detailItemLabel}>{context.type}</div>
            <div>{kindMap[info.kind]}</div>
          </div>
          <div className={styles.detailItem} style={{ paddingBottom: 10 }}>
            <div className={styles.detailItemLabel}>
              {context.target}
              <Tooltip placement="right" title={msgMap[locale].targetMsg}>
                <QuestionCircleOutlined
                  style={{
                    marginLeft: 10,
                    fontSize: 16,
                    position: "relative",
                    top: 1,
                  }}
                />
              </Tooltip>
            </div>
            <div>
              {info.target_name == "host" ? context.host : info.target_name}
            </div>
          </div>
        </div>

        {/* -- 执行参数 -- */}
        <div className={styles.detailContent}>
          <div className={styles.detailContentTitle}>
            {context.execute + context.ln + context.parameter}
          </div>
          <div className={styles.tableContainer}>
            <Table
              size="middle"
              columns={[
                {
                  title: context.name,
                  key: "name",
                  dataIndex: "name",
                  align: "center",
                  render: (text) => text || "-",
                },
                {
                  title: context.type,
                  key: "type",
                  dataIndex: "type",
                  align: "center",
                  render: (text) => (text ? argType[text] : "-"),
                },
                {
                  title: context.default + context.ln + context.value,
                  key: "default",
                  dataIndex: "default",
                  align: "center",
                  render: (text) => text || "-",
                },
                {
                  title: context.required,
                  key: "required",
                  dataIndex: "required",
                  align: "center",
                  render: (text) => `${text}`,
                },
              ]}
              pagination={false}
              dataSource={info.script_args}
            />
          </div>
        </div>

        {info && info.templates && info.templates.length > 0 && (
          <div className={styles.detailContent}>
            <div className={styles.detailContentTitle}>
              {context.download +
                context.ln +
                context.example +
                context.ln +
                context.file}
            </div>
            <div className={styles.tableContainer}>
              <Table
                size="middle"
                columns={[
                  {
                    title: context.name,
                    key: "name",
                    dataIndex: "name",
                    align: "center",
                    width: 300,
                  },
                  {
                    title: context.action,
                    key: "sub_url",
                    dataIndex: "sub_url",
                    align: "center",
                    width: 100,
                    render: (text) => {
                      return (
                        <a onClick={() => downloadFile(`/${text}`)}>
                          {context.download}
                        </a>
                      );
                    },
                  },
                ]}
                pagination={false}
                dataSource={info.templates}
              />
            </div>
          </div>
        )}

        <div className={styles.readme}>
          <div className={styles.readmeTitle}>
            <FileProtectOutlined style={{ fontSize: 16, marginRight: 10 }} />
            <span style={{ color: "rgb(34, 34, 34)" }}>README.md</span>
          </div>
          <div className={styles.readmeContent}>
            <Readme text={info.readme_info} />
          </div>
        </div>
      </Spin>
    </OmpContentWrapper>
  );
};

export default Details;
