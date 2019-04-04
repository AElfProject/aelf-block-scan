/**
 * @file redis.js
 * @author huangzongzhe
 */

const redis = require('redis');
const client = redis.createClient();

client.select('4', function (error, result) {
    console.log(error, result);
});

client.hkeys('hash key', function (err, reply) {
    console.log('---- hash key ----');
    console.log(err, reply);
});

// 如果有必要，将最近交易,和区块数据, 最近区块的交易存到redis里面。
// SET
client.lpush(['blocks', '{"height": 4}', 'blocks', 'hzzz123', 'blocks', '11111'], function (err, reply) {
    console.log('---------- lpush blocks -------');
    console.log(err, reply);
});
client.lrange('blocks', 0, 10, function (err, reply) {
    console.log(err, reply);
});
client.ltrim('blocks', 0, 3, function (err, reply) {
    console.log(err, reply);
});

var blocksTemp = ['blocks:bhash', '{"height": 4}', 'blocks:bhash', 'hzzz123', 'blocks:bhash', '11111'];
client.lpush(blocksTemp, function (err, reply) {
    console.log('---------- lpush blocks -------');
    console.log(err, reply);
});

client.get('missingkey', function (err, reply) {
    // reply is null when the key is missing
    console.log(reply);
});

client.get('hash key', function (err, reply) {
    // reply is null when the key is missing
    console.log(reply);
});

