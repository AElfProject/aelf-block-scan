/**
 * @file formatHexData.js
 * @author huangzongzhe
 */

module.exports = function formatHexData(input) {
    if (input.indexOf('0x') === 0) {
        return input.replace('0x', '');
    }
    return input;
};
