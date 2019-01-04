/**
 * @file utils/utils.js
 * @author hzz780
 */

module.exports = {
    hexToString: hexToString
};

function hexToString(hex) {
    var string = '';
    for (var i = 0; i < hex.length; i += 2) {
        string += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return string;
}
