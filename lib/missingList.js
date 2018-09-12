/*
 * huangzongzhe
 * 2018.08
 * 用于处理 [1, 3, 4, 6]这样的区块, 将[2, 5]补齐。
 */

module.exports = {
	getBlockMissingList: getBlockMissingList,
	getMissingList: getMissingList
};

function getMissingList(list) {
	let missingList = [];
	let listTemp = list.slice();

	// if (listTemp[0] !== 0) {
	// 	listTemp.unshift(0);
	// 	missingList.unshift(0);
	// }
	if (listTemp[0] !== 1) {
		listTemp.unshift(1);
		missingList.unshift(1);
	}

	let listLength = listTemp.length;

	for (let i = 1; i < listLength; i++) {
		let b = listTemp[i] - listTemp[i - 1];
		if (b > 1) {
			let listValue = listTemp[i - 1];
			for (let i = 1; i < b; i++) {
				missingList.push(listValue + i);
			}
		}
	}

	return missingList;
}

// async function getBlockMissingList (blockList) {
function getBlockMissingList (blockList) {
	// for test
	// let aelf0 = rds(config.mysql.aelf0);
	// blockList = await aelf0.query('select block_height from blocks_0', []);
	if (!blockList.length) {
		return {
            list: [],
			length: 0
        };
	}

	let list = [];
	// let noTxList = [];
	blockList.map(item => {
		let block_height = item.block_height;
		list.push(block_height);
		// if (item.tx_count === 0) {
         //    noTxList.push(block_height);
		// }
	});

	list.sort(function(a, b) {
		return a - b;
	});

	let missingList = getMissingList(list);

    // missingList = missingList.filter(function (value) {
    //     return noTxList.indexOf(value) === -1;
    // });

	console.log('>>>>>>>', missingList[missingList.length - 1], missingList.length);
	return {
		list: missingList,
		length: missingList.length
	};
}