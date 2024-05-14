import Router from "./router.js";
import { Provider } from "react-redux";
import store from "@/store_redux/reduxStore";
// 国际化
import { ConfigProvider } from "antd";
import "moment/locale/zh-cn";
import { locales } from "@/config/locales";
import { useState, useEffect } from "react";

const App = () => {
  const [locale, setLocale] = useState(
    localStorage.getItem("locale") || "zh-CN"
  );

  const currentLocale = locales[locale];

  useEffect(() => {
    localStorage.setItem("locale", locale);
  }, [locale]);

  return (
    <ConfigProvider locale={currentLocale.antd}>
      <Provider store={store}>
        <Router locale={locale} setLocale={setLocale} />
      </Provider>
    </ConfigProvider>
  );
};

export default App;
