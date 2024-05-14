master_ip=$1
master_port=$2
web_port=$3
plain_text=$4
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

if [ -z "$master_ip" ] || [ -z "$master_port" ]; then
    echo "主节点ip或主节点端口不存在"
    exit 1
fi


get_ip () {
# 获取所有网卡名称
NICs=$(ip addr show | grep 'BROADCAST' | awk '{print $2}' | cut -d ':' -f 1)
# 遍历每个网卡并测试连通性
IPAddr=127.0.0.1
for NIC in $NICs
do
    result=$(ping -c 1 -W 1 -I $NIC $master_ip 2>&1)
    if [[ $result == *"1 packets transmitted, 1 received"* ]]; then
        # 获取网卡的IP地址
        IPAddr=$(ip addr show $NIC | grep 'inet ' | awk '{print $2}' | cut -d '/' -f 1)
    fi
done

if [ "$IPAddr" == "127.0.0.1" ]; then
  echo "所有网卡与 IP $IP 不通,请确认与master连通性"
  exit 1
else
  echo $IPAddr
fi
}
# 定义变量
local_ip=$(get_ip)
hostname=$(hostname)
run_user=$(whoami)

# 提示用户输入新的值
echo "本地ip为：$local_ip"
read -p "确认本地ip的值（回车保持默认值）：" new_A
echo "主机名称为：$hostname"
read -p "请确认主机名称的值（回车保持默认值）：" new_B
echo "agent用户为：$run_user"
read -p "请确认agent用户（回车保持默认值）：" new_C

# 更新变量的值（如果有输入的话）
if [[ ! -z "$new_A" ]]; then
    local_ip="$new_A"
fi

if [[ ! -z "$new_B" ]]; then
    hostname="$new_B"
fi

if [[ ! -z "$new_C" ]]; then
    run_user="$new"
fi

curl -O http://$master_ip:$web_port/download/omp_salt_agent.tar.gz
if [ $? -ne 0 ]; then
    echo "下载安装包失败"
    exit 1
fi
python_dir=$(ps -ef |grep omp_salt_agent |grep -v grep|awk '{print $8}')
action="install"
if [[ -d "omp_salt_agent" ]] && [[ -z "$python_dir" ]]; then
  echo "agent状态存在异常"
  exit 1
fi
if [[ -n "$python_dir" ]]; then
    action="upgrade"
else
    python_dir="omp_salt_agent/env/bin/python3.8"
fi


if [ "$action" == "upgrade" ]; then
    salt_agent_dir=$(echo "$python_dir" | awk -F"/env" '{print $1}')
    data_dir="omp_salt_agent$(date +%Y%m%d%H%M%S)"
    mkdir $data_dir
    tar -zxf omp_salt_agent.tar.gz -C $data_dir
    \cp -a $data_dir/omp_salt_agent/scripts $salt_agent_dir/scripts
    \cp -a $data_dir/omp_salt_agent/bin $salt_agent_dir/bin
    \cp -a $data_dir/omp_salt_agent/conf/auto_log_clean.json $salt_agent_dir/conf/auto_log_clean.json
    rm -rf $data_dir
    echo "升级完成"
    exit 0
else
    tar -zxf omp_salt_agent.tar.gz
    # 进行初始化操作
    curl -O http://$master_ip:$web_port/download/init_host.py
    ${CURRENT_DIR}/omp_salt_agent/env/bin/python3.8 init_host.py init_valid ${hostname} ${local_ip}

    #替换配置
    sed -i "s/master: 127.0.0.1/master: ${master_ip}/g" omp_salt_agent/conf/minion
    sed -i "s/master_port: 19005/master_port: ${master_port}/g" omp_salt_agent/conf/minion
    sed -i "s/user: root/user: ${run_user}/g" omp_salt_agent/conf/minion
    sed -i "s/id: 127.0.0.1/id: ${local_ip}/g" omp_salt_agent/conf/minion
    sed -i "s#/data/app#${CURRENT_DIR}#g" omp_salt_agent/conf/minion
    sed -i "s/RUNUSER/${run_user}/g" omp_salt_agent/bin/omp_salt_agent

    #创建bash_env.sh
    python_bin=${CURRENT_DIR}/omp_salt_agent/env/bin/
    mkdir -p ${CURRENT_DIR}/omp_packages && echo -e "echo \$PATH |grep omp_salt_agent\nif [ \$? -ne 0 ]; then\n  export PATH=\$PATH:${python_bin}\nfi" >${CURRENT_DIR}/omp_packages/bash_env.sh


    #修改权限
    chown -R $run_user omp_salt_agent
    cd omp_salt_agent && bash bin/omp_salt_agent init
    if [ $? -ne 0 ]; then
        echo "agent初始化失败，请排除问题后重试"
        exit 1
    fi
    #请求创建主机列表
    rq_body="{\"instance_name\": \"$hostname\",\"operate_system\": \"CentOS\",\"data_folder\": \"$CURRENT_DIR\",\"port\": \"22\",\"ip\": \"$local_ip\",\"username\": \"$run_user\",\"password\": \"123123123\",\"use_ntpd\": \"false\",\"plain_text\":\"$plain_text\"}"
    res=$(curl --location --request POST "http://${master_ip}:${web_port}/api/hosts/hosts/" --header "Content-Type: application/json" --data "$rq_body")
    echo $res
fi

