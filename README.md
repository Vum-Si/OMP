# Readme
# OMP-运维管理平台
OMP（Operation Management Platform）是云智慧公司自主设计、研发的轻量级、聚合型、智能运维管理平台。是一款为用户提供便捷运维能力和业务管理的综合平台。具备运维一应俱全的功能，目的是提升运维自动化、智能化，提高运维效率，提升业务连续性和安全性。

# OMP设计初衷
## 目前运维面临的痛点：
- 主机环境多样性，难以统一管理：如：混合云、私有云、跨IDC、虚拟化、容器化等
- 业务变更难度较大，自动编排能力较低
- 业务状态监控，多平台难以数据联动
- 业务出现异常，难以实现故障自愈
- 业务运行状态，难以评估，更难以分析
- 运维知识匮乏，缺少专家指导及专家解决方案

运维管理平台(OMP)的设计初衷就是想打造一应俱全的运维平台，降低交付难度，提升运维自动化、智能化，提高运维效率，提升业务连续性和安全性。

# OMP核心功能
- **主机纳管**：纳管主机资源，实时监控主机运行状态，可在线管理、在线连接终端等
- **应用管理**：平台已内置常用基础组件，也支持符合标准的自研服务发布到应用商店，从而提供便捷的应用管理，如：安装部署、变更发布、弹性扩缩容、在线配置、优化等
- **应用监控**：涵盖标准监控、定制监控、链路监控、智能监控等多种业务场景，通过大数据智能测算，可感知未来趋势，将异常控制在发生前
- **故障自愈**：当业务系统出现异常或故障时，可按照预定的自愈策略进行故障治理，极大降低故障对业务影响，减少企业损失
- **状态巡检**：自动、手动进行业务指标、运行状态汇总，支持自动发送报告到指定邮箱
- **备份/恢复**：针对核心数据进行本地+异地备份，支持自动执行备份并将数据发送至指定邮箱，达到异地的存储效果，确保数据安全
- **精简工具**：提供运维常用工具、命令、脚本、SQL等，为日常运维操作提供便利，减少误操作、减低技术门槛，支持自行维护、扩充更多工具
- **知识文库**：积累运维常用知识、技术、架构、解决方案等，支持自行维护、扩充文库内容
- **小智解答**：可以快速检索知识文库内容，如文库知识不足，可以申请人工远程支持
- **权限管理**：针对不同用户、角色，进行权限控制，及操作审计
- **大屏展示**：用大屏来展示最核心的运营状态
- **批量处理、流水线**：<待定>

# 架构设计
![./doc/architecture.png](./doc/architecture.png)

# 环境依赖

## 后端技术栈：
- Python 3.8.7
- Django 3.1.4
- Saltstack 3002.2
- Uwsgi 2.0.19.1

## 数据库:
- mysql 5.7.37
- redis 6.2.7

## 前端技术栈：
- Tengine 1.22.0
- React 17.0.1

## 监控技术栈：
- Prometheus 2.25.1
- Alertmanager 0.24.0
- Grafana  7.4.3
- Loki 2.1.0
- Promtail 2.2.0

# 安装部署
## CentOS环境部署：
当前OMP安装包内部包含了其使用的所有组件，建议将OMP部署在 /data/ 下，当前版本部署流程如下：   \
step0：下载/解压安装包
```shell
# omp_open-0.5.tar.gz
wget -c https://github.com/CloudWise-OpenSource/OMP/releases/download/Release-v0.5.0/omp_open-0.5.tar.gz
tar -xmf omp_open-0.5.tar.gz -C /data
```

step1：依赖环境配置
编辑文件vim /data/omp/config/omp.yaml

注意：当前版本已携带mysql、redis安装，配置信息如下，如需修改请在安装前修改

```yaml
# redis相关配置
redis:
  host: 127.0.0.1
  port: 6380
  password: common123
# mysql相关配置
mysql:
  host: 127.0.0.1
  port: 3307
  username: common
  password: Common@123
```

step2：执行安装脚本
```shell
cd /data/omp && bash scripts/install.sh
# 注意1：执行后根据提示选择本机ip，如主机上存在多网卡多IP情况，需要根据业务需求自行判断使用哪个ip地址
# 注意2：当前执行操作的用户即为OMP中各个服务进程的运行用户，在以后的维护中，也应使用此用户进行操作
```

