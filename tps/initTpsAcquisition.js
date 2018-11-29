const process = require('child_process');

const startCli = 'pm2 start ./tps/tps.js --name aelf-block-scan-tps';
const stopCli = 'pm2 stop aelf-block-scan-tps';
const deleteCli = 'pm2 delete aelf-block-scan-tps';

const cliList = [stopCli, deleteCli, startCli];

module.exports = function () {
    cliList.map(cli => {
        process.exec(cli, {encoding: 'utf8'}, function (err, stdout, stderr){
            if (err) {
                console.log(err);
                return;
            }
            console.log('stdout:' + stdout);
            console.log('stderr:' + stderr);
        });
    });
};



