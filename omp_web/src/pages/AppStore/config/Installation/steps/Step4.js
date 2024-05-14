import { Button, Form, Checkbox, Input, Spin, message } from "antd";
import { useEffect, useState } from "react";
import { SearchOutlined, ExclamationOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import ServiceConfigItem from "../component/ServiceConfigItem";
import { fetchGet, fetchPost } from "@/utils/request";
import { apiRequest } from "@/config/requestApi";
import { handleResponse } from "@/utils/utils";
import {
  getStep3IpDataChangeAction,
  getStep3ErrorInfoChangeAction,
  getStep3ServiceChangeAction,
} from "../store/actionsCreators";
import * as R from "ramda";

const msgMap = {
  "en-US": {
    userMsg: "Specify the service running user",
    noRootMsg: "Input a non root user",
  },
  "zh-CN": {
    userMsg: "指定本次安装服务运行用户",
    noRootMsg: "请输入非root用户",
  },
};

const Step4 = ({ setStepNum, context, locale }) => {
  const dispatch = useDispatch();
  // unique_key: "21e041a9-c9a5-4734-9673-7ed932625d21"
  // 服务的loading
  const [loading, setLoading] = useState(false);
  const [loadingIp, setLoadingIp] = useState(false);
  const uniqueKey = useSelector((state) => state.appStore.uniqueKey);
  // redux中取数据
  const reduxData = useSelector((state) => state.installation.step3Data);
  const errInfo = useSelector((state) => state.installation.step3ErrorData);
  const [checked, setChecked] = useState(false);
  const [serviceConfigform] = Form.useForm();
  const viewHeight = useSelector((state) => state.layouts.viewSize.height);
  // 指定本次安装服务运行用户
  const [runUser, setRunUser] = useState("");
  // 筛选后的ip列表
  const [currentIpList, setCurrentIpList] = useState([]);
  // ip列表中的选中项
  const [checkIp, setCheckIp] = useState("");
  // ip 筛选value
  const [searchIp, setSearchIp] = useState("");
  // ip列表的数据源
  const [ipList, setIpList] = useState([]);

  const queryIpList = () => {
    setLoadingIp(true);
    fetchGet(apiRequest.appStore.getInstallHostRange, {
      params: {
        unique_key: uniqueKey,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          setIpList(res.data.data);
          setCurrentIpList(res.data.data);
          setCheckIp(res.data.data[0]);
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoadingIp(false);
      });
  };

  const queryInstallArgsByIp = (ip) => {
    // 如果redux中已经存了当前ip的数据就不再请求直接使用redux中的
    if (reduxData[ip]) {
      return;
    }
    setLoading(true);
    fetchGet(apiRequest.appStore.getInstallArgsByIp, {
      params: {
        unique_key: uniqueKey,
        ip: ip,
      },
    })
      .then((res) => {
        handleResponse(res, (res) => {
          //setDataSource(res.data.data);
          dispatch(
            getStep3IpDataChangeAction({
              [ip]: res.data.data,
            })
          );
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  // 提交前对数据进行处理
  const dataProcessing = (data) => {
    let obj = {};
    ipList.map((ip) => {
      obj[ip] = [];
    });
    //console.log(data);
    return {
      ...obj,
      ...data,
    };
  };

  // 有校验失败的信息生成errlist
  const getErrorInfo = (data) => {
    let result = {};
    for (const ip in data) {
      data[ip].map((service) => {
        [...service.install_args, ...service.ports].map((serv) => {
          if (serv.check_flag == false) {
            if (!result[ip]) {
              result[ip] = {};
            }
            if (result[ip][service.name]) {
              result[ip][service.name][serv.key] = serv.error_msg;
            } else {
              result[ip][service.name] = {};
              result[ip][service.name][serv.key] = serv.error_msg;
            }
          }
        });
      });
    }
    // console.log(result, "result");
    return result;
  };

  // 非空校验
  const nonNullCheck = (queryData) => {
    let result = {};
    //console.log(queryData);
    let data = R.clone(queryData);
    // 这一步校验是为了解决非当前页面form的必填校验不到的问题
    // 当key == vip 跳过校验（非必填）
    // 首先去除当前页面ip的相关数据校验
    data[checkIp] = [];
    // console.log(data)
    for (const ip in data) {
      data[ip].map((service) => {
        [...service.install_args, ...service.ports].map((serv) => {
          // console.log(serv);
          // 特殊处理，去除vip非空校验
          if (!serv.default && serv.key !== "vip") {
            if (!result[ip]) {
              result[ip] = {};
            }
            if (result[ip][service.name]) {
              result[ip][service.name][serv.key] = `请输入${serv.name}`;
            } else {
              result[ip][service.name] = {};
              result[ip][service.name][serv.key] = `请输入${serv.name}`;
            }
          }
        });
      });
    }

    return result;
  };

  const getCurrentData = (queryData) => {
    let formData = serviceConfigform.getFieldValue();
    for (const keyStr in formData) {
      let keyArr = keyStr.split("=");
      queryData[checkIp] = queryData[checkIp].map((item) => {
        if (item.name == keyArr[0]) {
          let obj = { ...item };
          obj.install_args = obj.install_args.map((i) => {
            if (i.key == keyArr[1]) {
              i.default = formData[keyStr];
            }
            return i;
          });
          obj.ports = obj.ports.map((i) => {
            if (i.key == keyArr[1]) {
              i.default = formData[keyStr];
            }
            return i;
          });
          return obj;
        }
        return item;
      });
    }
    return queryData;
  };

  // 开始安装操作命令下发
  const createInstallPlan = (queryData) => {
    // 这个queryData数据是用redux中来的，当前页面的数据是在页面销毁时才同步redux的
    setLoading(true);
    fetchPost(apiRequest.appStore.createInstallPlan, {
      body: {
        unique_key: uniqueKey,
        run_user: runUser,
        data: getCurrentData(queryData),
      },
    })
      .then((res) => {
        //console.log(operateObj[operateAciton])
        handleResponse(res, (res) => {
          if (res.data && res.data.data) {
            if (res.data.is_continue) {
              // 校验通过，跳转，请求服务分布数据并跳转
              setStepNum(4);
            } else {
              res.data && res.data.error_msg
                ? message.warn(res.data.error_msg)
                : message.warn("校验未通过，请检查");
              dispatch(
                getStep3ErrorInfoChangeAction(getErrorInfo(res.data.data))
              );

              //reduxDispatch(getStep2ErrorLstChangeAction(res.data.error_lst));
            }
          }
        });
      })
      .catch((e) => console.log(e))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (checkIp) {
      queryInstallArgsByIp(checkIp);
    }
  }, [checkIp]);

  useEffect(() => {
    // 请求ip数据
    // currentIpList
    queryIpList();
    return () => {
      dispatch(getStep3ErrorInfoChangeAction({}));
      dispatch(getStep3IpDataChangeAction());
    };
  }, []);

  return (
    <div>
      {/* -- 指定安装用户 -- */}
      <div
        style={{
          marginTop: 20,
          backgroundColor: "#fff",
          padding: 10,
          paddingLeft: 30,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div>
          <Checkbox
            checked={checked}
            onChange={(e) => {
              if (!e.target.checked) {
                setRunUser("");
              }
              setChecked(e.target.checked);
            }}
          >
            {msgMap[locale].userMsg}
          </Checkbox>
        </div>

        <Input
          disabled={!checked}
          placeholder={msgMap[locale].noRootMsg}
          style={{ width: 300 }}
          value={runUser}
          onChange={(e) => setRunUser(e.target.value)}
        />
      </div>

      <div
        style={{
          marginTop: 15,
          backgroundColor: "#fff",
          display: "flex",
        }}
      >
        {/* -- 左侧 IP 搜索 -- */}
        <div style={{ width: 240 }}>
          <div style={{ padding: "15px 5px 10px 5px" }}>
            <Input
              allowClear
              onBlur={() => {
                if (searchIp) {
                  let result = ipList.filter((i) => {
                    return i.includes(searchIp);
                  });
                  setCurrentIpList(result);
                  result.length > 0 && setCheckIp(result[0]);
                } else {
                  setCurrentIpList(ipList);
                  setCheckIp(ipList[0]);
                }
              }}
              value={searchIp}
              onChange={(e) => {
                setSearchIp(e.target.value);
                if (!e.target.value) {
                  setCurrentIpList(ipList);
                  setCheckIp(ipList[0]);
                }
              }}
              onPressEnter={() => {
                if (searchIp) {
                  let result = ipList.filter((i) => {
                    return i.includes(searchIp);
                  });
                  setCurrentIpList(result);
                  result.length > 0 && setCheckIp(result[0]);
                } else {
                  setCurrentIpList(ipList);
                  setCheckIp(ipList[0]);
                }
              }}
              placeholder={context.input + context.ln + context.ip}
              suffix={
                !searchIp && <SearchOutlined style={{ color: "#b6b6b6" }} />
              }
            />
          </div>
          <div style={{ overflowY: "auto" }}>
            <div
              style={{
                cursor: "pointer",
                borderRight: "0px",
                height: viewHeight - 390,
              }}
            >
              <Spin spinning={loadingIp}>
                {currentIpList?.length == 0 ? (
                  <div style={{ height: 100 }}></div>
                ) : (
                  <>
                    {currentIpList?.map((item) => {
                      return (
                        <div
                          key={item}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              padding: 5,
                              paddingLeft: 30,
                              cursor: "pointer",
                              flex: 1,
                              color: errInfo[item]
                                ? "red"
                                : checkIp == item
                                ? "#4986f7"
                                : "",
                              backgroundColor: checkIp == item ? "#edf8fe" : "",
                            }}
                            onClick={() => {
                              // 点击切换ip时再存redux，避免不必要的性能消耗
                              let formData = serviceConfigform.getFieldValue();
                              for (const key in formData) {
                                let keyArr = key.split("=");
                                reduxData[checkIp].map((item) => {
                                  if (keyArr[0] == item.name) {
                                    dispatch(
                                      getStep3ServiceChangeAction(
                                        checkIp,
                                        item.name,
                                        keyArr[1],
                                        formData[key]
                                      )
                                    );
                                  }
                                });
                              }
                              setCheckIp(item);
                            }}
                          >
                            {item}
                          </div>
                          {errInfo[item] && (
                            <div
                              style={{
                                width: 30,
                                padding: 5,
                                paddingLeft: 0,
                                backgroundColor:
                                  checkIp == item ? "#edf8fe" : "",
                                color: "red",
                              }}
                            >
                              <ExclamationOutlined />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </Spin>
            </div>
          </div>
        </div>

        {/* -- 右侧服务配置信息 -- */}
        <div
          style={{
            flex: 1,
            borderLeft: "1px solid #d9d9d9",
            height: viewHeight - 335,
            overflowY: "auto",
          }}
        >
          {!reduxData[checkIp] || reduxData[checkIp].length == 0 ? (
            <Spin spinning={true} tip={context.loading + "..."}>
              <div style={{ width: "100%", height: 300 }}></div>
            </Spin>
          ) : (
            <Form
              form={serviceConfigform}
              name="config"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 40 }}
            >
              {reduxData[checkIp]?.map((item, idx) => {
                return (
                  <ServiceConfigItem
                    ip={checkIp}
                    key={item.name}
                    data={item}
                    form={serviceConfigform}
                    loading={loading}
                    idx={idx}
                    context={context}
                    locale={locale}
                  />
                );
              })}
            </Form>
          )}
        </div>
      </div>

      {/* -- 底部主机数量 -- */}
      <div
        style={{
          position: "fixed",
          backgroundColor: "#fff",
          width: "calc(100% - 230px)",
          bottom: 10,
          padding: "10px 0px",
          display: "flex",
          justifyContent: "space-between",
          paddingRight: 30,
          boxShadow: "0px 0px 10px #999999",
          alignItems: "center",
          borderRadius: 2,
        }}
      >
        <div style={{ paddingLeft: 20 }}>
          {context.host + context.ln + context.total + " : "}
          {ipList?.length}
          {context.tai}
        </div>
        <div>
          <Button type="primary" onClick={() => setStepNum(1)}>
            {context.previous}
          </Button>
          <Button
            style={{ marginLeft: 10 }}
            type="primary"
            loading={loading}
            onClick={() => {
              serviceConfigform.validateFields().then(
                (e) => {
                  let errData = nonNullCheck(reduxData);
                  if (Object.keys(errData).length > 0) {
                    message.warn("校验未通过，请检查");
                    dispatch(getStep3ErrorInfoChangeAction(errData));
                  } else {
                    createInstallPlan(dataProcessing(reduxData));
                  }
                },
                (e) => {
                  message.warn("校验未通过，请检查");
                }
              );
            }}
          >
            {context.install}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step4;
