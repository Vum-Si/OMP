import { OmpContentWrapper, OmpTable, OmpMessageModal } from "@/components";
import {
  Button,
  message,
  Menu,
  Dropdown,
  Input,
  Select,
  Spin,
  Tooltip,
  Form,
  Cascader,
} from "antd";
import { useHistory } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse, createDataByCascader } from "@/utils/utils";
import styles from "./index.module.less";
import Readme from "@/pages/ToolManagement/detail/Readme";
import { ConfigDetail } from "./drawer";
import { EditConfigModal, EditDepModal } from "./modal";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import {
  DownOutlined,
  FileProtectOutlined,
  ZoomInOutlined,
} from "@ant-design/icons";
import { locales } from "@/config/locales";

const ReadmeText = {
  "en-US":
    '### Query Rules\n\nIn the query results, the default configuration item is carried: `service_instance_name` service instance\n\n-   Support service/product dimension queries, product level queries will display all services under the product\n-   Support single/multiple configuration item field queries\n\n**Subfield query**\n\nThe configuration item supports input. When a field is too large to meet the filtering criteria, it can be filtered based on subfields, such as:\n\n```text\ninstall_detail_args\t\t\t\t\t\t// install params\ninstall_detail_args.memory\t\t\t\t// install params.memory\n```\n\n### Configuration Items\n\n**install_detail_args**\n\nInstall params, Installation is a custom parameter provided, and different services will customize different parameter names and values without fixed naming rules\n\nSupport modification: `yes` (partially can\'t edit)\n\nThere are subfields present: `yes`\n\n| Common subfields                 | description                         |\n| -------------------------------- | ----------------------------------- |\n| install_detail_args.base_dir     | Installation directory (can\'t edit) |\n| install_detail_args.log_dir      | Log directory (can\'t edit)          |\n| install_detail_args.data_dir     | Data directory (can\'t edit)         |\n| install_detail_args.memory       | Memory                              |\n| install_detail_args.username     | Username                            |\n| install_detail_args.password     | Password                            |\n| install_detail_args.password_enc | Password ciphertext                 |\n| install_detail_args.run_user     | Run User                            |\n\n**service_port**\n\nService port related information. There may be multiple ports in the service, mainly divided into service ports and monitoring ports. Port names usually end with `_port` \n\nSupport modification: `yes` \n\nThere are subfields present: `yes`\n\n| Common subfields          | description              |\n| ------------------------- | ------------------------ |\n| service_port.service_port | Service run binding port |\n| service_port.metrics_port | Service metrics port     |\n\n**service_controllers**\n\nControl the script path, define the operation path within the service lifecycle, and mainly maintain the path of the start stop restart script\n\nSupport modification: `yes` \n\nThere are subfields present: `yes`\n\n| Common subfields            | description             |\n| --------------------------- | ----------------------- |\n| service_controllers.start   | Service start command   |\n| service_controllers.stop    | Service stop command    |\n| service_controllers.restart | Service restart command |\n\n**service_role**\n\nThe role played by the service instance, whether it is a master or slave or other defined role\n\nFor example, in MySQL, there are roles of `master` and `slave`, which can be configured by referring to the role fields in the installation template for reference\n\nSupport modification: `yes` \n\nThere are subfields present: `no`\n\n**service_status**\n\nCurrent service status, enumeration\n\nSupport:"正常","启动中","停止中","重启中","停止", "未知",  "安装中","安装失败","待安装", "删除中","升级中",  "回滚中"\n\nSupport modification: `yes` (Not recommended unless necessary)\n\nThere are subfields present: `no`\n\n**vip**\n\nVirtual IP may be required for high availability mode of some installation services, such as MySQL and Tengine\nNote: The IP cannot conflict with the IP bound to the existing host\n\nSupport modification: `yes` \n\nThere are subfields present: `no`\n\n**deploy_mode**  \n\nDeployment mode, such as the installation mode of Flink, such as:  dodp mode is dodp_all/dodb\n\nSupport modification: `yes` \n\nThere are subfields present: `no`\n',
  "zh-CN":
    '### 查询规则\n\n查询结果中，默认携带配置项：`service_instance_name` 服务实例名\n\n-   支持服务/产品维度查询，产品级查询将显示产品下所有服务\n-   支持单/多配置项字段查询\n\n**子字段查询**\n\n配置项支持输入，当一个字段过大不足以满足筛选时，可根据子字段进行筛选，例如：\n\n```text\ninstall_detail_args\t\t\t\t\t\t// 安装参数\ninstall_detail_args.memory\t\t\t\t// 安装参数.内存参数\n```\n\n### 配置项解释\n\n**install_detail_args**\n\n安装参数，安装是提供的自定义参数，不同的服务会自定义不同参数名称和值，无固定命名规则\n\n支持修改：`是`（部分不支持）\n\n存在子字段：`是`\n\n| 常用子字段                       | 说明                   |\n| -------------------------------- | ---------------------- |\n| install_detail_args.base_dir     | 安装目录（不支持修改） |\n| install_detail_args.log_dir      | 日志目录（不支持修改） |\n| install_detail_args.data_dir     | 数据目录（不支持修改） |\n| install_detail_args.memory       | 内存参数               |\n| install_detail_args.username     | 登陆用户               |\n| install_detail_args.password     | 登陆密码               |\n| install_detail_args.password_enc | 密码密文               |\n| install_detail_args.run_user     | 运行用户               |\n\n**service_port**\n\n服务端口相关信息，服务可能会存在多个端口，主要分为服务端口和监控端口，端口命名一般以 `_port` 为结尾\n\n支持修改：`是`\n\n存在子字段：`是`\n\n| 常用子字段                | 说明                 |\n| ------------------------- | -------------------- |\n| service_port.service_port | 服务运行基础绑定端口 |\n| service_port.metrics_port | 服务监控端口         |\n\n**service_controllers**\n\n控制脚本路径，定义关于服务生命周期内操作路径，主要维护 start stop restart 脚本的路径\n\n支持修改：`是`\n\n存在子字段：`是`\n\n| 常用子字段                  | 说明         |\n| --------------------------- | ------------ |\n| service_controllers.start   | 服务启动命令 |\n| service_controllers.stop    | 服务停止命令 |\n| service_controllers.restart | 服务重启命令 |\n\n**service_role**\n\n服务实例所扮演的角色，主或者从或者其余定义角色\n\n例如：mysql，存在 `master` 和 `slave` 角色，可参考安装模版里的角色字段进行配置参考\n\n支持修改：`是`\n\n存在子字段：`否`\n\n**service_status**\n\n当前服务的状态，枚举\n\n支持："正常","启动中","停止中","重启中","停止", "未知",  "安装中","安装失败","待安装", "删除中","升级中",  "回滚中"\n\n支持修改：`是`（非必要不建议修改）\n\n存在子字段：`否`\n\n**vip**\n\n虚拟 IP，部分安装服务的高可用模式可能需要使用，如：mysql，tengine\n\n注意：IP不能和现有主机绑定的 IP 存在冲突\n\n支持修改：`是`\n\n存在子字段：`否`\n\n**deploy_mode**  \n\n部署模式，如 flink 的安装模式，如 dodp 模式为 dodp_all/dodb \n\n支持修改：`是`\n\n存在子字段：`否`\n\n',
};

