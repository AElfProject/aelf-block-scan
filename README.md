# AElf Block Scan

## Quicke Start

Ensure dependencies are ready.(node, pm2, mysql & database & tables)

```shell
bash build.sh < type> < npm action>
# Demos
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

Warning: 

- Please pay attention to Mysql connectionLimit. The Default connectionLimit of Mysql is 100.
- Please do not use admin. Use the normal users without SUPER privilege.

Grant Demo
```bash
    CREATE USER 'normal_aelf'@'localhost' IDENTIFIED BY 'password';
    GRANT select, insert, update, delete on aelf_test.* TO 'normal_aelf'@'localhost';
```

Reset max connections Demo
```bash
    mysql> show variables like 'max_connections';
    mysql> set GLOBAL max_connections=650;
    // get the status of current connnections
    mysql> show full processlist;
```

### 3.Start the node Server

```shell
npm install
copy ./config/config.example.js ./config/config.js 
// add your own config

pm2 start index.js --name aelf-block-scan
```

## procfile pandora [TODO]

## Docker [TODO]