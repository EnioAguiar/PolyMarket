import { createHash } from "node:crypto";
export const roundNormal = (num, decimals) => {
    if (decimalPlaces(num) <= decimals) {
        return num;
    }
    return Math.round((num + Number.EPSILON) * 10 ** decimals) / 10 ** decimals;
};
export const roundDown = (num, decimals) => {
    if (decimalPlaces(num) <= decimals) {
        return num;
    }
    return Math.floor(num * 10 ** decimals) / 10 ** decimals;
};
export const roundUp = (num, decimals) => {
    if (decimalPlaces(num) <= decimals) {
        return num;
    }
    return Math.ceil(num * 10 ** decimals) / 10 ** decimals;
};
export const decimalPlaces = (num) => {
    if (Number.isInteger(num)) {
        return 0;
    }
    const arr = num.toString().split(".");
    if (arr.length <= 1) {
        return 0;
    }
    return arr[1].length;
};
/**
 * Calculates the hash for the given orderbook
 * @param orderbook
 * @returns
 */
export const generateOrderBookSummaryHash = (orderbook) => {
    orderbook.hash = "";
    const hash = createHash("sha1").update(JSON.stringify(orderbook)).digest("hex");
    orderbook.hash = hash;
    return hash;
};
export const isTickSizeSmaller = (a, b) => {
    return parseFloat(a) < parseFloat(b);
};
export const priceValid = (price, tickSize) => {
    return price >= parseFloat(tickSize) && price <= 1 - parseFloat(tickSize);
};
//# sourceMappingURL=utilities.js.map