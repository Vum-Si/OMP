import {
  HashRouter as Router,
  Route,
  Switch,
  Redirect,
} from "react-router-dom";
import OmpLayout from "@/layouts";
import Login from "@/pages/Login";
import getRouterConfig from "@/config/router.config";
import HomePage from "@/pages/HomePage";
import { locales } from "@/config/locales";

const OmpRouter = ({ locale, setLocale }) => {
  const currentLocale = locales[locale];

  let routerChildArr = getRouterConfig(currentLocale)
    .map((item) => item.children)
    .flat();
  return (
    <Router>
      <Switch>
        <Route path="/login" component={() => <Login />} />
        <Route
          path="/"
          component={() => (
            <OmpLayout locale={locale} setLocale={setLocale}>
              <Switch>
                <Route
                  path="/homepage"
                  key="/homepage"
                  exact
                  render={() => <HomePage locale={locale} />}
                />
                {routerChildArr.map((item) => {
                  return (
                    <Route
                      path={item.path}
                      key={item.path}
                      exact
                      render={() => <item.component locale={locale} />}
                    />
                  );
                })}
                <Redirect exact path="/" to="/homepage" />
              </Switch>
            </OmpLayout>
          )}
        />
        ]
      </Switch>
    </Router>
  );
};

export default OmpRouter;
