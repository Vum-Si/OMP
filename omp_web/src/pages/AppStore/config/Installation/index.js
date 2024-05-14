import { useHistory, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Steps } from "antd";
import { useState } from "react";
import styles from "./index.module.less";
import Step1 from "./steps/Step1";
import Step2 from "./steps/Step2";
import Step3 from "./steps/Step3";
import Step4 from "./steps/Step4";
import Step5 from "./steps/Step5";
import { locales } from "@/config/locales";
import { useSelector } from "react-redux";

import { LeftOutlined } from "@ant-design/icons";
// 安装页面
const Installation = ({ locale }) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const defaultStep = location.state?.step;
  const [stepNum, setStepNum] = useState(defaultStep || 0);
  const context = locales[locale].common;
  const viewWidth = useSelector((state) => state.layouts.viewSize.width);

  return (
    <div style={{ width: viewWidth - 230 }}>
      <div
        style={{
          height: 50,
          backgroundColor: "#fff",
          display: "flex",
          paddingLeft: 20,
          paddingRight: 50,
          justifyContent: "space-between",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: 16 }}>
          <LeftOutlined
            style={{ fontSize: 16, marginRight: 20 }}
            className={styles.backIcon}
            onClick={() => history?.goBack()}
          />
          {context.install}
        </div>
        <div style={{ minWidth: 750, position: "relative", left: -50 }}>
          <Steps size="small" current={stepNum}>
            <Steps.Step title={context.basic + context.ln + context.info} />
            <Steps.Step title={context.serviceDistribution} />
            <Steps.Step title={context.global + context.ln + context.config} />
            <Steps.Step title={context.service + context.ln + context.config} />
            <Steps.Step title={context.install} />
          </Steps>
        </div>
        <div />
      </div>
      {stepNum == 0 && <Step1 setStepNum={setStepNum} context={context} />}
      {stepNum == 1 && <Step2 setStepNum={setStepNum} context={context} />}
      {stepNum == 2 && <Step3 setStepNum={setStepNum} context={context} />}
      {stepNum == 3 && (
        <Step4 setStepNum={setStepNum} context={context} locale={locale} />
      )}
      {stepNum == 4 && <Step5 context={context} locale={locale} />}
    </div>
  );
};

export default Installation;
