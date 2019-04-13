/**
 * @file txEvent.js
 * @author huangzongzhe
 * 资源币合约remove了，现在用multiToken, tokenConverter合约来代替。
 * 现在资源交易涉及三个合约，除以上合约还有 feeReceiverContract。
 * 如何解析相关event
 */

// Transaction.Logs
//  [ { Address: '4rkKQpsRFt1nU6weAHuJ6CfQDqo6dxruU3K3wNUFr6ZwZYc',
//     Name: 'Transferred',
//     Indexed:
//      [ 'CiAKHjIkaq1soh2+I4x8ZoJEB1wTsEUDOEjOdf1j5G6pjQ==',
//        'EiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==',
//        'GgNFTEY=' ],
//     NonIndexed: 'IBQ=' },
//   { Address: '4rkKQpsRFt1nU6weAHuJ6CfQDqo6dxruU3K3wNUFr6ZwZYc',
//     Name: 'Transferred',
//     Indexed:
//      [ 'CiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==',
//        'EiAKHjIkaq1soh2+I4x8ZoJEB1wTsEUDOEjOdf1j5G6pjQ==',
//        'GgNSQU0=' ],
//     NonIndexed: 'IMoB' } ]


// [{
//         Address: '4QjhKLWacRXrQYpT7rzf74k5XZFCx8yF3X7FXbzKD4wwEo6',
//         Name: 'TokenBought',
//         Indexed: ['CgNSQU0='],
//         NonIndexed: 'ENgEGNgEIAQ='
//     },
//     {
//         Address: '4rkKQpsRFt1nU6weAHuJ6CfQDqo6dxruU3K3wNUFr6ZwZYc',
//         Name: 'Transferred',
//         Indexed: ['CiAKHjnXp8zz9rQX4UxsPOyaXnaRsQtBM9RwGgJi8gPkGw==',
//             'EiAKHo08D3yDyP0Gn2SK++fkQ/X88sX9fcOuY5hKUWmK8A==',
//             'GgNFTEY='
//         ],
//         NonIndexed: 'IAQ='
//     },
//     {
//         Address: '4rkKQpsRFt1nU6weAHuJ6CfQDqo6dxruU3K3wNUFr6ZwZYc',
//         Name: 'Transferred',
//         Indexed: ['CiAKHjnXp8zz9rQX4UxsPOyaXnaRsQtBM9RwGgJi8gPkGw==',
//             'EiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==',
//             'GgNFTEY='
//         ],
//         NonIndexed: 'INgE'
//     },
//     {
//         Address: '4rkKQpsRFt1nU6weAHuJ6CfQDqo6dxruU3K3wNUFr6ZwZYc',
//         Name: 'Transferred',
//         Indexed: ['CiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==',
//             'EiAKHjnXp8zz9rQX4UxsPOyaXnaRsQtBM9RwGgJi8gPkGw==',
//             'GgNSQU0='
//         ],
//         NonIndexed: 'INgE'
//     }
// ]

/* eslint-disable fecs-camelcase */
const Aelf = require('aelf-sdk');
const Wallet = Aelf.wallet;
// address: 65dDNxzcd35jESiidFXN5JV8Z7pCwaFnepuYQToNefSgqk9
const defaultPrivateKey = 'bdb3b39ef4cd18c2697a920eb6d9e8c3cf1a930570beb37d04fb52400092c42b';

const wallet = Wallet.getWalletByPrivateKey(defaultPrivateKey);
const aelf = new Aelf(new Aelf.providers.HttpProvider('http://192.168.197.56:8101/chain'));

var txId = '76ba943bc6f31208d6c4d78e5185afaf61ddb832b4c3b9f748ba647c0a9794c4';
var txResult = aelf.chain.getTxResult(txId);
var logs = txResult.Logs;

var contentList = logs.map(item => {
    return {
        name: item.Name,
        base64StrList: [item.NonIndexed, ...item.Indexed]
    };
});
// pbjs 的方法
var protobuf = require('@aelfqueen/protobufjs');
// var commonPb = require('./proto/common.proto.json');
var tokenContractPb = require('../proto/token_contract.proto.json');
var tokenConverterContractPb = require('../proto/token_converter_contract.proto.json');
var kernelContractPb = require('../proto/kernel.proto.json');
// var commonRoot = protobuf.Root.fromJSON(commonPb);
var tokenContractRoot = protobuf.Root.fromJSON(tokenContractPb);
var tokenConverterContractRoot = protobuf.Root.fromJSON(tokenConverterContractPb);
var kernelContractRoot = protobuf.Root.fromJSON(kernelContractPb);

