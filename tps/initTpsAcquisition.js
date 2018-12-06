/**
 * @file initTpsAcquisition
 * @author huangzongzhe
 */
const process = require('child_process');
const startCmdList = require('../config/configInit').getTpsStartCommandList();
const stopCmdList = require('../config/configInit').getTpsStopCommandList();

function executeCommand(commandList) {
    commandList.map(cli => {
        process.exec(cli, {encoding: 'utf8'}, function (err, stdout, stderr){
            if (err) {
                console.log('Execute tpsCommand failed: ', err);
                return;
            }
            console.log('stdout:' + stdout);
            console.log('stderr:' + stderr);
        });
    });
}

function startTpsAcquisition() {
    process.exec('pm2 show aelf-block-scan-tps', {encoding: 'utf8'}, err => {
        if (err) {
            executeCommand(startCmdList);
        }
    });
}
function stopTpsAcquisition() {
    executeCommand(stopCmdList);
}

module.exports = {
    startTpsAcquisition,
    stopTpsAcquisition
};
