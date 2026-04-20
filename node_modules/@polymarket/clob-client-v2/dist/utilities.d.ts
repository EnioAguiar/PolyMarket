import type { OrderBookSummary, TickSize } from "./types/index.js";
export declare const roundNormal: (num: number, decimals: number) => number;
export declare const roundDown: (num: number, decimals: number) => number;
export declare const roundUp: (num: number, decimals: number) => number;
export declare const decimalPlaces: (num: number) => number;
/**
 * Calculates the hash for the given orderbook
 * @param orderbook
 * @returns
 */
export declare const generateOrderBookSummaryHash: (orderbook: OrderBookSummary) => string;
export declare const isTickSizeSmaller: (a: TickSize, b: TickSize) => boolean;
export declare const priceValid: (price: number, tickSize: TickSize) => boolean;
