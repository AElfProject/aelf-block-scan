/**
 * @file removeRedundantData.js
 * @author huangzongzhe
 * @description
 * 
 * 1.当前
 * 一个比较low的操作。
 * 删除时，暂停scan程序的循环事件，执行删除命令。
 * 删除完成后，再次执行scan程序。
 * 2.其它建议
 * 试试TiDB?
 * 分区分表，使用drop语句抛掉冗余数据。
 */

const {
    queryPromise
} = require('../lib/mysql/queryPromise');

// let removeInstance;
module.exports = class BlockUnconfirmed {

    constructor(options) {
        const {
            removeUnconfirmedDataInterval,
            unConfirmedTables
        } = options;
        this.removeUnconfirmedDataInterval = removeUnconfirmedDataInterval || 1000;
        this.unConfirmedTables = unConfirmedTables;
        this.removeInstance;
    }

    // 并不要求一定就是这个时间删除
    removeRedundantData(connection, blockHeight, timer) {
        this.blockHeight = blockHeight;
        if (!this.removeInstance) {
            this.removeInstance = setInterval(() => {
                clearInterval(this.removeInstance);
                this.removeInstance = null;
                timer.holdTimer();
                const queryPromises = this.unConfirmedTables.map(item => {
                    const table = item + '_unconfirmed';
                    const sql = `DELETE from ${table} where block_height<${this.blockHeight}`;
                    return queryPromise(connection, sql);
                });
                Promise.all(queryPromises).then(result => {
                    console.log('remove redundant data >>>: ', result.length);

                    timer.restartTimer();
                    this.removeRedundantData(connection, this.blockHeight, timer);
                });
            }, this.removeUnconfirmedDataInterval);
        }
    }
};
