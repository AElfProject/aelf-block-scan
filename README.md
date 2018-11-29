# AElf Block Scan

## Quicke Start

### 1.Install Dependencies

Mysql

PM2 // Just run 'node index.js' is also ok.

### 2.Initialize Mysql Database

```sql
// FYI
./aelf_test.sql
```

Warning: Please pay attention to Mysql connectionLimit. The Default connectionLimit of Mysql is 100.

```
	// get the max connections of Mysql.
	mysql> show variables like 'max_connections';
	// set the max connections of Mysql.
	mysql> set GLOBAL max_connections=650
```

### 3.Start the node Server
```
npm install
copy ./config/config.example.js ./config/config.js 
// add your own config

pm2 start index.js --name aelf-block-scan
```



## procfile 是pandora自动生成的。暂时弃用pandora。

## Docker

Now, the Repositories of test demo is in [docker/hzz780/aelf-block-scan](https://cloud.docker.com/swarm/hzz780/repository/docker/hzz780/aelf-block-scan/general)

#### Demo

```
docker container run -dit \
--name=aelf-block-scan \
--mount type=bind,source=/Users/huangzongzhe/workspace/hoopox/aelf-web-docker/scan/config.js,target=/app/config.js \
aelf-block-scan:0.0.1 /bin/bash

docker exec a7db727219ae node index.js
```