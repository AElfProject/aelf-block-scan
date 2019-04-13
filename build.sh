#!/bin/bash
# https://www.leiphone.com/news/201703/i49ztcRDDymM7Id5.html // Bash编程细节
# 启动scan程序后，如果完成扫链，会调用initTpsAcquisition.js启动采集程序。

#当变量a为null或为空字符串时则var=b
start_mode=${1:-'production'}
node_modules_action=${2:-'default'}
echo ${node_modules_action} ${start_mode}

git pull && echo 'git pull'

if [ ${node_modules_action} = 'reinstall' ]
then
    echo 'npm install'
    npm install && echo 'install done'
    sleep 3
    npm install && echo 'install check done'
    sleep 3
fi

app_names=(aelf-block-scan aelf-block-scan-tps)

for item in ${app_names[@]}
do
    echo 'pm2 stop & delete ' ${item}
    echo pm2 stop ${item}
    pm2 stop ${item} && pm2 delete ${item}
done

if [ ${start_mode} = 'dev' ]
then
    pm2 start index.js --name aelf-block-scan
    echo 'pm2 start index.js --name aelf-block-scan'
else
    NODE_ENV=production pm2 start index.js --name aelf-block-scan
    echo 'NODE_ENV=production pm2 start index.js --name aelf-block-scan'
fi