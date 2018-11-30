# 启动scan程序后，如果完成扫链，会调用initTpsAcquisition.js启动采集程序。

if [ $1 == "dev" ]
then
    pm2 start index.js --name aelf-block-scan
    echo "pm2 start index.js --name aelf-block-scan";
else
    NODE_ENV=production pm2 start index.js --name aelf-block-scan
    echo "NODE_ENV=production pm2 start index.js --name aelf-block-scan";
fi