var utils = require('../node_modules/aelf-sdk/lib/utils/utils');
// CgNSQU0Q0A8=
// For Event.
var outputListTemp = contentList.map(item => {
    // const dataBuffer = Buffer.from(item.strBase64, 'base64');
    let output;
    if (item.name === 'TokenBought') {
        output = item.base64StrList.map(strBase64 => {
            const dataBuffer = Buffer.from(strBase64, 'base64');
            return tokenConverterContractRoot.TokenBought.decode(dataBuffer);
        });
    }
    if (item.name === 'Transferred') {
        output = item.base64StrList.map(strBase64 => {
            const dataBuffer = Buffer.from(strBase64, 'base64');
            return tokenContractRoot.nested.token.Transferred.decode(dataBuffer);
        });
        // output = tokenContractRoot.nested.token.Transferred.decode(dataBuffer);
        // output.address = utils.encodeAddressRep(output.from.Value.toString('hex'));
    }
    let listTemp = {};
    output.map(item => {
        listTemp = {
            ...listTemp,
            ...item
        };
    });
    return listTemp;
});

"Indexed": [
    "CiAKHjnXp8zz9rQX4UxsPOyaXnaRsQtBM9RwGgJi8gPkGw==",
    "EiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==",
    "GgNFTEY="
],
"NonIndexed": "IN4P"
var textTemp = 'CgNSQU0QoB8=';
var bufferTemp = Buffer.from(textTemp, 'base64');
tokenContractRoot.nested.token.Transferred.decode(bufferTemp);

// 解析 Params
// var paramsTemp = txResult.Transaction.Params;
// CgNSQU0Q2AQ=
// var paramsTemp = 'CAEQwJoMGgQIARABIgnh3lr3TTTTfTQqIAoeUgq8pAX50+TSxUumPyq6HKMHdFaAMSInUpvXT+HU';
var paramsTemp = 'CgNSQU0Q2AQ=';
var bufferTemp = Buffer.from(paramsTemp, 'base64');
var txParamsReader = new protobuf.Reader(bufferTemp);
var txParams = txParamsReader.bytes();
var txString = txParams.toString();
// var address = utils.encodeAddressRep(addressHex);
var data01 = 'CiAKHjIkaq1soh2+I4x8ZoJEB1wTsEUDOEjOdf1j5G6pjQ==EiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==GgNFTEY=IBQ=';
var data02 = 'CiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==EiAKHjIkaq1soh2+I4x8ZoJEB1wTsEUDOEjOdf1j5G6pjQ==GgNSQU0=IMoB';

var data01Buffer = Buffer.from(data01, 'base64');
var data02Buffer = Buffer.from(data02, 'base64');
var output01 = tokenContractRoot.nested.token.Transferred.decode(data01Buffer);
var output02 = tokenContractRoot.nested.token.Transferred.decode(data02Buffer);
var address01 = utils.encodeAddressRep(output01.from.Value.toString('hex'));
var address02 = utils.encodeAddressRep(output02.from.Value.toString('hex'));
console.log(output01, output02, address01, address02);
'32246aad6ca21dbe238c7c668244075c13b045033848ce75fd63e46ea98d'

// 用谷歌的库的方法。
var data = 'CiAKHjIkaq1soh2+I4x8ZoJEB1wTsEUDOEjOdf1j5G6pjQ==EiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==GgNFTEY=IBQ=';

var toData = 'EiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==';
var symbol = 'GgNFTEY=';

function getBuffer(input) {
    let dataHex = Buffer.from(input, 'base64').toString('hex');
    return hexToArrayBuffer(formatHexData(dataHex));
}
var fromDataBuffer = getBuffer(fromData);
var toDataBuffer = getBuffer(toData);
var symbolBuffer = getBuffer(symbol);

var transferredBuffer = Buffer.from(fromDataBuffer, toDataBuffer, symbolBuffer);
var resultTemp = transferred.deserializeBinary(transferredBuffer);
var result = resultTemp.toObject();

// 02
var data = 'CiAKHjIkaq1soh2+I4x8ZoJEB1wTsEUDOEjOdf1j5G6pjQ==EiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==GgNFTEY=IBQ=';
var data = 'CiAKHpbPEbbu8Kjy1/m+ZFOS/lP7SxnzU7zJhBD4epmGVA==EiAKHjIkaq1soh2+I4x8ZoJEB1wTsEUDOEjOdf1j5G6pjQ==GgNSQU0=IMoB';
var dataHex = Buffer.from(data, 'base64').toString('hex');
var bufferTemp = hexToArrayBuffer(formatHexData(dataHex));
var resultTemp = transferred.deserializeBinary(bufferTemp);
var result = resultTemp.toObject();