import AppStore from "@/pages/AppStore";
import AppStoreDetail from "@/pages/AppStore/config/detail";
//import VersionManagement from "@/pages/ProductsManagement/VersionManagement";
import MachineManagement from "@/pages/MachineManagement";
import UserManagement from "@/pages/UserManagement";
import SystemManagement from "@/pages/SystemManagement";
import AlarmLog from "@/pages/AlarmLog";
import ExceptionList from "@/pages/ExceptionList";
import PatrolInspectionRecord from "@/pages/PatrolInspectionRecord";
import PatrolStrategy from "@/pages/PatrolStrategy";
import PatrolInspectionDetail from "@/pages/PatrolInspectionRecord/config/detail";
import ServiceManagement from "@/pages/ServiceManagement";
import ServiceConfig from "@/pages/ServiceConfig";
import Installation from "@/pages/AppStore/config/Installation";
import InstallationRecord from "@/pages/InstallationRecord";
import Upgrade from "@/pages/AppStore/config/Upgrade";
import Rollback from "@/pages/AppStore/config/Rollback";
import DeploymentPlan from "@/pages/DeploymentPlan";
import BackupRecords from "@/pages/BackupRecords";
import BackupStrategy from "@/pages/BackupStrategy";
import LoginLog from "@/pages/LoginLog";
import SystemLog from "@/pages/SystemLog";
import SelfHealingRecord from "@/pages/SelfHealingRecord";
import SelfHealingStrategy from "@/pages/SelfHealingStrategy";
import ToolManagement from "@/pages/ToolManagement";
import TaskRecord from "@/pages/TaskRecord";
import ToolDetails from "@/pages/ToolManagement/detail";
import ToolExecution from "@/pages/ToolExecution";
import ToolExecutionResults from "@/pages/ToolExecutionResults";
import RuleIndicator from "@/pages/RuleIndicator";
import RuleExtend from "@/pages/RuleExtend";
import GetService from "@/pages/AppStore/config/GetService";
import LogManagement from "@/pages/LogManagement";
import LogClear from "@/pages/LogClear";
import CreateDeployment from "@/pages/DeploymentPlan/CreateDeployment";
import AlarmPush from "@/pages/AlarmPush";
import ContainerService from "@/pages/ContainerService";
import {
  DesktopOutlined,
  BookOutlined,
  SettingOutlined,
  LineChartOutlined,
  AppstoreOutlined,
  EyeOutlined,
  UnorderedListOutlined,
  SaveOutlined,
  SolutionOutlined,
  InteractionOutlined,
  ToolOutlined,
} from "@ant-design/icons";

