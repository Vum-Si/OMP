import enUS from "antd/lib/locale/en_US";
import zhCN from "antd/lib/locale/zh_CN";

export const locales = {
  "en-US": {
    antd: enUS,
    name: "OMP",
    // 菜单部分
    menu: {
      // 左侧导航栏
      left: {
        dashboard: "Dashboard",
        resource: {
          name: "Resource",
          chlidren: {
            machine: "Host",
          },
        },
        application: {
          name: "Application",
          chlidren: {
            service: "Service",
            serviceConfig: "Config",
            appStore: "AppStore",
            record: "Record",
            deployment: "Deployment",
          },
        },
        monitor: {
          name: "Monitoring",
          chlidren: {
            exception: "Exceptions",
            alarmLog: "Alarm Log",
            alarmPush: "Alarm Push",
          },
        },
        selfHealing: {
          name: "Self Healing",
          chlidren: {
            strategy: "Strategy",
            record: "Record",
          },
        },
        inspection: {
          name: "Inspection",
          chlidren: {
            strategy: "strategy",
            record: "Record",
          },
        },
        monitorRules: {
          name: "Monitor Rules",
          chlidren: {
            indicator: "Indicator",
            extend: "Extend",
          },
        },
        backup: {
          name: "Backup",
          chlidren: {
            strategy: "strategy",
            record: "Record",
          },
        },
        log: {
          name: "Log",
          chlidren: {
            clear: "Clear",
            level: "Level",
          },
        },
        tool: {
          name: "Tool Box",
          chlidren: {
            toolsList: "Tools List",
            record: "Record",
          },
        },
        systemLog: {
          name: "System Log",
          chlidren: {
            loginLog: "Login Log",
            operationLog: "Operation Log",
          },
        },
        settings: {
          name: "Settings",
          chlidren: {
            user: "User",
            system: "System",
          },
        },
      },
      // 顶部导航栏
      top: {
        deployment: "Deployment",
        grafana: "Monitor",
        container: "Container Services",
        user: {
          changePassword: "Change password",
          logout: "Logout",
        },
      },
    },
    // 通用部分
    common: {
      // 名词
      host: "Host",
      ip: "IP",
      ipAddress: "IP",
      port: "Port",
      agent: "Agent",
      hostAgent: "HostAgent",
      monitorAgent: "MonitorAgent",
      product: "Product",
      service: "Service",
      selfService: "Self Developed Service",
      serviceInstance: "Service Instance",
      appName: "App Name",
      application: "Application",
      component: "Component",
      database: "Database",
      instance: "Instance",
      instanceN: "Instance",
      instanceName: "Instance Name",
      version: "Version",
      exception: "Exception",
      exceptionList: "Exception List",
      statusOverview: "Status Overview",
      log: "Log",
      monitor: "Monitor",
      alert: "Alert",
      analysis: "Analysis",
      time: "Time",
      timestamp: "Timestamp",
      timeout: "Timeout",
      created: "Created",
      updated: "Update Time",
      maintain: "Maintain",
      maintainMode: "MaintainMode",
      cpu: "CPU",
      memory: "Memory",
      disk: "Disk",
      rootFolder: "Root Folder",
      dataFolder: "Data Folder",
      partition: "Partition",
      hostname: "Hostname",
      sshPort: "SSH Port",
      username: "Username",
      password: "Password",
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm Password",
      system: "Operating System",
      env: "env",
      ntpdate: "NtpDate",
      fileExtension: "File Extension",
      platformAccess: "Platform Access",
      mode: "Mode",
      clusterMode: "Cluster Mode",
      single: "Single",
      cluster: "Cluster",
      network: "Network",
      website: "Website",
      operator: "Operator",
      runUser: "Run User",
      runtime: "Runtime",
      package: "Package",
      installPackage: "Installation package",
      current: "Current",
      target: "Target",
      general: "General",
      highAvailability: "High Availability",
      dependence: "Dependence",
      dependent: "Dependent",
      dependentOn: "Dependent On",
      including: "Including",
      global: "Global",
      config: "Config",
      synchronization: "Synchronization",
      serviceDistribution: "Distribution",
      distribution: "Distribution",
      undistribution: "Undistribution",
      list: "List",
      set: "Set",
      role: "Role",
      superuser: "Superuser",
      readonly: "Read only",
      ordinary: "Ordinary",
      active: "Active",
      strategy: "Strategy",
      email: "Email",
      feishu: "Lark",
      mailServer: "Mail Server",
      alarm: "Alarm",
      period: "Period",
      report: "Report",
      settings: "Settings",
      task: "Task",
      compare: "Compare",
      threshold: "Threshold",
      builtIn: "Built in",
      custom: "Custom",
      indicator: "Indicator",
      title: "Title",
      content: "Content",
      extendedMetrics: "Extended Metrics",
      script: "Script",
      parameter: "Parameter",
      param: "Params",
      backup: "Backup",
      size: "Size",
      remote: "Remote",
      expire: "Expire",
      level: "Level",
      clear: "Clear",
      management: "Management",
      security: "Security",
      other: "Other",
      tool: "Tool",
      automatedTest: "Automated Test",
      usageFrequency: "Usage frequency",
      entity: "Entity",
      configName: "Name",
      configValue: "Value",
      pre: "Pre",
      post: "Post",
      firewall: "Firewall",
      fileLimit: "File Limit",
      kernel: "Kernel",
      performance: "Performance",
      coding: "Coding",
      loopbackAdd: "Loopback Address",
      hosts: "Hostname Resolution",
      createUser: "Create User",
      systemLoad: "System Load",
      process: "Process",
      portconnectivity: "Port connectivity",
      consumerDisplacement: "Consumer displacement",

      // 数据
      data: "Data",
      all: "All",
      use: "Used",
      name: "Name",
      type: "Type",
      module: "Module",
      severity: "Severity",
      description: "Description",
      basic: "Basic",
      info: "Info",
      noData: "NoData",
      detail: "Details",
      usage: "Usage",
      historicRecords: "Historic Records",
      row: "Row",
      template: "Template",
      file: "File",
      directory: "Directory",
      result: "Result",
      record: "Record",
      begin: "Begin",
      beginTime: "Begin",
      end: "End",
      endTime: "End",
      duration: "Duration",
      durationS: "Duration",
      number: "Number",
      quantity: "Quantity",
      reminder: "Reminder",
      rule: "Rule",
      default: "Default",
      redundancy: "Redundancy",
      instruction: "Instruction",
      path: "Path",
      value: "Value",
      notes: "Notes",
      required: "Required",
      radio: "Radio",
      text: "Text",
      here: "here",
      progress: "Progress",
      solution: "Solution",

      // 操作
      action: "Action",
      more: "More",
      refresh: "Refresh",
      open: "Open",
      close: "Close",
      add: "Add",
      edit: "Edit",
      delete: "Delete",
      query: "Query",
      import: "Import",
      export: "Export",
      start: "Start",
      restart: "Restart",
      stop: "Stop",
      install: "Install",
      upgrade: "Upgrade",
      rollback: "Rollback",
      uninstall: "Uninstall",
      reinstall: "Reinstall",
      input: "Input",
      select: "Select",
      init: "Init",
      cancel: "Cancel",
      ok: "OK",
      change: "Change",
      batch: "Batch",
      upload: "Upload",
      uploadFile: "Upload",
      download: "DownLoad",
      downloadTemplate: "DownLoad",
      next: "Next",
      previous: "Previous",
      deployNum: "Num of deploy",
      deployment: "Deployment",
      view: "View",
      termination: "Termination",
      generate: "Generate",
      back: "Back",
      scan: "Scan",
      scanning: "Scanning",
      publish: "Publish",
      publishing: "Publishing",
      incorporate: "Incorporate",
      reuse: "Reuse",
      retry: "Retry",
      changePass: "Change Password",
      batchRead: "Batch Read",
      example: "Example",
      sender: "Sender",
      receiver: "Receiver",
      push: "Push",
      pushing: "Pushing",
      noPush: "Not pushed",
      repair: "Repair",
      inspection: "Inspection",
      deep: "Deep",
      manually: "Manually",
      regularly: "Regularly",
      regular: "Regular",
      click: "Click",
      check: "Check",
      encrypt: "Encrypt",
      decrypt: "Decrypt",
      unzip: "Unzip",
      output: "Output",
      get: "Get",
      neednot: "Need Not",

      // 状态
      status: "Status",
      abnormal: "Abnormal",
      normal: "Normal",
      starting: "Starting",
      restarting: "Restarting",
      stopping: "Stopping",
      startupFailed: "Startup Failed",
      installing: "Installing",
      installFailed: "Install Failed",
      upgrading: "Upgrading",
      upgradeFailed: "Upgrade Failed",
      rollbacking: "Rolling back",
      rollbackFailed: "Rollback Failed",
      installed: "Installed",
      noMonitored: "NoMonitored",
      succeeded: "Succeeded",
      passed: "Passed",
      failed: "Failed",
      execute: "Execute",
      executing: "Executing",
      unexecuted: "Unexecuted",
      noSsh: "No SSH",
      none: "None",
      verify: "Verify",
      verifying: "Verifying",
      create: "Create",
      creating: "Creating",
      editing: "Editing",
      yes: "Yes",
      no: "No",
      error: "Error",
      running: "Running",
      noRunning: "No Running",
      waiting: "Waiting",
      unknown: "Unknown",
      completed: "Completed",
      latestVer: "Latest Ver",
      loading: "Loading",
      registering: "Registering",
      disable: "Disable",
      disabled: "Disabled",
      enable: "Enable",
      enabled: "Enabled",
      save: "Save",
      repairing: "Repairing",
      login: "Login",
      notFound: "Not Found",
      repeat: "Repeat",
      different: "Different",

      // 统计
      total: "Total",
      count: "Count",
      selected: "Selected",
      tiao: "",
      ge: "",
      ci: "",
      tai: "",
      ri: "",
      ln: " ",

      // 星期，时间
      timezone: "Timezone",
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      hourly: "Hourly",
      forever: "Forever",
      day: "Day",
      days: "Days",
      every: "Every",
      hour: "Hour",
      d: "d",
      h: "h",
      m: "m",
      s: "s",
    },
  },
  "zh-CN": {
    antd: zhCN,
    name: "运维工具包",
    // 菜单部分
    menu: {
      // 左侧导航栏
      left: {
        dashboard: "仪表盘",
        resource: {
          name: "资源管理",
          chlidren: {
            machine: "主机管理",
          },
        },
        application: {
          name: "应用管理",
          chlidren: {
            service: "服务管理",
            serviceConfig: "配置管理",
            appStore: "应用商店",
            record: "执行记录",
            deployment: "模板部署",
          },
        },
        monitor: {
          name: "应用监控",
          chlidren: {
            exception: "异常清单",
            alarmLog: "告警日志",
            alarmPush: "告警推送",
          },
        },
        selfHealing: {
          name: "故障自愈",
          chlidren: {
            strategy: "自愈策略",
            record: "自愈记录",
          },
        },
        inspection: {
          name: "状态巡检",
          chlidren: {
            strategy: "巡检策略",
            record: "巡检记录",
          },
        },
        monitorRules: {
          name: "指标中心",
          chlidren: {
            indicator: "指标规则",
            extend: "指标扩展",
          },
        },
        backup: {
          name: "数据备份",
          chlidren: {
            strategy: "备份策略",
            record: "备份记录",
          },
        },
        log: {
          name: "日志管理",
          chlidren: {
            clear: "日志清理",
            level: "日志等级",
          },
        },
        tool: {
          name: "实用工具",
          chlidren: {
            toolsList: "工具管理",
            record: "任务记录",
          },
        },
        systemLog: {
          name: "系统日志",
          chlidren: {
            loginLog: "登录日志",
            operationLog: "操作日志",
          },
        },
        settings: {
          name: "系统设置",
          chlidren: {
            user: "用户管理",
            system: "系统管理",
          },
        },
      },
      // 顶部导航栏
      top: {
        deployment: "快速部署",
        grafana: "监控平台",
        container: "容器服务",
        user: {
          changePassword: "修改密码",
          logout: "退出登录",
        },
      },
    },
    // 通用部分
    common: {
      // 名词
      host: "主机",
      ip: "IP",
      ipAddress: "IP地址",
      port: "端口",
      agent: "Agent",
      hostAgent: "主机Agent",
      monitorAgent: "监控Agent",
      product: "产品",
      service: "服务",
      selfService: "自研服务",
      serviceInstance: "服务实例",
      appName: "应用名称",
      application: "应用服务",
      component: "基础组件",
      database: "数据库",
      instance: "实例",
      instanceN: "实例名",
      instanceName: "实例名称",
      version: "版本",
      exception: "异常",
      exceptionList: "异常清单",
      statusOverview: "状态概览",
      log: "日志",
      monitor: "监控",
      alert: "告警",
      analysis: "分析",
      time: "时间",
      timestamp: "时间",
      timeout: "超时时间",
      created: "创建时间",
      updated: "更新时间",
      maintain: "维护模式",
      maintainMode: "维护模式",
      cpu: "CPU",
      memory: "内存",
      disk: "磁盘",
      rootFolder: "根分区",
      dataFolder: "数据分区",
      partition: "分区",
      hostname: "Hostname",
      sshPort: "SSH端口",
      username: "用户名",
      password: "密码",
      currentPassword: "当前密码",
      newPassword: "新密码",
      confirmPassword: "确认密码",
      system: "操作系统",
      env: "环境",
      ntpdate: "时间同步服务",
      fileExtension: "文件扩展名",
      platformAccess: "平台访问",
      mode: "模式",
      clusterMode: "集群模式",
      single: "单实例",
      cluster: "集群",
      network: "网络",
      website: "网址",
      operator: "执行用户",
      runUser: "运行用户",
      runtime: "运行时间",
      package: "安装包",
      installPackage: "安装包",
      current: "当前",
      target: "目标",
      general: "通用",
      highAvailability: "高可用",
      dependence: "依赖",
      dependent: "依赖",
      dependentOn: "被依赖",
      including: "包含",
      global: "全局",
      config: "配置",
      synchronization: "配置同步",
      serviceDistribution: "服务分布",
      distribution: "分配",
      undistribution: "未分配",
      list: "列表",
      set: "集合",
      role: "角色",
      superuser: "系统管理员",
      readonly: "只读",
      ordinary: "普通用户",
      active: "用户状态",
      strategy: "策略",
      email: "邮件",
      feishu: "飞书",
      mailServer: "邮件服务器",
      alarm: "告警",
      period: "周期",
      report: "报告",
      settings: "设置",
      task: "任务",
      compare: "比较规则",
      threshold: "阈值",
      builtIn: "内置",
      custom: "自定义",
      indicator: "指标",
      title: "标题",
      content: "内容",
      extendedMetrics: "扩展指标",
      script: "脚本",
      parameter: "参数",
      param: "参数",
      backup: "备份",
      size: "大小",
      remote: "远端",
      expire: "过期",
      level: "等级",
      clear: "清理",
      management: "管理",
      security: "安全",
      other: "其他",
      tool: "工具",
      automatedTest: "自动化测试",
      usageFrequency: "使用次数",
      entity: "实体",
      configName: "配置项",
      configValue: "配置值",
      pre: "前置",
      post: "后置",
      firewall: "防火墙",
      fileLimit: "文件句柄数",
      kernel: "内核",
      performance: "性能",
      coding: "编码",
      loopbackAdd: "回环地址",
      hosts: "主机名解析",
      createUser: "创建用户",
      systemLoad: "系统负载",
      process: "进程",
      portconnectivity: "端口连通性",
      consumerDisplacement: "消费位移",

      // 数据
      data: "数据",
      all: "全部",
      use: "使用",
      name: "名称",
      type: "类型",
      module: "功能模块",
      severity: "级别",
      description: "描述",
      basic: "基本",
      info: "信息",
      noData: "暂无数据",
      detail: "详细信息",
      usage: "使用率",
      historicRecords: "历史记录",
      row: "行号",
      template: "模板",
      file: "文件",
      directory: "目录",
      result: "结果",
      record: "记录",
      begin: "开始",
      beginTime: "开始时间",
      end: "结束",
      endTime: "结束时间",
      duration: "用时",
      durationS: "持续时长",
      number: "编号",
      quantity: "数量",
      reminder: "提示",
      rule: "规则",
      default: "默认",
      redundancy: "冗余系数",
      instruction: "说明",
      path: "路径",
      value: "值",
      notes: "备注",
      required: "必填",
      radio: "单选",
      text: "文本",
      here: "这里",
      progress: "进度",
      solution: "处理方案",

      // 操作
      action: "操作",
      more: "更多",
      refresh: "刷新",
      open: "开启",
      close: "关闭",
      add: "添加",
      edit: "编辑",
      delete: "删除",
      query: "查询",
      import: "导入",
      export: "导出",
      start: "启动",
      restart: "重启",
      stop: "停止",
      install: "安装",
      upgrade: "升级",
      rollback: "回滚",
      uninstall: "卸载",
      reinstall: "重装",
      input: "输入",
      select: "选择",
      init: "初始化",
      cancel: "取消",
      ok: "确认",
      change: "修改",
      batch: "批量",
      upload: "上传",
      uploadFile: "上传文件",
      download: "下载",
      downloadTemplate: "下载模板",
      next: "下一步",
      previous: "上一步",
      deployNum: "部署数量",
      deployment: "部署",
      view: "查看",
      termination: "强制终止",
      generate: "生成",
      back: "返回",
      scan: "扫描",
      scanning: "扫描中",
      publish: "发布",
      publishing: "发布中",
      incorporate: "纳管",
      reuse: "复用",
      retry: "重试",
      changePass: "修改密码",
      batchRead: "批量已读",
      example: "示例",
      sender: "发件人",
      receiver: "收件人",
      push: "推送",
      pushing: "推送中",
      noPush: "未推送",
      repair: "自愈",
      inspection: "巡检",
      deep: "深度",
      manually: "手动执行",
      regularly: "定时执行",
      regular: "定时",
      click: "点击",
      check: "检查",
      encrypt: "加密",
      decrypt: "解密",
      unzip: "解压",
      output: "输出",
      get: "获取",
      neednot: "无需",

      // 状态
      status: "状态",
      abnormal: "异常",
      normal: "正常",
      starting: "启动中",
      restarting: "重启中",
      stopping: "停止中",
      startupFailed: "启动失败",
      installing: "安装中",
      installFailed: "安装失败",
      upgrading: "升级中",
      upgradeFailed: "升级失败",
      rollbacking: "回滚中",
      rollbackFailed: "回滚失败",
      installed: "已安装",
      noMonitored: "未监控",
      succeeded: "成功",
      passed: "通过",
      failed: "失败",
      execute: "执行",
      executing: "执行中",
      unexecuted: "未执行",
      noSsh: "无SSH",
      none: "无",
      verify: "校验",
      verifying: "校验中",
      create: "创建中",
      creating: "创建中",
      editing: "编辑中",
      yes: "是",
      no: "否",
      error: "错误",
      running: "正常",
      noRunning: "停止",
      waiting: "等待",
      unknown: "未知",
      completed: "完成",
      latestVer: "最新版本",
      loading: "加载中",
      registering: "注册中",
      disable: "停用",
      disabled: "停用",
      enable: "启用",
      enabled: "启用",
      save: "保存",
      repairing: "自愈中",
      login: "登录",
      notFound: "未找到",
      repeat: "重复",
      different: "不一致",

      // 统计
      total: "总计",
      count: "次数",
      selected: "选中",
      tiao: " 条",
      ge: " 个",
      ci: " 次",
      ri: "日",
      ln: "",
      tai: "台",

      // 星期，时间
      timezone: "时区",
      monday: "星期一",
      tuesday: "星期二",
      wednesday: "星期三",
      thursday: "星期四",
      friday: "星期五",
      saturday: "星期六",
      sunday: "星期日",
      daily: "每天",
      weekly: "每周",
      monthly: "每月",
      hourly: "小时",
      forever: "永久",
      day: "天",
      days: "天",
      every: "每",
      hour: "小时",
      d: "天",
      h: "时",
      m: "分",
      s: "秒",
    },
  },
};