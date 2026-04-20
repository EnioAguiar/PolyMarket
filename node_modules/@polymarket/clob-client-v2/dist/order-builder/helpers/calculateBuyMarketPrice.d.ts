import { type OrderSummary, OrderType } from "../../types/index.js";
/**
 * calculateBuyMarketPrice calculates the market price to buy a $$ amount
 * @param positions
 * @param amountToMatch worth to buy
 * @returns
 */
export declare const calculateBuyMarketPrice: (positions: OrderSummary[], amountToMatch: number, orderType: OrderType) => number;
