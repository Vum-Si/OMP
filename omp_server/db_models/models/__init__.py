from .backup import BackupSetting, BackupHistory, BackupCustom
from .email import EmailSMTPSetting, ModuleSendEmailSetting
from .env import Env
from .execution import ExecutionRecord
from .host import Host, HostOperateLog
from .inspection import InspectionHistory, InspectionCrontab, InspectionReport
from .install import MainInstallHistory, PreInstallHistory, \
    DetailInstallHistory, PostInstallHistory, DeploymentPlan
from .monitor import MonitorUrl, Alert, Maintain, GrafanaMainPage, \
    AlertSendWaySetting, ServiceLogLevel, AlertSettings
from .product import Labels, UploadPackageHistory, ProductHub, \
    ApplicationHub, Product
from .service import ServiceConnectInfo, ClusterInfo, \
    Service, ServiceHistory, CollectLogRuleHistory, \
    ClearLogRule
from .threshold import HostThreshold, ServiceThreshold, ServiceCustomThreshold, AlertRule, Rule
from .tool import ToolInfo, ToolExecuteMainHistory, ToolExecuteDetailHistory
from .upload import UploadFileHistory
from .user import UserProfile, OperateLog, UserLoginLog
from .upgrade import UpgradeHistory, UpgradeDetail, RollbackHistory, \
    RollbackDetail
from .self_heal import SelfHealingSetting, SelfHealingHistory, \
    WaitSelfHealing
from .custom_metric import CustomScript
from .service_conf import ServiceConfHistory

__all__ = [
    # 邮箱设置
    EmailSMTPSetting,
    ModuleSendEmailSetting,
    # 环境
    Env,
    # 主机
    Host,
    HostOperateLog,
    # 巡检
    InspectionHistory,
    InspectionCrontab,
    InspectionReport,
    # 安装
    MainInstallHistory,
    PreInstallHistory,
    PostInstallHistory,
    DetailInstallHistory,
    DeploymentPlan,
    # 监控
    MonitorUrl,
    Alert,
    Maintain,
    GrafanaMainPage,
    AlertSendWaySetting,
    ServiceLogLevel,
    # 产品
    Labels,
    UploadPackageHistory,
    ProductHub,
    ApplicationHub,
    Product,
    # 服务
    ServiceConnectInfo,
    ClusterInfo,
    Service,
    ServiceHistory,
    # 阈值
    HostThreshold,
    ServiceThreshold,
    ServiceCustomThreshold,
    # 用户
    UserProfile,
    OperateLog,
    UserLoginLog,
    # 升级
    UpgradeHistory,
    UpgradeDetail,
    # 回滚
    RollbackHistory,
    RollbackDetail,
    # 备份
    BackupSetting,
    BackupHistory,
    # 自愈
    SelfHealingHistory,
    SelfHealingSetting,
    WaitSelfHealing,
    # 执行记录
    ExecutionRecord,
    # 小工具
    ToolInfo,
    ToolExecuteMainHistory,
    ToolExecuteDetailHistory,
    # 上传文件公共表
    UploadFileHistory,
    Alert,
    AlertRule,
    # 自定义脚本
    CustomScript,
    Alert,
    AlertRule,
    # 日志
    CollectLogRuleHistory,
    ClearLogRule,
    #配置记录
    ServiceConfHistory,
    #告警推送配置
    AlertSettings,
]
