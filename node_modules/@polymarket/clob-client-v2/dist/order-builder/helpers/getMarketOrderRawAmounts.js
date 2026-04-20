import { Side } from "../../types/index.js";
import { decimalPlaces, roundDown, roundUp } from "../../utilities.js";
export const getMarketOrderRawAmounts = (side, amount, price, roundConfig) => {
    // force 2 decimals places
    const rawPrice = roundDown(price, roundConfig.price);
    if (side === Side.BUY) {
        const rawMakerAmt = roundDown(amount, roundConfig.size);
        let rawTakerAmt = rawMakerAmt / rawPrice;
        if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
            rawTakerAmt = roundUp(rawTakerAmt, roundConfig.amount + 4);
            if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
                rawTakerAmt = roundDown(rawTakerAmt, roundConfig.amount);
            }
        }
        return {
            side: Side.BUY,
            rawMakerAmt,
            rawTakerAmt,
        };
    }
    else {
        const rawMakerAmt = roundDown(amount, roundConfig.size);
        let rawTakerAmt = rawMakerAmt * rawPrice;
        if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
            rawTakerAmt = roundUp(rawTakerAmt, roundConfig.amount + 4);
            if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
                rawTakerAmt = roundDown(rawTakerAmt, roundConfig.amount);
            }
        }
        return {
            side: Side.SELL,
            rawMakerAmt,
            rawTakerAmt,
        };
    }
};
//# sourceMappingURL=getMarketOrderRawAmounts.js.map