step3：grafana配置（执行install.sh报错时执行此步骤，后续会进行优化）
```shell
# 如果在安装过程中出现了grafana相关安装错误，需要确认grafana是否已经启动
# 在grafana启动的前提下执行其更新命令
/data/omp/component/env/bin/python3 /data/omp/scripts/source/update_grafana.py local_ip
```

step4：grafana跳转面板初始化（在跳转grafana出错情况下使用）
```shell
$ /data/omp/component/env/bin/python3 /data/omp/omp_server/manage.py shell
Python 3.8.7 (default, Dec 22 2020, 06:47:35)
[GCC 4.8.5 20150623 (Red Hat 4.8.5-44)] on linux
Type "help", "copyright", "credits" or "license" for more information.
(InteractiveConsole)
>>> from utils.plugin.synch_grafana import synch_grafana_info
>>> synch_grafana_info()
>>> quit()
```

## Demo

通过浏览器访问页面，访问入口为：http://omp.cloudwise.com/#/login    \
默认用户名：admin     \
默认密码：Yunweiguanli@OMP  \
每晚 00:00 将重置数据
## 卸载OMP
omp节点上卸载操作如下：
```shell
bash /data/omp/scripts/uninstall.sh
```
# 升级回滚

## OMP 自身升级、回滚

```shell
# 升级命令
bash cmd_manager omp_upgrade [必填参数：升级目标路径(如:/data/omp，注意此处路径末尾无/)] [选填参数:从某个断点处升级,默认开头]
# 例如
bash 升级包路径/scripts/cmd_manager omp_upgrade /data/omp(当前正在运行的旧安装路径) 

# 回滚命令
bash cmd_manager omp_upgrade [必填参数：升级目标路径(如:/data/omp，注意此处路径末尾无/)] [选填参数:从某个断点处升级,默认开头]
# 例如
bash 升级包路径/scripts/cmd_manager omp_rollback /data/omp(当前正在运行的旧安装路径)
```

## 断点执行

常用于执行过程中某一步骤失败时，期望从失败步骤处再次执行时使用，正常情况无需考虑此参数，参数默认下标为0

升级回滚可以理解成为jenkins的pipliene 是分步骤执行的，当我们在某一个位置出现异常时，手动修复后通过错误节点再次进行时使用，而跳过之前已经升级（回滚）正确的步骤

```shell
# 升级流程顺序如下：
# PreUpdate, Mysql, Redis, Grafana, Tengine, OmpWeb, OmpServer, Python, PostUpdate
```



# 应用商店

## 如何制作一个OMP应用商店中的应用

[OMP 社区版-应用商店发布说明文档](./doc/app_publish.md)
> 内含
 - 基础组件打包规范
 - 应用服务打包规范
 - 目录和配置说明
 - postgreSql、redis、rocketmq等应用Demo

## 卸载应用商店中已经发布的应用

命令行方式如下（未来会支持界面化方式，请关注后续版本）

```shell
export LD_LIBRARY_PATH=/data/omp/component/env/lib && /data/omp/component/env/bin/python3.8 /data/omp/scripts/source/uninstall_app_store.py --product 产品名称 --app_name 组件/服务名称 --version 版本
```

 已经部署服务实例的安装包，无法卸载

 参数说明：

1.  ***--version*** 缺省时，卸载所有版本
2.  卸载基础组件 ***--app_name 基础组件名称***
3.  卸载应用/产品  ***--product 应用/产品名称***
4.  卸载应用下指定服务 ***--product 应用/产品名称 --app_name 服务名称***



## OMP脚本功能说明

