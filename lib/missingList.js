/*
 * huangzongzhe
 * 2018.08
 * 用于处理 [1, 3, 4, 6]这样的区块, 将[2, 5]补齐。
 */

module.exports = {
	getBlockMissingList: getBlockMissingList,
	// getMissingList: getMissingList
};

// 特地看了一下，下面这段代码在Chrome上跑, 10ms内。
// 2.8GHz Intel Core i7
// 16GB 2133 MHz LPDDR3
// var a = (new Date()).getTime();
//
// var c = [];
// for (let i =1;i< 1000000;i++){
//     let b = 1;
//     if ((i % 9) === 0) {
//         c.push(i);
//     }
// }
//
// console.log((new Date()).getTime() - a);

function getMissingList(list) {
	let missingList = [];
	let listTemp = list.slice();

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

function getBlockMissingList (blockList) {
	if (!blockList.length) {
		return {
            list: [],
			length: 0
        };
	}

	let list = [];
	blockList.map(item => {
		let block_height = item.block_height;
		list.push(block_height);
	});

	list.sort(function(a, b) {
		return a - b;
	});

	let missingList = getMissingList(list);

	console.log('>>>>>>>', missingList[missingList.length - 1], missingList.length);
	return {
		list: missingList,
		length: missingList.length
	};
}