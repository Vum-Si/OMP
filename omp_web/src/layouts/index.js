import { Layout, Menu, Dropdown, message, Form, Input } from "antd";
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DashboardOutlined,
  CaretDownOutlined,
  CaretUpOutlined,
} from "@ant-design/icons";
import { useState, useEffect, useRef } from "react";
import img from "@/config/logo/logo.svg";
import styles from "./index.module.less";
import getRouterConfig from "@/config/router.config";
import { useHistory, useLocation } from "react-router-dom";
import { CustomBreadcrumb, OmpModal } from "@/components";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import {
  handleResponse,
  _idxInit,
  logout,
  isPassword,
  encrypt,
} from "@/utils/utils";
import { useDispatch } from "react-redux";
import { getSetViewSizeAction } from "./store/actionsCreators";
import { getMaintenanceChangeAction } from "@/pages/SystemManagement/store/actionsCreators";
import { locales } from "@/config/locales";

const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;

const OmpLayout = (props) => {
  const reduxDispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  //不可用状态是一个全局状态，放在layout
  const [disabled, setDisabled] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const rootSubmenuKeys = [
    "/machine-management",
    "/products-management",
    "/operation-management",
    "/actions-record",
    "/product-settings",
    "/system-settings",
  ];
  const [currentOpenedKeys, setCurrentOpenedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  //修改密码弹框
  const [showModal, setShowModal] = useState(false);
  //用户相关信息
  const [userInfo, setUserInfo] = useState({});
  const context = locales[props.locale];
  const comContext = context.common;
  const headerLink = [
    {
      title: context.menu.top.deployment,
      path: "/application_management/deployment-plan",
    },
    {
      title: context.menu.top.grafana,
      path: "/proxy/v1/grafana/d/XrwAXz_Mz/mian-ban-lie-biao",
    },
    // {
    //   title: context.menu.top.container,
    //   path: "/container-service",
    // },
  ];

  const menu = (
    <Menu className="menu">
      <Menu.Item key="changePassword" onClick={() => setShowModal(true)}>
        {context.menu.top.user.changePassword}
      </Menu.Item>
      <Menu.Item key="logout" onClick={() => logout()}>
        {context.menu.top.user.logout}
      </Menu.Item>
    </Menu>
  );

  const toggle = () => {
    setCollapsed(!collapsed);
  };

  const onPathChange = (e) => {
    if (e.key === history.location.pathname) {
      return;
    }
    // homepage没有submenu
    if (e.key === "/homepage") {
      setCurrentOpenedKeys([]);
    }
    history.push(e.key);
  };

  const onOpenChange = (openKeys) => {
    const latestOpenKey = openKeys.find(
      (key) => currentOpenedKeys.indexOf(key) === -1
    );
    if (rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
      setCurrentOpenedKeys(openKeys);
    } else {
      setCurrentOpenedKeys(latestOpenKey ? [latestOpenKey] : []);
    }
  };

  const onPassWordChange = (data) => {
    setLoading(true);
    fetchPost(apiRequest.auth.changePassword, {
      body: {
        username: encrypt(localStorage.getItem("username")),
        old_password: encrypt(data.old_password),
        new_password: encrypt(data.new_password2),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            message.success("修改密码成功, 请重新登录");
            setShowModal(false);
            setTimeout(() => {
              logout();
            }, 1000);
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 相应路由跳转，submenu打开
  useEffect(() => {
    try {
      let pathArr = location.pathname.split("/");
      if (pathArr[1] == "homepage") {
        setSelectedKeys(["/homepage"]);
      } else {
        setSelectedKeys([`/${pathArr[1]}/${pathArr[2]}`]);
      }
      let newPath = `/${pathArr[1]}`;
      setCurrentOpenedKeys([newPath]);
    } catch (e) {
      console.log(e);
    }
  }, [location]);

  useEffect(() => {
    window.__history__ = history;
    fetchGet(apiRequest.auth.users)
      .then((res) => {
        if (res && res.data.code == 1 && res.data.message == "未认证") {
        }
        res.data && res.data.data && setUserInfo(res.data.data[0]);
      })
      .catch((e) => {
        console.log(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const antiShakeRef = useRef(null);

  const getViewSize = () => {
    reduxDispatch(
      // 这里做一个视口查询，存入store, 其他组件可以根据视口大小进行自适应
      getSetViewSizeAction({
        height: document.documentElement.clientHeight,
        width: document.documentElement.clientWidth,
      })
    );
  };

  getViewSize();

  useEffect(() => {
    window.onresize = () => {
      if (!antiShakeRef.current) {
        antiShakeRef.current = true;
        setTimeout(() => {
          getViewSize();
          antiShakeRef.current = false;
        }, 300);
      }
    };
  }, []);

  // 防止在校验进入死循环
  const flag = useRef(null);

  // 查询全局维护模式状态
  const queryMaintainState = () => {
    fetchGet(apiRequest.environment.queryMaintainState)
      .then((res) => {
        handleResponse(res, (res) => {
          //console.log(res)
          if (res.data) {
            reduxDispatch(getMaintenanceChangeAction(res.data.length !== 0));
          }
        });
      })
      .catch((e) => {
        console.log(e);
      })
      .finally();
  };

  useEffect(() => {
    queryMaintainState();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        collapsible
        collapsed={collapsed}
        onCollapse={toggle}
        collapsedWidth={50}
      >
        {/* -- 页面 logo -- */}
        <div
          style={{
            position: "relative",
            left: collapsed ? 0 : -15,
            display: "flex",
            height: 60,
            color: "white",
            justifyContent: "center",
            backgroundColor: "#151a21",
          }}
        >
          <div className={styles.headerLogo}>
            <img src={img} />
          </div>
          {!collapsed && (
            <div
              style={{
                cursor: "pointer",
                position: "relative",
                top: 1,
                fontSize: 18,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
              }}
              onClick={() => history.push("/homepage")}
            >
              {context.name}
            </div>
          )}
        </div>

        {/* -- 左侧导航栏 -- */}
        <Menu
          mode="inline"
          style={{
            height: "calc(100% - 60px)",
            color: "rgba(0,0,0,0.65)",
            overflowY: "auto",
          }}
          onClick={onPathChange}
          onOpenChange={onOpenChange}
          openKeys={currentOpenedKeys}
          selectedKeys={selectedKeys}
          expandIcon={(e) => {
            if (e.isOpen) {
              return <CaretUpOutlined />;
            } else {
              return (
                <CaretDownOutlined style={{ color: "rgba(0,0,0,0.65)" }} />
              );
            }
          }}
        >
          <Menu.Item key="/homepage" icon={<DashboardOutlined />}>
            {context.menu.left.dashboard}
          </Menu.Item>
          {getRouterConfig(context).map((item) => {
            return (
              <SubMenu
                key={item.menuKey}
                icon={item.menuIcon}
                title={item.menuTitle}
              >
                {item.children.map((i) => {
                  if (!i.notInMenu) {
                    return <Menu.Item key={i.path}>{i.title}</Menu.Item>;
                  }
                })}
              </SubMenu>
            );
          })}
        </Menu>
      </Sider>

      <Layout className="site-layout" style={{ width: "100%" }}>
        {/* -- 顶部导航栏 -- */}
        <Header
          className="site-layout-background"
          style={{
            padding: 0,
            display: "flex",
            justifyContent: "space-between",
            position: "fixed",
            zIndex: 1000,
            transition: collapsed ? "all 0.1s ease-out" : "all 0.4s ease-out",
            width: collapsed ? "calc(100% - 49px)" : "calc(100% - 199px)",
            marginLeft: collapsed ? 49 : 199,
          }}
        >
          {/* -- 顶部左侧路由 -- */}
          <div style={{ display: "flex" }}>
            {headerLink.map((item, idx) => {
              return (
                <div
                  style={
                    window.location.hash.includes(item.path)
                      ? { background: "#0C1423", color: "#fff" }
                      : { cursor: disabled ? "not-allowed" : null }
                  }
                  className={
                    !disabled || item.title === context.menu.top.deployment
                      ? styles.headerLink
                      : styles.headerLinkNohover
                  }
                  key={idx}
                  onClick={() => {
                    if (
                      !disabled ||
                      item.title === context.menu.top.deployment
                    ) {
                      if (item.title === context.menu.top.grafana) {
                        window.open(
                          "/proxy/v1/grafana/d/XrwAXz_Mz/mian-ban-lie-biao"
                        );
                      } else {
                        history.push(item.path);
                      }
                    }
                  }}
                >
                  {item.title}
                </div>
              );
            })}
          </div>

          {/* -- 顶部右侧 -- */}
          <div
            className={styles.userAvatar}
            style={{ display: "flex", position: "relative", top: 2 }}
          >
            {/* -- 中英文切换 -- */}
            <div
              style={{
                height: "50%",
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                right: 160,
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
                padding: "0px 10px 0px 10px",
                border: "1px solid white",
              }}
              onClick={() => {
                props.setLocale(props.locale === "en-US" ? "zh-CN" : "en-US");
              }}
            >
              {props.locale === "en-US" ? "Chinese" : "English"}{" "}
            </div>

            {/* -- 当前用户 -- */}
            <Dropdown overlay={menu} trigger={["click"]}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {localStorage.getItem("username")}{" "}
                <CaretDownOutlined
                  style={{ position: "relative", top: 1, left: 3 }}
                />
              </div>
            </Dropdown>

            {/* -- 版本号 -- */}
            <div
              style={{
                margin: "0 25px 0 22px",
                display: "flex",
                alignItems: "center",
                fontSize: 14,
              }}
            >
              V2.0.0
            </div>
          </div>
        </Header>

        {/* -- 头部面包屑 -- */}
        <CustomBreadcrumb collapsed={collapsed} locale={props.locale} />
        <Content style={{ margin: "0 16px", color: "rgba(0,0,0,0.65)" }}>
          <div
            style={{
              transition: "all 0.2s ease-in-out",
              marginTop: 120,
              marginLeft: collapsed ? 50 : 200,
              padding: 0,
              paddingBottom: 30,
              height: "calc(100% - 130px)",
              // 应用商店content大背景不是白色，特殊处理
              backgroundColor:
                location.pathname == "/application_management/app_store" ||
                location.pathname.includes("installation") ||
                location.pathname.includes("service_upgrade") ||
                location.pathname.includes("service_rollback") ||
                (location.pathname.includes("tool-management") &&
                  !location.pathname.includes("tool-execution")) ||
                location.pathname.includes("/homepage")
                  ? undefined
                  : "#fff",
            }}
          >
            {props.children}
          </div>
        </Content>

        {/* -- 底部 -- */}
        {/* <Footer
          style={{
            backgroundColor: "rgba(0,0,0,0)",
            textAlign: "center",
            // height: 20,
            padding: 0,
            paddingTop: 0,
            paddingLeft: 195,
          }}
        >
          Copyright © 2020-2025 Cloudwise.All Rights Reserved{" "}
        </Footer> */}
      </Layout>

      {/* -- 修改密码 modal -- */}
      <OmpModal
        title={comContext.change + comContext.ln + comContext.password}
        loading={isLoading}
        onFinish={onPassWordChange}
        visibleHandle={[showModal, setShowModal]}
        beForeOk={() => (flag.current = true)}
        afterClose={() => (flag.current = null)}
        context={comContext}
      >
        <Form.Item
          label={comContext.currentPassword}
          name="old_password"
          key="old_password"
          rules={[
            {
              required: true,
              message:
                comContext.input + comContext.ln + comContext.currentPassword,
            },
            {
              validator: (rule, value, callback) => {
                if (value) {
                  if (!isPassword(value)) {
                    if (value.length < 8) {
                      return Promise.reject("密码长度需大于8位");
                    }
                    return Promise.resolve("success");
                  } else {
                    return Promise.reject(
                      `密码只支持数字、字母以及常用英文符号`
                    );
                  }
                } else {
                  return Promise.resolve("success");
                }
              },
            },
          ]}
        >
          <Input.Password
            placeholder={
              comContext.input + comContext.ln + comContext.currentPassword
            }
          />
        </Form.Item>

        <Form.Item
          label={comContext.newPassword}
          name="new_password1"
          key="new_password1"
          useforminstanceinvalidator="true"
          rules={[
            {
              required: true,
              message:
                comContext.input + comContext.ln + comContext.newPassword,
            },
            {
              validator: (rule, value, callback, passwordModalForm) => {
                if (value) {
                  if (!flag.current) {
                    passwordModalForm.validateFields(["new_password2"]);
                  }
                  if (!isPassword(value)) {
                    if (value.length < 8) {
                      return Promise.reject("密码长度需大于8位");
                    }
                    return Promise.resolve("success");
                  } else {
                    return Promise.reject(
                      `密码只支持数字、字母以及常用英文符号`
                    );
                  }
                } else {
                  return Promise.resolve("success");
                }
              },
            },
          ]}
        >
          <Input.Password
            placeholder={
              comContext.input + comContext.ln + comContext.newPassword
            }
          />
        </Form.Item>

        <Form.Item
          label={comContext.confirmPassword}
          name="new_password2"
          key="new_password2"
          useforminstanceinvalidator="true"
          rules={[
            {
              required: true,
              message: comContext.confirmPassword,
            },
            {
              validator: (rule, value, callback, passwordModalForm) => {
                if (value) {
                  if (!isPassword(value)) {
                    if (value.length < 8) {
                      return Promise.reject("密码长度需大于8位");
                    }
                    if (
                      passwordModalForm.getFieldValue().new_password1 ===
                        value ||
                      !value
                    ) {
                      return Promise.resolve("success");
                    } else {
                      return Promise.reject("两次密码输入不一致");
                    }
                  } else {
                    return Promise.reject(
                      `密码只支持数字、字母以及常用英文符号`
                    );
                  }
                } else {
                  return Promise.resolve("success");
                }
              },
            },
          ]}
        >
          <Input.Password placeholder={comContext.confirmPassword} />
        </Form.Item>
      </OmpModal>
    </Layout>
  );
};

export default OmpLayout;