omp的控制脚本位于 omp/scripts/omp 其具体使用方式如下：
```shell
bash omp [all|tengine|uwsgi|worker|cron|salt|prometheus|alertmanager|grafana|loki] [status|start|stop|restart]
# OMP的所有组件的控制参数
bash omp all [status|start|stop|restart]
# 控制tengine的启停，影响页面访问
bash omp tengine [status|start|stop|restart]
# 控制django后端程序启停，影响页面访问
bash omp uwsgi [status|start|stop|restart]
# 控制celery异步任务启停，影响异步任务执行
bash omp worker [status|start|stop|restart]
# 控制celery定时任务，影响定时任务执行
bash omp cron [status|start|stop|restart]
# 控制salt-master的启停，影响服务端对Agent端的控制
bash omp salt [status|start|stop|restart]
# 控制prometheus的启停，影响页面监控数据
bash omp prometheus [status|start|stop|restart]
# 控制alertmanager的启停，影响告警邮件的发送，页面告警信息展示
bash omp alertmanager [status|start|stop|restart]
# 控制grafana的启停，影响页面grafana iframe数据、页面展示
bash omp grafana [status|start|stop|restart]
# 控制loki的启停，影响日志采集、页面展示服务日志问题
bash omp loki [status|start|stop|restart]
```

更新日志
V0.1.0 (2021.11.30)
新增功能:   
- 【仪表盘】   
  - 全局状态概览
  - 当前异常信息展示
  - 各模块状态展示   
- 【主机管理】
  - 主机纳管（添加、导入、编辑、维护、删除）
  - 主机自动监控、告警   
- 【应用商店】
  - 组件、应用WEB发布、服务端自动发现
  - 组件、应用部署，自动编排解决依赖   
- 【服务管理】
  - 服务管理（启动、停止、重启、删除）
  - 服务监控（监控、日志、告警、自愈）
- 【应用监控】
  - 实时展示处于异常的主机、服务信息，呼应仪表盘的异常清单
  - 告警历史记录查看，未读提醒，按添加检索
  - 支持监控组件地址自定义，便于对接现有监控平台   
- 【状态巡检】
  - 支持主机巡检、组件巡检、深度分析，且支持导出
  - 支持定时自动执行巡检任务
- 【系统管理】
  - 用户账户管理
  - 支持全局维护模式，避免人为操作时误报


更新日志   
V0.5.0 (2022.4.11)   
新增功能:   
- 【应用商店】 
  - 组件、应用服务的升级及回滚
  - 应用服务的增量安装
- 【部署模板】
  - 支持通过部署模版实现批量部署
- 【应用监控】
  - 支持告警邮件配置，将告警信息发送至指定邮箱
- 【故障自愈】
  - 展示故障自愈记录
  - 支持监控到服务状态异常后自动进行重启
  - 支持设置服务自愈尝试次数
- 【指标中心】
  - 支持添加自定义告警指标规则
  - 添加自定义扩展采集指标
- 【数据备份】
  - 支持mysql、arangodb、postgreSql数据备份
  - 备份记录展示、下载、删除
  - 支持自定义保存路径、定时备份策略及邮件推送备份内容
- 【实用工具】
  - 内置部分运维实用小工具
  - 展示小工具执行过程、输出展示及生成文件下载
- 【系统管理】
  - 增加邮件管理，支持设置smtp邮件服务器作为全局邮件发件箱

功能优化：
- 【平台优化】
  - 优化主机纳管逻辑，增加纳管成功率，支持删除主机
  - 优化应用安装服务逻辑代码
  - 优化巡检逻辑
  - 优化部分前端页面显示及交互效果 
- 【其他】
  - 修复已知bug

V0.6.0 (2022.11.29)   
新增功能:   
- 升级内置基础组件和环境
  - alertmanager 升级至 v0.24.0
  - tengine 升级至 v1.22.0
  - 扩充内置环境中部分第三方库
- 升级主机 Agent  & 监控 Agent
- 优化小工具异步任务执行逻辑
- 更新 prometheus 和 loki 的配置
- 修复 grafana 面板中 mysql 显示异常问题
- 补充应用商店基础组件包：mysq、elasticsearch
- 组件包从代码库抽离，减少源码 & 包体量

V0.7.0 (2022.12.30) 
- 完善 OMP 管理脚本功能
  - 支持升级、回滚，支持断点重试
  - 支持命令行卸载应用商店已发布服务
- 内置 Redis 5.0.37 升级至 6.2.7
- 验证码登陆
- 修改密码长度异常问题

欢迎加入
获取更多关于OMP的技术资料，或加入OMP开发者交流群，可扫描下方二维码咨询

<img src="./doc/contact-us.png" width="600px" height="400px" />
