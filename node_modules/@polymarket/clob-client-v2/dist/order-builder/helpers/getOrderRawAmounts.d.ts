import { type RoundConfig, Side } from "../../types/index.js";
export declare const getOrderRawAmounts: (side: Side, size: number, price: number, roundConfig: RoundConfig) => {
    side: Side;
    rawMakerAmt: number;
    rawTakerAmt: number;
};
