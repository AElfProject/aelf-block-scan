# TPS

## TPS 开发

每N分钟(默认5分钟)采集一次TPS  所有区块，总交易数 / 块数  [每块统计没有意义，可以直接从区块浏览器的block看数据]

id, start, end, txs(per N minutes), block, type(参数N), tps, tpm。

## 依赖

1.默认已经完成扫链操作。

2.默认使用PM2。