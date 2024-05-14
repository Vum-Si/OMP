import { OmpContentWrapper, OmpTable, OmpModal } from "@/components";
import { Button, Input, Form, message } from "antd";
import { useState, useEffect, useRef } from "react";
import {
  handleResponse,
  _idxInit,
  refreshTime,
  nonEmptyProcessing,
  logout,
  isPassword,
  encrypt,
} from "@/utils/utils";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
//import updata from "@/store_global/globalStore";
import { useDispatch } from "react-redux";
import moment from "moment";
import { SearchOutlined } from "@ant-design/icons";
import { locales } from "@/config/locales";

const UserManagement = ({ locale }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  //table表格数据
  const [dataSource, setDataSource] = useState([]);
  const [userListSource, setUserListSource] = useState([]);
  const [selectValue, setSelectValue] = useState();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    ordering: "",
    searchParams: {},
  });
  //修改密码弹框
  const [showModal, setShowModal] = useState(false);
  // 定义row存数据
  const [row, setRow] = useState({});
  const context = locales[locale].common;

  const columns = [
    {
      title: context.row,
      width: 40,
      key: "_idx",
      dataIndex: "_idx",
      align: "center",
      render: nonEmptyProcessing,
      fixed: "left",
    },
    {
      title: context.username,
      key: "username",
      width: 100,
      dataIndex: "username",
      align: "center",
      render: nonEmptyProcessing,
    },
    {
      title: context.role,
      key: "is_superuser",
      dataIndex: "is_superuser",
      width: 100,
      align: "center",
      render: (text, record) => {
        if (text) {
          return context.superuser;
        } else {
          if (record.username === "omp") {
            return context.readonly;
          }
          return context.ordinary;
        }
      },
    },
    {
      title: context.active,
      key: "is_active",
      dataIndex: "is_active",
      align: "center",
      width: 100,
      render: (text) => {
        if (text) {
          return context.normal;
        } else {
          return context.disabled;
        }
      },
    },
    {
      title: context.created,
      key: "date_joined",
      dataIndex: "date_joined",
      align: "center",
      width: 100,
      render: (text) => {
        if (text) {
          return moment(text).format("YYYY-MM-DD HH:mm:ss");
        } else {
          return "-";
        }
      },
    },
    {
      title: context.action,
      key: "1",
      width: 50,
      dataIndex: "1",
      align: "center",
      fixed: "right",
      render: function renderFunc(text, record, index) {
        return (
          <div
            onClick={() => {
              setRow(record);
              setShowModal(true);
            }}
            style={{ display: "flex", justifyContent: "space-around" }}
          >
            <a>{context.changePass}</a>
          </div>
        );
      },
    },
  ];

  //auth/users
  const fetchData = (
    pageParams = { current: 1, pageSize: 10 },
    searchParams,
    ordering
  ) => {
    setLoading(true);
    fetchGet(apiRequest.auth.users, {
      params: {
        page: pageParams.current,
        size: pageParams.pageSize,
        ordering: ordering ? ordering : null,
        ...searchParams,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (!searchParams) {
            setUserListSource(res.data.results.map((item) => item.username));
          }
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
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  const onPassWordChange = (data) => {
    setLoading(true);
    fetchPost(apiRequest.auth.changePassword, {
      body: {
        username: encrypt(row.username),
        old_password: encrypt(data.old_password),
        new_password: encrypt(data.new_password2),
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          if (res.code == 0) {
            if (localStorage.getItem("username") == row.username) {
              message.success(
                context.change +
                  context.ln +
                  context.password +
                  context.ln +
                  context.succeeded
              );
              setTimeout(() => {
                logout();
              }, 1000);
            } else {
              message.success(
                context.change +
                  context.ln +
                  context.password +
                  context.ln +
                  context.succeeded
              );
            }
            setShowModal(false);
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

  // 防止在校验进入死循环
  const flag = useRef(null);

  return (
    <OmpContentWrapper>
      {/* -- 顶部用户过滤/刷新 -- */}
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", marginLeft: "auto" }}>
          <span
            style={{ marginRight: 5, display: "flex", alignItems: "center" }}
          >
            {context.username + " : "}
          </span>
          <Input
            placeholder={context.input + context.ln + context.username}
            style={{ width: 200 }}
            allowClear
            value={selectValue}
            onChange={(e) => {
              setSelectValue(e.target.value);
              if (!e.target.value) {
                fetchData(
                  {
                    current: 1,
                    pageSize: pagination.pageSize,
                  },
                  {
                    ...pagination.searchParams,
                    username: null,
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
                  username: selectValue,
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
                  username: selectValue,
                },
                pagination.ordering
              );
            }}
            suffix={
              !selectValue && (
                <SearchOutlined style={{ fontSize: 12, color: "#b6b6b6" }} />
              )
            }
          />
          <Button
            style={{ marginLeft: 10 }}
            onClick={() => {
              dispatch(refreshTime());
              fetchData(
                { current: pagination.current, pageSize: pagination.pageSize },
                { username: selectValue },
                pagination.ordering
              );
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
          columns={columns}
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

      {/* -- 修改密码 -- */}
      <OmpModal
        loading={loading}
        onFinish={onPassWordChange}
        visibleHandle={[showModal, setShowModal]}
        title={context.changePass}
        beForeOk={() => (flag.current = true)}
        afterClose={() => (flag.current = null)}
        context={context}
      >
        <Form.Item
          label={context.currentPassword}
          name="old_password"
          key="old_password"
          rules={[
            {
              required: true,
              message: context.input + context.ln + context.currentPassword,
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
            placeholder={context.input + context.ln + context.currentPassword}
          />
        </Form.Item>

        <Form.Item
          label={context.newPassword}
          name="new_password1"
          key="new_password1"
          useforminstanceinvalidator="true"
          rules={[
            {
              required: true,
              message: context.input + context.ln + context.newPassword,
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
            placeholder={context.input + context.ln + context.newPassword}
          />
        </Form.Item>

        <Form.Item
          label={context.confirmPassword}
          name="new_password2"
          key="new_password2"
          useforminstanceinvalidator="true"
          rules={[
            {
              required: true,
              message: context.input + context.ln + context.confirmPassword,
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
          <Input.Password
            placeholder={context.input + context.ln + context.confirmPassword}
          />
        </Form.Item>
      </OmpModal>
    </OmpContentWrapper>
  );
};

export default UserManagement;
