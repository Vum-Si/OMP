export const logCreate = (app_name, log, context) => {
  if (app_name === "初始化安装流程") {
    let msgMap = {
      前置安装操作: context.install + context.ln + context.init,
      主机名解析: context.hosts,
      获取系统版本信息完成:
        context.get +
        context.ln +
        context.system +
        context.ln +
        context.version +
        context.ln +
        context.succeeded,
      校验: context.check,
      解释器: "",
      时区: context.timezone,
      防火墙: context.firewall,
      文件具柄数: context.fileLimit,
      内核参数: context.kernel + context.ln + context.param,
      磁盘性能: context.disk + context.ln + context.performance,
      inode数: "inode" + context.ln + context.number,
      编码格式: context.system + context.ln + context.coding,
      host回环地址: context.host + context.ln + context.loopbackAdd,
      完整日志保存在: context.log + context.ln + context.save,
      创建用户命令: context.createUser,
      开始: context.begin,
      完成: context.succeeded,
      成功: context.succeeded,
      结束: context.succeeded,
      执行: context.execute,
      发送: context.push,
      文件: context.ln + context.file,
      升级: context.upgrade,
      参数位: context.ln + context.param,
    };
    for (let key in msgMap) {
      log = log.replace(new RegExp(key, "g"), msgMap[key] + context.ln);
    }

    return log;
  } else if (app_name === "安装后续任务") {
    return log;
  } else if (app_name === "升级前置操作") {
    let msgMap = {
      更新成功: context.ln + context.upgrade + context.ln + context.succeeded,
    };
    for (let key in msgMap) {
      log = log.replace(new RegExp(key, "g"), msgMap[key] + context.ln);
    }

    return log;
  } else {
    let msgMap = {
      输出如下: context.output,
      安装进度: context.ln + context.install + context.ln + context.progress,
      初始化进度: context.ln + context.init + context.ln + context.progress,
      文件配置: context.ln + context.file + context.ln + context.config,
      开始: context.begin,
      成功: context.succeeded,
      失败: context.failed,
      执行: context.execute,
      升级中: context.upgrading,
      发送: context.push,
      解压: context.unzip,
      备份: context.backup,
      服务包: context.package,
      升级包: context.upgrade + context.ln + context.package,
      安装: context.install,
      升级: context.upgrade,
      回滚: context.rollback,
      启动: context.start,
      停止: context.stop,
      初始化: context.init,
      脚本: context.script,
      服务: context.service,
      实例: context.instance,
      配置: context.config,
      无需: context.neednot,
      跳过: context.passed,
      中: context.executing,
    };
    for (let key in msgMap) {
      log = log.replace(new RegExp(key, "g"), msgMap[key] + context.ln);
    }

    return log;
  }
};
