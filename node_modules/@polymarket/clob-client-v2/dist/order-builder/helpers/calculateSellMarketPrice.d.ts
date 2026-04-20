import { type OrderSummary, OrderType } from "../../types/index.js";
/**
 * calculateSellMarketPrice calculates the market price to sell a shares
 * @param positions
 * @param amountToMatch sells to share
 * @returns
 */
export declare const calculateSellMarketPrice: (positions: OrderSummary[], amountToMatch: number, orderType: OrderType) => number;