const msgMap = {
  "en-US": {
    paramMsg: "Explanation of config item parameters",
    checkMsg: "Please check the query criteria",
    app_dependence: "Service Dependence",
    service_dependence: "Service Dependence",
    install_detail_args: "Install Params",
    service_instance_name: "Service Instance",
    service_controllers: "Control Script",
    vip: "Virtual IP",
    service_status: "Service Status",
    service_role: "Service Role",
    service_port: "Service Port",
    ip: "IP",
    deploy_mode: "Deploy Mode",
    app_version: "Package Version",
    app_name: "Package Name",
    app_port: "Service Port",
    app_install_args: "Install Params",
    pullLeft: "Are you sure to execute synchronization for a total of",
    pullRight: "services?",
  },
  "zh-CN": {
    paramMsg: "配置项参数解释",
    checkMsg: "请检查查询条件",
    pullLeft: "确认下发配置同步任务到总计",
    pullRight: "个服务吗?",
  },
};

const ServiceConfig = ({ locale }) => {
  const history = useHistory();
  // 操作类型
  const [configType, setConfigType] = useState(0);
  const [labelControl, setLabelControl] = useState("app_name");
  // 下拉框选择信息
  const [configDataSource, setConfigDataSource] = useState(null);
  const [pkgConfigDataSource, setPkgConfigDataSource] = useState(null);
  const [selectValue, setSelectValue] = useState([]);
  const [fieldValue, setFieldValue] = useState([]);
  //选中的数据
  const [checkedList, setCheckedList] = useState([]);
  // 加载
  const [loading, setLoading] = useState(false);
  // 表格数据源
  const [dataSource, setDataSource] = useState([]);
  // 表格动态列渲染
  const [tableColumns, setTableColumns] = useState([]);
  // 侧边栏展示控件
  const [isShowDrawer, setIsShowDrawer] = useState(false);
  const [drawerData, setDrawerData] = useState(null);
  // 同步配置 modal 展示控件
  const [pullModallVisibility, setPushModallVisibility] = useState(false);
  const [pullLoading, setPullLoading] = useState(false);
  // 编辑表单
  const [editLoading, setEditLoading] = useState(false);
  const [editModalVisibility, setEditModalVisibility] = useState(false);
  const [editConfigField, setEditConfigField] = useState([]);
  // 通过查询后配置项，单独控制编辑按钮 和 配置同步按钮
  const [realFiedlValue, setRealFieldValue] = useState([]);
  const [realLabelValue, setRealLabelValue] = useState([]);
  // 依赖表单
  const [depLoading, setDepLoading] = useState(false);
  const [depModalVisibility, setDepModalVisibility] = useState(false);
  const [depAction, setDepAction] = useState(null);
  const [depDataSource, setDepDataSource] = useState([]);
  // 表单追踪
  const [depForm] = Form.useForm();
  // 当前依赖列表
  const [depArr, setDepArr] = useState([]);
  // 查询 body 追踪
  const [nowQueryBody, setNowQueryBody] = useState(null);
  // config 表单追踪
  const [confForm] = Form.useForm();
  const context = locales[locale].common;

  // 查询服务配置项
  const fetchServiceConfig = () => {
    setLoading(true);
    fetchGet(apiRequest.appStore.queryServiceConfig)
      .then((res) => {
        handleResponse(res, (res) => {
          setConfigDataSource(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 查询安装包配置项
  const fetchPkgConfig = () => {
    setLoading(true);
    fetchGet(apiRequest.appStore.queryServiceConfig, {
      params: {
        ser_or_app: "app",
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setPkgConfigDataSource(res.data);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 构建动态列
  const createColumn = (head, body) => {
    const resColumn = [
      {
        title: context.row,
        key: "_idx",
        dataIndex: "_idx",
        align: "center",
        width: 80,
        fixed: "left",
      },
    ];

    for (let i = 0; i < head.length; i++) {
      const element = head[i];
      if (element.key === "id") continue;
      if (element.type === "str") {
        resColumn.push({
          title: msgMap[locale][element.key] || element.name,
          key: element.key,
          dataIndex: element.key,
          align: "center",
          render: (text, record) => {
            return {
              children: <Tooltip title={text}>{text ? text : "-"}</Tooltip>,
              props: {},
            };
          },
        });
      } else if (element.type === "obj") {
        resColumn.push({
          title: msgMap[locale][element.key] || element.name,
          key: element.key,
          dataIndex: element.key,
          align: "center",
          render: (text, record) => {
            return {
              children:
                text.length > 0 ? (
                  <a
                    onClick={() => {
                      setIsShowDrawer(true);
                      setDrawerData({
                        element: element,
                        data: text,
                      });
                    }}
                  >
                    <ZoomInOutlined style={{ marginRight: 6 }} />
                    {context.view + context.ln + context.param}
                  </a>
                ) : (
                  "-"
                ),
              props: {},
            };
          },
        });
        continue;
      } else if (element.type === "de") {
        resColumn.push({
          title: msgMap[locale][element.key] || element.name,
          key: element.key,
          dataIndex: element.key,
          align: "center",
          render: (text, record) => {
            return {
              children:
                text.length > 0 ? (
                  <a
                    onClick={() => {
                      setIsShowDrawer(true);
                      setDrawerData({
                        element: element,
                        data: text,
                      });
                    }}
                  >
                    <ZoomInOutlined style={{ marginRight: 6 }} />
                    {msgMap[locale][element.key] || element.name}
                  </a>
                ) : (
                  "-"
                ),
              props: {},
            };
          },
        });
        continue;
      } else if (element.type === "pkg_de") {
        resColumn.push({
          title: msgMap[locale][element.key] || element.name,
          key: element.key,
          dataIndex: element.key,
          align: "center",
          render: (text, record) => {
            return {
              children:
                text.length > 0 ? (
                  <a
                    onClick={() => {
                      setIsShowDrawer(true);
                      setDrawerData({
                        element: element,
                        data: text,
                      });
                    }}
                  >
                    <ZoomInOutlined style={{ marginRight: 6 }} />
                    {msgMap[locale][element.key] || element.name}
                  </a>
                ) : (
                  "-"
                ),
              props: {},
            };
          },
        });
        continue;
      } else {
        continue;
      }
    }

    setTableColumns(resColumn);
  };

  // 查询具体配置项内容
  const queryConfig = (currentBody) => {
    const bodyInfo = {};
    if (!currentBody) {
      if (selectValue.length === 0 || fieldValue.length === 0) {
        message.info(msgMap[locale].checkMsg);
        return;
      }
      bodyInfo["change_type"] = configType;
      bodyInfo["ser_field"] = fieldValue;
      if (labelControl === "pkg") {
        bodyInfo["ser_or_app"] = "app";
        bodyInfo["data"] = createDataByCascader(
          selectValue,
          pkgConfigDataSource.data,
          true
        );
      } else {
        bodyInfo["ser_or_app"] = "ser";
        bodyInfo[labelControl === "app_name" ? "app_name" : "product_name"] =
          selectValue;
      }
    }
    setLoading(true);
    fetchPost(apiRequest.appStore.queryServiceConfig, {
      body: currentBody || bodyInfo,
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setCheckedList([]);

          setTableColumns([]);
          createColumn(res.data.head, res.data.body);

          setDataSource([]);
          setDataSource(
            res.data.body.map((item, idx) => {
              return {
                ...item,
                _idx: idx + 1,
              };
            })
          );

          // 设置当前body，用于操作后追踪
          setNowQueryBody(currentBody || bodyInfo);

          if (!currentBody) {
            setRealFieldValue(fieldValue);
            setRealLabelValue(labelControl);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 编辑配置项
  const editConfig = (data) => {
    setEditLoading(true);
    fetchPost(apiRequest.appStore.editServiceConfig, {
      body: {
        change_type: configType,
        ids: checkedList.map((e) => e.id),
        char: data.char,
        ser_field: data.ser_field[0],
        de_info: {},
        ser_or_app: labelControl === "pkg" ? "app" : "ser",
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setEditModalVisibility(false);
          setIsShowDrawer(false);
          setCheckedList([]);
          confForm.setFieldsValue({
            ser_field: [],
            char: "",
          });
          queryConfig(nowQueryBody);
          message.success(context.edit + context.ln + context.succeeded);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setEditLoading(false);
      });
  };

  // 编辑依赖
  const editDep = (action) => {
    setLoading(true);
    fetchPost(apiRequest.appStore.editServiceDep, {
      body: {
        ser_or_app: realLabelValue === "pkg" ? "app" : "ser",
        action: action,
        current_body:
          realLabelValue === "pkg"
            ? dataSource.map((e) => {
                return {
                  id: e.id,
                  app_name: e.app_name,
                  app_version: e.app_version,
                  app_dependence: e.app_dependence,
                };
              })
            : dataSource.map((e) => {
                return {
                  id: e.id,
                  service_dependence: e.service_dependence,
                  service_instance_name: e.service_instance_name,
                };
              }),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setDepAction(action);
          setDepDataSource(res.data);
          setDepModalVisibility(true);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 编辑依赖
  const editDepConfig = (action, data) => {
    setDepLoading(true);
    fetchPost(apiRequest.appStore.editServiceConfig, {
      body: {
        change_type: nowQueryBody.change_type,
        ser_or_app: realLabelValue === "pkg" ? "app" : "ser",
        ids: checkedList.map((e) => e.id),
        char: "de",
        ser_field:
          realLabelValue === "pkg" ? "app_dependence" : "service_dependence",
        de_info: {
          action: action,
          name: action === "del" ? data.char[0][0] : data.char[0],
          app_type: realLabelValue === "pkg" ? "" : data.configType,
          char:
            action === "del"
              ? data.char[0].length === 1
                ? depDataSource.filter((e) => e.name === data.char[0][0])[0]
                    .char
                : data.char.map((e) => e[1])
              : [data.char[1]],
        },
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setDepModalVisibility(false);
          setCheckedList([]);
          setDepArr([]);
          depForm.setFieldsValue({
            configType: realLabelValue === "pkg" ? "pkg_name" : "instance_name",
            char: [],
          });
          queryConfig(nowQueryBody);
          message.success(context.edit + context.ln + context.succeeded);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setDepLoading(false);
      });
  };

  // 同步配置
  const pullConfig = () => {
    setPullLoading(true);
    fetchPost(apiRequest.appStore.pullConfig, {
      body: {
        ids: checkedList.map((e) => e.id),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.data.code == 1) {
            message.warning(res.data.message);
          } else {
            history.push({
              pathname: "/application_management/app_store/installation",
              state: {
                uniqueKey: res.data,
                step: 4,
              },
            });
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setPullLoading(false);
      });
  };

  // 加密解密
  const postRsa = (type) => {
    setEditLoading(true);
    fetchPost(apiRequest.appStore.postRsa, {
      body: {
        action: type,
        plain_text: confForm.getFieldValue("char"),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          confForm.setFieldsValue({
            char: res.data,
          });
          message.success(
            type === "public"
              ? context.encrypt + context.ln + context.succeeded
              : context.decrypt + context.ln + context.succeeded
          );
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setEditLoading(false);
      });
  };

  useEffect(() => {
    fetchServiceConfig();
    fetchPkgConfig();
  }, []);

  return (
    <OmpContentWrapper>
      <div style={{ display: "flex" }}>
        {["service_dependence", "app_dependence"].includes(
          realFiedlValue[0]
        ) ? (
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item
                  key="closeMaintain"
                  style={{ textAlign: "center" }}
                  disabled={checkedList.length === 0}
                  onClick={() => editDep("add")}
                >
                  {context.add}
                </Menu.Item>
                <Menu.Item
                  key="reStartHost"
                  style={{ textAlign: "center" }}
                  disabled={checkedList.length === 0}
                  onClick={() => editDep("edit")}
                >
                  {context.edit}
                </Menu.Item>
                <Menu.Item
                  key="reStartMonitor"
                  style={{ textAlign: "center" }}
                  disabled={checkedList.length === 0}
                  onClick={() => editDep("del")}
                >
                  {context.delete}
                </Menu.Item>
              </Menu>
            }
            placement="bottomCenter"
          >
            <Button
              style={{ paddingRight: 10, paddingLeft: 15 }}
              type="primary"
            >
              {context.action}
              <DownOutlined />
            </Button>
          </Dropdown>
        ) : (
          <>
            <Button
              type="primary"
              disabled={checkedList.length === 0}
              onClick={() => setEditModalVisibility(true)}
            >
              {context.edit}
            </Button>
            {realLabelValue !== "pkg" && (
              <Button
                style={{
                  marginLeft: 10,
                }}
                type="primary"
                disabled={checkedList.length === 0}
                onClick={() => setPushModallVisibility(true)}
              >
                {context.synchronization}
              </Button>
            )}
          </>
        )}

        {/* -- 右侧查询 -- */}
        <div style={{ display: "flex", marginLeft: "auto" }}>
          <Input.Group compact style={{ display: "flex" }}>
            <Select
              value={labelControl}
              onChange={(e) => {
                setLabelControl(e);
                setSelectValue([]);
                setConfigType(0);
                setFieldValue([]);
              }}
            >
              <Select.Option value="product_name">
                {context.product + context.ln + context.instance}
              </Select.Option>
              <Select.Option value="app_name">
                {context.service + context.ln + context.instance}
              </Select.Option>
              <Select.Option value="pkg">
                {context.service + context.ln + context.package}
              </Select.Option>
            </Select>
            {labelControl === "app_name" && (
              <Select
                mode="multiple"
                placeholder={context.select + context.ln + context.service}
                maxTagCount="responsive"
                onChange={(e) => setSelectValue(e)}
                style={{ width: 200 }}
              >
                {configDataSource?.app_name.map((e) => {
                  return (
                    <Select.Option key={e} value={e}>
                      {e}
                    </Select.Option>
                  );
                })}
              </Select>
            )}
            {labelControl === "product_name" && (
              <Select
                mode="multiple"
                placeholder={context.select + context.ln + context.product}
                maxTagCount="responsive"
                onChange={(e) => setSelectValue(e)}
                style={{ width: 200 }}
              >
                {configDataSource?.product_name.map((e) => {
                  return (
                    <Select.Option key={e} value={e}>
                      {e}
                    </Select.Option>
                  );
                })}
              </Select>
            )}
            {labelControl === "pkg" && (
              <Cascader
                style={{ width: 200 }}
                options={pkgConfigDataSource?.data.map((e) => {
                  return {
                    label: e.name,
                    value: e.name,
                    children: e.version.map((i) => {
                      return {
                        label: i,
                        value: i,
                      };
                    }),
                  };
                })}
                onChange={(value) => setSelectValue(value)}
                multiple
                maxTagCount="responsive"
                placeholder={context.select + context.ln + context.package}
              />
            )}
          </Input.Group>

          <Input.Group compact style={{ display: "flex" }}>
            <Select
              value={configType}
              onChange={(e) => {
                setConfigType(e);
                if (e === 1 || e === 2) {
                  setFieldValue(
                    labelControl === "pkg"
                      ? ["app_dependence"]
                      : ["service_dependence"]
                  );
                } else {
                  setFieldValue([]);
                }
              }}
            >
              <Select.Option value={0}>{context.config}</Select.Option>
              <Select.Option value={1}>{context.dependent}</Select.Option>
              <Select.Option value={2} disabled={labelControl !== "pkg"}>
                {context.dependentOn}
              </Select.Option>
            </Select>
            {configType === 0 && (
              <Select
                mode="tags"
                placeholder={context.select + context.ln + context.config}
                maxTagCount="responsive"
                value={fieldValue}
                onChange={(e) => setFieldValue(e)}
                style={{ width: 260 }}
              >
                {labelControl === "pkg"
                  ? pkgConfigDataSource?.ser_field.map((e) => {
                      return (
                        <Select.Option key={e} value={e}>
                          {e}
                        </Select.Option>
                      );
                    })
                  : configDataSource?.ser_field.map((e) => {
                      return (
                        <Select.Option key={e} value={e}>
                          {e}
                        </Select.Option>
                      );
                    })}
              </Select>
            )}
            {configType !== 0 && (
              <Select disabled style={{ width: 260 }} value={fieldValue}>
                <Select.Option
                  key={
                    labelControl === "pkg"
                      ? "app_dependence"
                      : "service_dependence"
                  }
                  value={
                    labelControl === "pkg"
                      ? "app_dependence"
                      : "service_dependence"
                  }
                >
                  {labelControl === "pkg"
                    ? "app_dependence"
                    : "service_dependence"}
                </Select.Option>
              </Select>
            )}
          </Input.Group>

          <Button
            style={{ marginLeft: 10 }}
            type="primary"
            onClick={() => queryConfig()}
          >
            {context.query}
          </Button>
        </div>
      </div>

      {/* -- 表格 -- */}
      <Spin spinning={loading}>
        {dataSource.length > 0 ? (
          <div
            style={{
              border: "1px solid #ebeef2",
              marginTop: 10,
            }}
          >
            <OmpTable
              noScroll={tableColumns.length < 10}
              loading={loading}
              columns={tableColumns}
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
        ) : (
          <div className={styles.readme}>
            <div className={styles.readmeTitle}>
              <FileProtectOutlined style={{ fontSize: 16, marginRight: 10 }} />
              <span style={{ color: "rgb(34, 34, 34)" }}>
                {msgMap[locale].paramMsg}
              </span>
            </div>
            <div className={styles.readmeContent}>
              <Readme text={ReadmeText[locale]} />
            </div>
          </div>
        )}
      </Spin>

      {/* -- 配置详情 -- */}
      <ConfigDetail
        isShowDrawer={isShowDrawer}
        setIsShowDrawer={setIsShowDrawer}
        drawerData={drawerData}
        setDrawerData={setDrawerData}
        setEditModalVisibility={setEditModalVisibility}
        confForm={confForm}
        context={context}
        msgMap={msgMap}
        locale={locale}
      />

      {/* -- 编辑配置 -- */}
      <EditConfigModal
        loading={editLoading}
        editConfigField={editConfigField}
        setEditConfigField={setEditConfigField}
        modalVisibility={editModalVisibility}
        setModalVisibility={setEditModalVisibility}
        fieldValue={realFiedlValue}
        editConfig={editConfig}
        postRsa={postRsa}
        confForm={confForm}
        context={context}
        locale={locale}
      />

      {/* -- 编辑依赖 -- */}
      <EditDepModal
        loading={depLoading}
        modalVisibility={depModalVisibility}
        setModalVisibility={setDepModalVisibility}
        editDepConfig={editDepConfig}
        action={depAction}
        depDataSource={depDataSource}
        depForm={depForm}
        depArr={depArr}
        setDepArr={setDepArr}
        realLabelValue={realLabelValue}
        context={context}
      />

      {/* -- 配置同步 -- */}
      <OmpMessageModal
        visibleHandle={[pullModallVisibility, setPushModallVisibility]}
        context={context}
        loading={pullLoading}
        onFinish={() => pullConfig()}
      >
        <div style={{ padding: "20px" }}>
          {msgMap[locale].pullLeft}
          <span style={{ fontWeight: 600, color: "red" }}>
            {" "}
            {checkedList.length}{" "}
          </span>
          {msgMap[locale].pullRight}
        </div>
      </OmpMessageModal>
    </OmpContentWrapper>
  );
};

export default ServiceConfig;
