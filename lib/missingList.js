/*
 * huangzongzhe
 * 2018.08
 */

module.exports = {
	getBlockMissingList: getBlockMissingList,
	getMissingList: getMissingList
};

function getMissingList(list) {
	let missingList = [];
	let listTemp = list.slice();
	if (listTemp[0] !== 0) {
		listTemp.unshift(0);
		missingList.unshift(0);
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

	let list = [];
	blockList.map(item => {
		list.push(item.block_height);
	});

	list.sort(function(a, b) {
		return a - b;
	})

	let missingList = getMissingList(list);

	console.log('>>>>>>>', missingList[missingList.length - 1], missingList.length);
	return {
		list: missingList,
		length: missingList.length
	};
}

// getBlockMissingList().then(result => {
// 	console.log('MissingList: ', result);
// });