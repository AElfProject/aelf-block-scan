/**
 * @file configInit
 * @author huangzongzhe
 */
// NODE_ENV=production node index.js
const envIsProduction = (process.env.NODE_ENV === 'production');
console.log('envIsProduction: ', envIsProduction);

const config = envIsProduction ? require('./config.js') : require('./config.local.js');

function getTpsStartCommandList() {
    const prefixEnv = envIsProduction ? 'NODE_ENV=production ' : '';
    const startCommand = prefixEnv + 'pm2 start ./tps/tps.js --name aelf-block-scan-tps';
    return [startCommand];
}

function getTpsStopCommandList() {
    const stopCommand = 'pm2 stop aelf-block-scan-tps';
    return [stopCommand];
}

function getTpsRestartCommandList() {
    const restartCommand = 'pm2 restart aelf-block-scan-tps';
    return [restartCommand];
}

// if (envIsProduction) {
//     console.log = function () {};
// }

module.exports = {
    config,
    getTpsStartCommandList,
    getTpsStopCommandList,
    getTpsRestartCommandList
};