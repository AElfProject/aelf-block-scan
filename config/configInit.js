// NODE_ENV=production node index.js
const envIsProduction = (process.env.NODE_ENV === 'production');
console.log('envIsProduction: ', envIsProduction);

const config = envIsProduction ? require('./config.js') : require('./config.local.js');

function getTpsCliList () {
    const prefixEnv = envIsProduction ? 'NODE_ENV=production ' : '';
    const startCli = prefixEnv + 'pm2 start ./tps/tps.js --name aelf-block-scan-tps';
    // const stopCli = 'pm2 stop aelf-block-scan-tps';
    // const deleteCli = 'pm2 delete aelf-block-scan-tps';
    // return [stopCli, deleteCli, startCli];
    // return [stopCli, startCli];
    return [startCli];
}

// if (envIsProduction) {
//     console.log = function () {};
// }

module.exports = {
    config: config,
    tpsCliList: getTpsCliList()
};