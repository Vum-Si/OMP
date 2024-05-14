import { useHistory } from "react-router-dom";
import BasicInfoItem from "../component/BasicInfoItem/index";
import DependentInfoItem from "../component/DependentinfoItem/index";
import { Form, Button, message } from "antd";
import { useEffect, useState } from "react";
import { fetchPost } from "@/utils/request";
import { useSelector, useDispatch } from "react-redux";
import { apiRequest } from "@/config/requestApi";
import { handleResponse } from "@/utils/utils";
import { getStep1ChangeAction } from "../store/actionsCreators";
import * as R from "ramda";

const Step1 = ({ setStepNum, context }) => {
  const history = useHistory();
  const data = useSelector((state) => state.installation.step1Data);
  if (data?.basic.length === 0 && data?.dependence.length === 0) {
    history.push({
      pathname: "/application_management/install-record",
    });
  }
  const reduxDispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const uniqueKey = useSelector((state) => state.appStore.uniqueKey);
  // 定义下一步是否可操作，只在第一次加载时判断
  const [isContinue, setIsContinue] = useState(false);
  // 基本信息的form实例
  const [basicForm] = Form.useForm();
  // 依赖信息的form实例
  const [dependentForm] = Form.useForm();

  const dataProcessing = () => {
    let formBasicData = basicForm.getFieldsValue();
    let formDependentData = dependentForm.getFieldsValue();
    //setStepNum(1);
    let basic = JSON.parse(JSON.stringify(data.basic));
    let dependent = JSON.parse(JSON.stringify(data.dependence));

    basic = basic.map((item) => {
      let services_list = item.services_list;
      let cluster_name = "";

      Object.keys(formBasicData).map((k) => {
        let kArr = k.split("=");
        if (kArr.length == 1) {
          // 长度为1 说明当前key就是实例名称
          // console.log(k, formBasicData[k]);
          if (k == item.name) {
            cluster_name = formBasicData[k];
          }
        } else if (kArr.length == 2) {
          services_list = services_list.map((i) => {
            // console.log(i);
            if (i.name == kArr[1]) {
              return {
                name: i.name,
                version: i.version,
                deploy_mode: Number(formBasicData[k]),
              };
            } else {
              return {
                ...i,
              };
            }
          });
        }
      });
      return {
        name: item.name,
        version: item.version,
        cluster_name: cluster_name,
        services_list: services_list,
      };
    });

    dependent = dependent.map((item) => {
      if (item.is_base_env) {
        // jdk
        return {
          ...item,
        };
      } else {
        //if(item.is_use_exist){
        // deployInstanceRow
        let exist_instance = item.exist_instance;
        let deploy_mode = item.deploy_mode;
        let cluster_name = "";
        let vip = "";
        let is_use_exist = false;

        Object.keys(formDependentData).map((k) => {
          let kArr = k.split("=");
          if (kArr[0] == item.name) {
            if (kArr.length == 1) {
              // 选中了勾选了说明当前为选择实例信息
              exist_instance = JSON.parse(formDependentData[k]);
              is_use_exist = true;
            } else {
              // 取消了选中，当前为部署数量信息
              // 判断部署数量是否是数字
              if (kArr[1] == "num") {
                // deploy_mode = formDependentData[k];
                cluster_name = formDependentData[`${item.name}=name`];
                vip = formDependentData[`${item.name}=vip`];
                if (isNaN(Number(formDependentData[k]))) {
                  // 非数字代表单实例，主从，主主
                  deploy_mode = formDependentData[k];
                } else {
                  // 数字代表部署数量
                  deploy_mode = Number(formDependentData[k]);
                  // 数量
                  //cluster_name
                }
              }
            }
          }
        });

        return {
          ...item,
          exist_instance: exist_instance,
          deploy_mode: deploy_mode,
          cluster_name: cluster_name,
          vip: vip,
          is_use_exist: is_use_exist,
        };
      }

      return {
        ...item,
      };
    });

    return {
      basic: basic,
      dependence: dependent,
    };
  };

  // checkInstallInfo 基本信息提交操作，决定是否跳转服务分布以及数据校验回显
  const checkInstallInfo = (queryData) => {
    // console.log(uniqueKey,data)
    // return
    // setLoading(true);
    fetchPost(apiRequest.appStore.checkInstallInfo, {
      body: {
        unique_key: uniqueKey,
        data: queryData,
      },
    })
      .then((res) => {
        //console.log(operateObj[operateAciton])
        handleResponse(res, (res) => {
          if (res.data && res.data.data) {
            if (res.data.data.is_continue) {
              // 当部署单个前端服务，且指定 tengine 复用依赖
              const dpArr = queryData.dependence;
              if (
                dpArr.length === 2 &&
                dpArr[1].name === "tengine" &&
                dpArr[1].is_use_exist === true
              ) {
                // 生成部署计划
                fetchPost(apiRequest.appStore.createServiceDistribution, {
                  body: {
                    unique_key: uniqueKey,
                  },
                })
                  .then((res) => {
                    handleResponse(res, (res) => {
                      if (res.data && res.data.data) {
                        // 仅有一个服务，且 with 目标为 tengine
                        const all = res.data.data.all;
                        const keys = Object.keys(all);
                        const hostArr = res.data.data.host;
                        if (keys.length === 1) {
                          if (all[keys[0]].with === "tengine") {
                            // 跳转第 3 步
                            for (
                              let index = 0;
                              index < hostArr.length;
                              index++
                            ) {
                              const ip = hostArr[index].ip;
                              const resData = {};
                              const endStr = dpArr[1].exist_instance.name
                                .replaceAll("-", ".")
                                .replace("tengine", "");
                              if (ip.endsWith(endStr)) {
                                resData[ip] = [dpArr[0].name];
                                console.log(resData);
                                fetchPost(
                                  apiRequest.appStore.checkServiceDistribution,
                                  {
                                    body: {
                                      unique_key: uniqueKey,
                                      data: resData,
                                    },
                                  }
                                )
                                  .then((res) => {
                                    //console.log(operateObj[operateAciton])
                                    handleResponse(res, (res) => {
                                      if (res.data && res.data.data) {
                                        if (res.data.is_continue) {
                                          // 校验通过，跳转，请求服务分布数据并跳转
                                          setStepNum(3);
                                        } else {
                                          message.warn("校验未通过");
                                          console.log(res.data.error_lst);
                                        }
                                      }
                                    });
                                  })
                                  .catch((e) => console.log(e))
                                  .finally(() => {
                                    setLoading(false);
                                  });
                              }
                            }
                          } else {
                            setStepNum(1);
                          }
                        }
                      }
                    });
                  })
                  .catch((e) => console.log(e));
              } else {
                // 校验通过，跳转，请求服务分布数据并跳转
                setStepNum(1);
              }
            } else {
              message.warn("校验未通过");
              // 当校验未通过时不跳转，并回显数据
              // 使用redux中已有的数据做基础，在其上添加失败的校验信息
              let { basic, dependence } = R.clone(data);

              let { basic: resBasic, dependence: resDependence } = R.clone(
                res.data.data
              );
              reduxDispatch(
                getStep1ChangeAction({
                  basic: basic.map((item) => {
                    let d = R.clone(item);
                    resBasic.map((i) => {
                      if (i.error_msg) {
                        if (d.name == i.name) {
                          d.error_msg = i.error_msg;
                        }
                      }
                    });
                    return d;
                  }),
                  dependence: dependence.map((item) => {
                    let d = R.clone(item);
                    resDependence.map((i) => {
                      if (i.error_msg) {
                        if (d.name == i.name) {
                          d.error_msg = i.error_msg;
                        }
                      }
                    });
                    return d;
                  }),
                })
              );
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
    setIsContinue(data.is_continue);
  }, []);

  // 组件渲染特殊处理
  if (data.basic.length == 0) {
    return (
      <>
        {/* -- 基本信息 -- */}
        <div
          style={{
            marginTop: 20,
            backgroundColor: "#fff",
            padding: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              position: "relative",
              height: 30,
            }}
          >
            <div
              style={{
                fontWeight: 500,
                position: "absolute",
                left: 30,
                backgroundColor: "#fff",
                paddingLeft: 20,
                paddingRight: 20,
              }}
            >
              {context.basic + context.ln + context.info}
            </div>
            <div
              style={{ height: 1, backgroundColor: "#b3b2b3", width: "100%" }}
            />
          </div>
          <div
            style={{
              paddingLeft: 20,
              marginTop: 10,
              paddingBottom: 40,
            }}
          >
            <Form form={dependentForm} name="dependent" layout="vertical">
              <DependentInfoItem
                context={context}
                key={data.dependence[0]?.name}
                form={dependentForm}
                isBaseEnv={true}
                data={
                  data.dependence.length > 0
                    ? data.dependence[0]
                    : {
                        deploy_mode: {},
                      }
                }
              />
            </Form>
          </div>
        </div>

        {/* -- 依赖信息 -- */}
        <div
          style={{
            marginTop: 20,
            backgroundColor: "#fff",
            padding: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              position: "relative",
              height: 30,
            }}
          >
            <div
              style={{
                fontWeight: 500,
                position: "absolute",
                left: 30,
                backgroundColor: "#fff",
                paddingLeft: 20,
                paddingRight: 20,
              }}
            >
              {context.dependence + context.ln + context.info}
            </div>
            <div
              style={{ height: 1, backgroundColor: "#b3b2b3", width: "100%" }}
            />
          </div>

          <div
            style={{
              paddingLeft: 20,
              marginTop: 10,
              paddingBottom: 40,
            }}
          >
            {data.dependence.filter((item, idx) => idx !== 0).length == 0 ? (
              context.none
            ) : (
              <Form form={dependentForm} name="dependent" layout="vertical">
                {data.dependence
                  .filter((item, idx) => idx !== 0)
                  .map((item) => {
                    return (
                      <DependentInfoItem
                        context={context}
                        key={item.name}
                        form={dependentForm}
                        data={item}
                      />
                    );
                  })}
              </Form>
            )}
          </div>
        </div>

        {/* -- 下一步 -- */}
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
          }}
        >
          <div />
          <div>
            <Button
              type="primary"
              loading={loading}
              disabled={!isContinue}
              onClick={() => {
                Promise.all([
                  dependentForm.validateFields(),
                  // basicForm.validateFields(),
                ])
                  .then((result) => {
                    checkInstallInfo(dataProcessing());
                  })
                  .catch((e) => {
                    message.warn("校验未通过");
                  });
              }}
            >
              {context.next}
            </Button>
          </div>
        </div>
      </>
    );
  } else {
    return (
      <>
        {/* -- 基本信息 -- */}
        <div
          style={{
            marginTop: 20,
            backgroundColor: "#fff",
            padding: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              position: "relative",
              height: 30,
            }}
          >
            <div
              style={{
                fontWeight: 500,
                position: "absolute",
                left: 30,
                backgroundColor: "#fff",
                paddingLeft: 20,
                paddingRight: 20,
              }}
            >
              {context.basic + context.ln + context.info}
            </div>
            <div
              style={{ height: 1, backgroundColor: "#b3b2b3", width: "100%" }}
            />
          </div>
          <div
            style={{
              paddingLeft: 20,
              marginTop: 10,
              paddingBottom: 40,
            }}
          >
            <Form form={basicForm} name="basic">
              {data.basic.map((item) => {
                return (
                  <BasicInfoItem
                    key={item.name}
                    form={basicForm}
                    data={item}
                    context={context}
                  />
                );
              })}
            </Form>
          </div>
        </div>

        {/* -- 依赖信息 -- */}
        <div
          style={{
            marginTop: 20,
            backgroundColor: "#fff",
            padding: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              position: "relative",
              height: 30,
            }}
          >
            <div
              style={{
                fontWeight: 500,
                position: "absolute",
                left: 30,
                backgroundColor: "#fff",
                paddingLeft: 20,
                paddingRight: 20,
              }}
            >
              {context.dependence + context.ln + context.info}
            </div>
            <div
              style={{ height: 1, backgroundColor: "#b3b2b3", width: "100%" }}
            />
          </div>
          <div
            style={{
              paddingLeft: 20,
              marginTop: 10,
              paddingBottom: 40,
            }}
          >
            <Form form={dependentForm} name="dependent" layout="vertical">
              {data.dependence.map((item) => {
                return (
                  <DependentInfoItem
                    context={context}
                    key={item.name}
                    form={dependentForm}
                    data={item}
                  />
                );
              })}
            </Form>
          </div>
        </div>

        {/* -- 下一步 -- */}
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
          }}
        >
          <div />
          <div>
            <Button
              type="primary"
              loading={loading}
              disabled={!isContinue}
              onClick={() => {
                Promise.all([
                  dependentForm.validateFields(),
                  basicForm.validateFields(),
                ])
                  .then((result) => {
                    checkInstallInfo(dataProcessing());
                  })
                  .catch((e) => {
                    message.warn("校验未通过");
                  });
              }}
            >
              {context.next}
            </Button>
          </div>
        </div>
      </>
    );
  }
};

export default Step1;