const getRouterConfig = (currentLocale) => {
  return [
    {
      menuTitle: currentLocale.menu.left.resource.name,
      menuIcon: <DesktopOutlined />,
      menuKey: "/resource-management",
      children: [
        {
          title: currentLocale.menu.left.resource.chlidren.machine,
          path: "/resource-management/machine-management",
          component: MachineManagement,
        },
      ],
    },
    {
      menuTitle: currentLocale.menu.left.application.name,
      menuIcon: <AppstoreOutlined />,
      menuKey: "/application_management",
      children: [
        {
          title: currentLocale.menu.left.application.chlidren.service,
          path: "/application_management/service_management",
          component: ServiceManagement,
        },
        {
          title: currentLocale.menu.left.application.chlidren.serviceConfig,
          path: "/application_management/service_config",
          component: ServiceConfig,
        },
        {
          title: currentLocale.menu.left.application.chlidren.appStore,
          path: "/application_management/app_store",
          component: AppStore,
        },
        // {
        //   title: "服务安装",
        //   path: "/application_management/app_store/installation-service",
        //   notInMenu: true,
        //   component: Installation,
        // },
        {
          title: currentLocale.menu.left.application.chlidren.record,
          path: "/application_management/install-record",
          component: InstallationRecord,
        },
        {
          title: currentLocale.menu.left.application.chlidren.deployment,
          path: "/application_management/deployment-plan",
          component: DeploymentPlan,
        },
        {
          title: "应用商店服务详情",
          path: "/application_management/app_store/app-service-detail/:name/:verson",
          notInMenu: true,
          component: AppStoreDetail,
        },
        {
          title: "应用商店组件详情",
          path: "/application_management/app_store/app-component-detail/:name/:verson",
          notInMenu: true,
          component: AppStoreDetail,
        },
        {
          title: "批量安装",
          path: "/application_management/app_store/installation",
          notInMenu: true,
          component: Installation,
        },
        {
          title: "服务升级",
          path: "/application_management/app_store/service_upgrade",
          notInMenu: true,
          component: Upgrade,
        },
        {
          title: "服务回滚",
          path: "/application_management/app_store/service_rollback",
          notInMenu: true,
          component: Rollback,
        },
        {
          title: "服务纳管",
          path: "/application_management/get-service",
          notInMenu: true,
          component: GetService,
        },
        {
          title: "生成模板",
          path: "/application_management/create-deployment",
          notInMenu: true,
          component: CreateDeployment,
        },
        {
          title: "容器服务",
          path: "/container-service",
          notInMenu: true,
          component: ContainerService,
        },
      ],
    },
    {
      menuTitle: currentLocale.menu.left.monitor.name,
      menuIcon: <LineChartOutlined />,
      menuKey: "/application-monitoring",
      children: [
        {
          title: currentLocale.menu.left.monitor.chlidren.exception,
          path: "/application-monitoring/exception-list",
          component: ExceptionList,
        },
        {
          title: currentLocale.menu.left.monitor.chlidren.alarmLog,
          path: "/application-monitoring/alarm-log",
          component: AlarmLog,
        },
        {
          title: currentLocale.menu.left.monitor.chlidren.alarmPush,
          path: "/application-monitoring/alarm-push",
          component: AlarmPush,
        },
      ],
    },
    {
      menuTitle: currentLocale.menu.left.selfHealing.name,
      menuIcon: <InteractionOutlined />,
      menuKey: "/fault-selfHealing",
      children: [
        {
          title: currentLocale.menu.left.selfHealing.chlidren.strategy,
          path: "/fault-selfHealing/selfHealing-strategy",
          component: SelfHealingStrategy,
        },
        {
          title: currentLocale.menu.left.selfHealing.chlidren.record,
          path: "/fault-selfHealing/selfHealing-record",
          component: SelfHealingRecord,
        },
      ],
    },
    {
      menuTitle: currentLocale.menu.left.inspection.name,
      menuIcon: <EyeOutlined />,
      menuKey: "/status-patrol",
      children: [
        {
          title: currentLocale.menu.left.inspection.chlidren.record,
          path: "/status-patrol/patrol-inspection-record",
          component: PatrolInspectionRecord,
        },
        {
          title: "巡检记录详情",
          path: "/status-patrol/patrol-inspection-record/status-patrol-detail/:id",
          notInMenu: true,
          component: PatrolInspectionDetail,
        },
        {
          title: currentLocale.menu.left.inspection.chlidren.strategy,
          path: "/status-patrol/patrol-strategy",
          component: PatrolStrategy,
        },
      ],
    },
    {
      menuTitle: currentLocale.menu.left.monitorRules.name,
      menuIcon: <UnorderedListOutlined />,
      menuKey: "/rule-center",
      children: [
        {
          title: currentLocale.menu.left.monitorRules.chlidren.indicator,
          path: "/rule-center/indicator-rule",
          component: RuleIndicator,
        },
        {
          title: currentLocale.menu.left.monitorRules.chlidren.extend,
          path: "/rule-center/extend-rule",
          component: RuleExtend,
        },
      ],
    },
    {
      menuTitle: currentLocale.menu.left.backup.name,
      menuIcon: <SaveOutlined />,
      menuKey: "/data-backup",
      children: [
        {
          title: currentLocale.menu.left.backup.chlidren.strategy,
          path: "/data-backup/backup-strategy",
          component: BackupStrategy,
        },
        {
          title: currentLocale.menu.left.backup.chlidren.record,
          path: "/data-backup/backup-record",
          component: BackupRecords,
        },
      ],
    },
    {
      menuTitle: currentLocale.menu.left.log.name,
      menuIcon: <BookOutlined />,
      menuKey: "/log-management",
      children: [
        {
          title: currentLocale.menu.left.log.chlidren.clear,
          path: "/log-management/log-clear",
          component: LogClear,
        },
        {
          title: currentLocale.menu.left.log.chlidren.level,
          path: "/log-management/log-level",
          component: LogManagement,
        },
      ],
    },
    {
      menuTitle: currentLocale.menu.left.tool.name,
      menuIcon: <ToolOutlined />,
      menuKey: "/utilitie",
      children: [
        {
          title: currentLocale.menu.left.tool.chlidren.toolsList,
          path: "/utilitie/tool-management",
          component: ToolManagement,
        },
        {
          title: "工具详情",
          path: "/utilitie/tool-management/tool-management-detail/:id",
          notInMenu: true,
          component: ToolDetails,
        },
        {
          title: "工具执行",
          path: "/utilitie/tool-management/tool-execution/:id",
          notInMenu: true,
          component: ToolExecution,
        },
        {
          title: "执行结果",
          path: "/utilitie/tool-management/tool-execution-results/:id",
          notInMenu: true,
          component: ToolExecutionResults,
        },
        {
          title: currentLocale.menu.left.tool.chlidren.record,
          path: "/utilitie/task-record",
          component: TaskRecord,
        },
      ],
    },
    {
      menuTitle: currentLocale.menu.left.systemLog.name,
      menuIcon: <SolutionOutlined />,
      menuKey: "/operation-record",
      children: [
        {
          title: currentLocale.menu.left.systemLog.chlidren.loginLog,
          path: "/operation-record/login-log",
          component: LoginLog,
        },
        {
          title: currentLocale.menu.left.systemLog.chlidren.operationLog,
          path: "/operation-record/system-log",
          component: SystemLog,
        },
      ],
    },
    {
      menuTitle: currentLocale.menu.left.settings.name,
      menuIcon: <SettingOutlined />,
      menuKey: "/system-settings",
      children: [
        {
          title: currentLocale.menu.left.settings.chlidren.user,
          path: "/system-settings/user-management",
          component: UserManagement,
        },
        {
          title: currentLocale.menu.left.settings.chlidren.system,
          path: "/system-settings/system-management",
          component: SystemManagement,
        },
      ],
    },
  ];
};

export default getRouterConfig;
