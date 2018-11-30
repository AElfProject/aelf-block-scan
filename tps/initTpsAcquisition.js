const process = require('child_process');
const cliList = require('../config/configInit').tpsCliList;

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



