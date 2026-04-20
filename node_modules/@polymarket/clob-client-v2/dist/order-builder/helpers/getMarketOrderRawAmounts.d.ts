import { type RoundConfig, Side } from "../../types/index.js";
export declare const getMarketOrderRawAmounts: (side: Side, amount: number, price: number, roundConfig: RoundConfig) => {
    side: Side;
    rawMakerAmt: number;
    rawTakerAmt: number;
};
