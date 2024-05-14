#!/bin/bash

#项目路径
param_omp_project=$1
# cpu架构
cpuBuild=$2
# 版本
#version=$3
# git方式 tag还是branch
#gitStyle=$4


#if [ "$gitStyle" == "branch" ]; then
#  version="dev"
#  fi
cp -rf ../${param_omp_project}/omp_server .
mkdir -p ./omp_web/dist && cp -rf ../${param_omp_project}/omp_web/dist/* ./omp_web/dist/

# 创建目录
array_dir=("config" "data" "logs" "package_hub" "scripts" "component")

for element in "${array_dir[@]}"
do
  cp -rf ../${param_omp_project}/${element} .
done
chmod -R 740 scripts
# 移动监控组件
mkdir -p ./component/monitor_server/
tar -xf ../jfrog/component/${cpuBuild}/monitor_server-${cpuBuild}.tar.gz -C ./component/monitor_server/
monitor_dir=("prometheus" "loki" "grafana" "alertmanager")
for element in "${monitor_dir[@]}"
do
  mkdir -p ./component/${element}/
  mv ./component/monitor_server/${element}/* ./component/${element}/
done
rm -rf ./component/monitor_server
# 移动基础组件 omp_env-x86.tar.gz
component_dir=("omp_env" "omp_tengine" "mysql" "redis" "ntpd" "CloudPanguDB")
for element in "${component_dir[@]}"
do
  tar -xf ../jfrog/component/${cpuBuild}/${element}-${cpuBuild}.tar.gz -C ./component/
done
# .git 删除
find . -type d -name ".git" |xargs rm -rf
# package_hub 移动
# pwd
# ls -l ../jfrog/component/${cpuBuild}/omp_salt_agent-${cpuBuild}.tar.gz
# ls -l ../jfrog/component/${cpuBuild}/ntpdate-${cpuBuild}.tar.gz
# ls -l ./package_hub
cp -f ../jfrog/component/${cpuBuild}/omp_salt_agent-${cpuBuild}.tar.gz ./package_hub/omp_salt_agent.tar.gz
cp -f ../jfrog/component/${cpuBuild}/ntpdate-${cpuBuild}.tar.gz ./package_hub/
test -f ./package_hub/omp_monitor_agent-*.tar.gz
if [ $? -eq 0 ]; then
  rm -f ./package_hub/omp_monitor_agent-*.tar.gz
fi
# omp_monitor_agent-dev-x86.tar.gz omp_monitor_agent-v2.0.0-x86.tar.gz
#cp -f ../jfrog/release-repo/omp_monitor_agent-${version}-${cpuBuild}.tar.gz ./package_hub/