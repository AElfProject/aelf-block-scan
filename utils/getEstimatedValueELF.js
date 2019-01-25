/**
 * @file getPredictedValue
 * @author zhouminghui
 * 获取资源所等值的ELF数量
 * TODO:未计算手续费
 */

const calculateCrossConnectorReturn = require('./calculateCrossConnectorReturn');
const hexCharCodeToStr = require('./hexCharCodeToStr');

module.exports = function getEstimatedValueELF(resource, type, pidRes) {
    const converter = JSON.parse(hexCharCodeToStr(resource.GetConverter(type).return));
    const elfPayout = calculateCrossConnectorReturn(
        converter.ResBalance, converter.ResWeight,
        converter.ElfBalance, converter.ElfWeight,
        pidRes
    );
    return elfPayout;
};
