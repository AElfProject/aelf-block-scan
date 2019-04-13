# AElf Block Scan

A tool to scan the AElf Chain.

- We can insert the data(transactions/blocks/token_contract) of AElf Chain into Databases(only mysql now) through this tool.
- We can collect the TPM(transactions per minutes).`optional`

## Quicke Start

- Ensure dependencies are ready.(nodejs, pm2, mysql)
- Ensure config are ready.(mysql, RPC URL, TPM, etc.)
- If you running your own AElf Chain. Please make sure the token contract is ready.

```shell
# bash, but not sh build.sh
bash build.sh < type> < npm action>
# Demos
bash build.sh dev
bash build.sh dev reinstall
bash build.sh pro
bash build.sh pro reinstall
```

### 1.Install Dependencies

- 1.nodejs
```bash
# official
https://nodejs.org/en/download/

# nvm (if you have installed nvm)
nvm install < your own version >= 8.10 >
```

- 2.mysql or marialdb

- 3.pm2 // Just run 'node index.js' is also ok.
```bash
npm install -g pm2
```

### 2.Initialize Mysql Database

`init_sql.sh` for you information.

Warning:

- Please pay attention to Mysql connectionLimit. The Default connectionLimit of Mysql is 100.
- Please do not use admin. Use the normal users without SUPER privilege.

Grant Demo

```bash
# Use the smallest privilege.
CREATE USER 'normal_aelf'@'localhost' IDENTIFIED BY 'password';
GRANT select, insert, update, delete on aelf_test.* TO 'normal_aelf'@'localhost';
```

Reset max connections Demo

```bash
mysql> show variables like 'max_connections';
mysql> set GLOBAL max_connections=650;
# get the status of current connnections
mysql> show full processlist;
```

### 3.Set your own config

```bash
# for production
cp ./config/config.example.js ./config/config.js
# for dev
cp ./config/config.example.js ./config/config.local.js

# set your own aelf, mysql config at first.

# If you want to collect the TPM.
# In config.js or config.local.js
set initTPSAcquisition=ture.
# If you want to collect the data of resource system
# In config.js or config.local.js
set resourceContractAddress=your resource contract address
```

### 4.Start the node Server

You can use build.sh now.

Or start the server manually.

```bash
# You can see the detail in build.sh
npm install

# use /config/config.local.js
# dev
node index.js
# dev, use pm2
pm2 start index.js --name aelf-block-scan

# use /config/config.js
# pro
NODE_ENV=production node index.js
# pro, use pm2
NODE_ENV=production pm2 start index.js --name aelf-block-scan
```

### 5.Logs

default path

- aelf-block-scan/log
- ~/.pm2/logs/

## FAQ

### 1.Error: Invalid JSON RPC response: undefined

Please check the AElf Node RPC Server.

```javascript
// quick check

node

var Aelf = require('aelf-sdk');
var aelf = new Aelf(new Aelf.providers.HttpProvider("http://localhost:8000/chain"));
aelf.chain.connectChain();
```

### 2.EACCES: permission denied, mkdir '/home/xxxx/github/aelf-block-scan/log'

Please make sure you have the write permission of the dir when you use pm2/node start the project.

### 3.Error: ER_ACCESS_DENIED_ERROR: Access denied for user 'normal_aelf'@'localhost'

Please make sure you have create the user.

Checking your user & password.

Set 127.0.0.1 but not localhost for mysql.host.
(If your want to use localhost, please look at mysql docs.)

### 4.Error: ER_CON_COUNT_ERROR: Too many connections

```mysql
mysql> show full processlist;
```

### 5.Can not pull the newest code when use build.sh.

May you need change the build.sh. Please see the implemention of build.sh.

## procfile pandora [TODO]

## Docker [TODO]