import { useHistory, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Steps, Form } from "antd";
import { useState } from "react";
import { LeftOutlined } from "@ant-design/icons";
import Step1 from "./steps/Step1";
import Step2 from "./steps/Step2";
import Step3 from "./steps/Step3";
import { locales } from "@/config/locales";

const CreateDeployment = ({ locale }) => {
  const history = useHistory();
  const location = useLocation();
  const viewHeight = useSelector((state) => state.layouts.viewSize.height);
  // 服务纳管初始数据
  const oneData = location.state?.oneData;
  // 服务数据表单
  const [firstForm] = Form.useForm();
  // 选中的产品
  const [oneList, setOneList] = useState([]);
  // 产品版本信息
  const [oneProVer, setOneProVer] = useState({});
  const [twoData, setTwoData] = useState(null);
  if (oneData === undefined) {
    history.push({
      pathname: "/application_management/deployment-plan",
    });
  }
  // 服务数据表单
  const [secndForm] = Form.useForm();
  const [secndHostForm] = Form.useForm();
  // 产品数量信息
  const [proInfo, setProInfo] = useState([]);
  // 服务数量信息
  const [appInfo, setAppInfo] = useState([]);
  const [proInfoInit, setProInfoInit] = useState([]);
  const [appInfoInit, setAppInfoInit] = useState([]);
  const [threeData, setThreeData] = useState([]);
  // 步骤
  const [stepNum, setStepNum] = useState(0);
  const context = locales[locale].common;

  return (
    <div style={{ backgroundColor: "rgb(240, 242, 245)" }}>
      {/* -- 顶部区域 -- */}
      <div
        style={{
          height: 50,
          backgroundColor: "#fff",
          display: "flex",
          paddingLeft: 20,
          paddingRight: 50,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* -- 标题 -- */}
        <div style={{ fontSize: 16 }}>
          <LeftOutlined
            style={{ fontSize: 16, marginRight: 20 }}
            onClick={() => {
              history?.goBack();
            }}
          />
          {context.generate + context.ln + context.template}
        </div>

        {/* -- 步骤 -- */}
        <div style={{ width: 600, position: "relative", left: -60 }}>
          <Steps size="small" current={stepNum}>
            <Steps.Step title={context.product + context.ln + context.info} />
            <Steps.Step title={context.quantity + context.ln + context.info} />
            <Steps.Step
              title={context.generate + context.ln + context.template}
            />
          </Steps>
        </div>
        <div />
      </div>
      {stepNum == 0 && (
        <Step1
          setStepNum={setStepNum}
          oneData={oneData}
          oneList={oneList}
          setOneList={setOneList}
          oneProVer={oneProVer}
          setOneProVer={setOneProVer}
          setTwoData={setTwoData}
          viewHeight={viewHeight}
          firstForm={firstForm}
          setProInfo={setProInfo}
          setAppInfo={setAppInfo}
          setProInfoInit={setProInfoInit}
          setAppInfoInit={setAppInfoInit}
          context={context}
        />
      )}
      {stepNum == 1 && (
        <Step2
          setStepNum={setStepNum}
          twoData={twoData}
          setThreeData={setThreeData}
          viewHeight={viewHeight}
          secndForm={secndForm}
          secndHostForm={secndHostForm}
          setProInfo={setProInfo}
          setAppInfo={setAppInfo}
          proInfo={proInfo}
          appInfo={appInfo}
          proInfoInit={proInfoInit}
          appInfoInit={appInfoInit}
          context={context}
          locale={locale}
        />
      )}
      {stepNum == 2 && (
        <Step3
          setStepNum={setStepNum}
          twoData={twoData}
          threeData={threeData}
          viewHeight={viewHeight}
          context={context}
          locale={locale}
        />
      )}
    </div>
  );
};

export default CreateDeployment;
