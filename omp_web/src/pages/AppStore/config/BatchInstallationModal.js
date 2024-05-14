import { Button, Modal, Select, Switch } from "antd";
import { useEffect, useRef, useState } from "react";
import { CopyOutlined } from "@ant-design/icons";
//import BMF from "browser-md5-file";
import { fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse } from "@/utils/utils";
import { OmpTable } from "@/components";
import { useHistory } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { getStep1ChangeAction } from "./Installation/store/actionsCreators";
import { getUniqueKeyChangeAction } from "../store/actionsCreators";

const BatchInstallationModal = ({
  bIModalVisibility,
  setBIModalVisibility,
  dataSource,
  deployListInfo,
  installTitle,
  initLoading,
  context,
}) => {
  const uniqueKey = useSelector((state) => state.appStore.uniqueKey);
  const reduxDispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const history = useHistory();
  //选中的数据
  const [checkedList, setCheckedList] = useState([]);
  //应用服务选择的版本号
  const versionInfo = useRef({});
  const [deployTypeList, setDeployTypeList] = deployListInfo;
  // 高可用是否开启
  const [highAvailabilityCheck, setHighAvailabilityCheck] = useState(false);

  const columns = [
    {
      title: context.appName,
      key: "name",
      dataIndex: "name",
      align: "center",
      ellipsis: true,
      width: 100,
    },
    {
      title: context.version,
      key: "version",
      dataIndex: "version",
      align: "center",
      ellipsis: true,
      width: 100,
      render: (text, record) => {
        return (
          <Select
            bordered={false}
            defaultValue={text[0]}
            style={{ width: 120 }}
            onSelect={(v) => {
              versionInfo.current[record.name] = v;
              deployTypeList[record.name] = "default";
              setDeployTypeList(deployTypeList);
            }}
          >
            {text.map((item) => {
              return (
                <Select.Option value={item} key={`${item}-${record.name}`}>
                  {item}
                </Select.Option>
              );
            })}
          </Select>
        );
      },
    },
    {
      title: context.deployment + context.ln + context.type,
      key: "deploy_list",
      dataIndex: "deploy_list",
      align: "center",
      ellipsis: true,
      width: 140,
      render: (text, record) => {
        const version = versionInfo.current[record.name] || record.version[0];
        const deployArr = record.deploy_list[version];
        if (deployArr.length === 0) {
          return (
            <span
              style={{
                fontSize: 14,
                right: 120,
              }}
            >
              {context.general}
            </span>
          );
        }
        return (
          <Select
            defaultValue={"default"}
            style={{ width: 140, textAlign: "left" }}
            value={deployTypeList[record.name]}
            onSelect={(v) => {
              deployTypeList[record.name] = v;
              setDeployTypeList(deployTypeList);
            }}
          >
            <Select.Option value="default" key="default">
              {context.general}
            </Select.Option>
            {deployArr.map((item) => {
              return (
                <Select.Option value={item} key={item}>
                  {item}
                </Select.Option>
              );
            })}
          </Select>
        );
      },
    },
  ];

  // 批量安装/服务安装选择确认请求
  const createInstallInfo = (install_product) => {
    setLoading(true);
    fetchPost(apiRequest.appStore.createInstallInfo, {
      body: {
        high_availability: highAvailabilityCheck,
        install_product: install_product,
        unique_key: uniqueKey,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.data && res.data.data) {
            reduxDispatch(getStep1ChangeAction(res.data.data));
          }
          history.push("/application_management/app_store/installation");
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 组件安装
  const createComponentInstallInfo = (install_product) => {
    setLoading(true);
    fetchPost(apiRequest.appStore.createComponentInstallInfo, {
      body: {
        high_availability: highAvailabilityCheck,
        install_component: install_product,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.data && res.data.data) {
            reduxDispatch(getStep1ChangeAction(res.data.data));
            reduxDispatch(getUniqueKeyChangeAction(res.data.unique_key));
          }
          history.push("/application_management/app_store/installation");
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    // 选中全部
    setCheckedList(dataSource.filter((item) => item.is_continue));
  }, [dataSource]);

  return (
    <Modal
      title={
        <span>
          <span style={{ position: "relative", left: "-10px" }}>
            <CopyOutlined />
          </span>
          <span>
            {installTitle == "服务"
              ? context.install + context.ln + context.application
              : installTitle == "组件"
              ? context.install + context.ln + context.component
              : context.batch + context.ln + context.install}
          </span>
        </span>
      }
      afterClose={() => {
        setCheckedList([]);
        setHighAvailabilityCheck(false);
      }}
      onCancel={() => setBIModalVisibility(false)}
      visible={bIModalVisibility}
      footer={null}
      loading={loading}
      bodyStyle={{
        paddingLeft: 30,
        paddingRight: 30,
      }}
      destroyOnClose
    >
      <div>
        {/* -- 表格 -- */}
        <div style={{ border: "1px solid rgb(235, 238, 242)" }}>
          <OmpTable
            size="small"
            scroll={{ y: 270 }}
            loading={loading || initLoading}
            columns={columns}
            dataSource={dataSource}
            rowKey={(record) => record.name}
            checkedState={[checkedList, setCheckedList]}
            pagination={false}
            notSelectable={(record) => ({
              // is_continue的不能选中
              disabled: !record.is_continue,
            })}
            rowSelection={{
              selectedRowKeys: checkedList?.map((item) => item?.name),
            }}
          />
        </div>

        {/* -- 高可用 -- */}
        <div
          style={{
            display: "flex",
            marginTop: 20,
            justifyContent: "space-between",
            padding: "0px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {context.highAvailability}
            <Switch
              style={{ marginLeft: 10 }}
              checked={highAvailabilityCheck}
              onChange={(e) => setHighAvailabilityCheck(e)}
            />
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ marginRight: 15 }}>
              {context.selected} {checkedList.length} {context.ge}
            </div>
            <div>
              {context.total} {dataSource.length} {context.ge}
            </div>
          </div>
        </div>

        {/* -- 取消/确认 -- */}
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 30 }}
        >
          <div
            style={{
              width: 170,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Button onClick={() => setBIModalVisibility(false)}>
              {context.cancel}
            </Button>
            <Button
              type="primary"
              style={{ marginLeft: 16 }}
              loading={loading || initLoading}
              disabled={checkedList.length == 0}
              onClick={() => {
                if (installTitle == "组件") {
                  let install_product = checkedList.map((item) => {
                    return {
                      name: item.name,
                      version:
                        versionInfo.current[item.name] || item.version[0],
                      self_deploy_mode: deployTypeList[item.name],
                    };
                  });
                  createComponentInstallInfo(install_product);
                } else {
                  let install_product = checkedList.map((item) => {
                    return {
                      name: item.name,
                      version:
                        versionInfo.current[item.name] || item.version[0],
                      self_deploy_mode: deployTypeList[item.name],
                    };
                  });
                  createInstallInfo(install_product);
                }
              }}
            >
              {context.ok}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BatchInstallationModal;
