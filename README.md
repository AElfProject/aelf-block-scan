# AElf Block Scan

## Quicke Start

Ensure dependencies are ready.(node, pm2, mysql & database & tables)

```shell
bash build.sh dev
bash build.sh dev reinstall
bash build.sh pro
bash build.sh pro reinstall
```

### 1.Install Dependencies

Mysql

PM2 // Just run 'node index.js' is also ok.

### 2.Initialize Mysql Database

init_sql.sh for you info.

Warning: Please pay attention to Mysql connectionLimit. The Default connectionLimit of Mysql is 100.

```shell
	// get the max connections of Mysql.
	mysql> show variables like 'max_connections';
	// set the max connections of Mysql.
	mysql> set GLOBAL max_connections=650
```

### 3.Start the node Server

```shell
npm install
copy ./config/config.example.js ./config/config.js 
// add your own config

pm2 start index.js --name aelf-block-scan
```

## procfile 是pandora自动生成的。暂时弃用pandora。

## Docker [TODO]