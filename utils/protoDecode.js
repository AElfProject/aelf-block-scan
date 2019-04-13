/**
 * @file protoDecode.js
 * @author huangzongzhe
 *
 */

const hexToArrayBuffer = require('./hexToArrayBuffer');
const jspb = require('google-protobuf');

exports.getUint64 = function (inputString) {
    const arrayBuffer = Buffer.from(hexToArrayBuffer(inputString));
    const locationBuffer = Buffer.from([8]);
    const bufferArray = [locationBuffer, arrayBuffer];
    const inputBuffer = Buffer.concat(bufferArray);
    const reader = jspb.BinaryReader.alloc(inputBuffer);
    reader.nextField();
    return reader.readUint64();
};
