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
// pbjs 的方法
var protobuf = require('@aelfqueen/protobufjs');
// var commonPb = require('./proto/common.proto.json');
var tokenContractPb = require('./proto/token_contract.proto.json');
// var commonRoot = protobuf.Root.fromJSON(commonPb);
var tokenContractRoot = protobuf.Root.fromJSON(tokenContractPb);
// var data = 'ls8Rtu7wqPLX+b5kU5L+U/tLGfNTvMmEEPh6mYZU';
// var dataBuffer = Buffer.from(data, 'base64'); // .toString('hex');
// commonRoot.Address.decode(Buffer.from(JSON.stringify({
//     Value: 'ls8Rtu7wqPLX+b5kU5L+U/tLGfNTvMmEEPh6mYZU'
// })));

// var addressHex = Buffer.from('ls8Rtu7wqPLX+b5kU5L+U/tLGfNTvMmEEPh6mYZU', 'base64').toString('hex');
// var addressHex = Buffer.from('CiAKHjIkaq1soh2+I4x8ZoJEB1wTsEUDOEjOdf1j5G6pjQ==', 'base64').toString('hex');
// var addressHex = Buffer.from('MiRqrWyiHb4jjHxmgkQHXBOwRQM4SM51/WPkbqmN', 'base64').toString('hex');
// var utils = require('./node_modules/aelf-sdk/lib/utils/utils');
// var address = utils.encodeAddressRep(addressHex);
// address

var utils = require('./node_modules/aelf-sdk/lib/utils/utils');
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