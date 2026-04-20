import type { SignatureTypeV2, SignedOrderV2 } from "../order-utils/index.js";
import type { OrderType, Side } from "./clob.js";
export declare function orderToJsonV2<T extends OrderType>(order: SignedOrderV2, owner: string, orderType: T, postOnly?: boolean, deferExec?: boolean): NewOrderV2<T>;
export interface PostOrdersV2Args {
    order: SignedOrderV2;
    orderType: OrderType;
}
export interface NewOrderV2<T extends OrderType> {
    readonly order: {
        readonly salt: number;
        readonly maker: string;
        readonly signer: string;
        readonly taker: string;
        readonly tokenId: string;
        readonly makerAmount: string;
        readonly takerAmount: string;
        readonly side: string;
        readonly signatureType: SignatureTypeV2;
        readonly timestamp: string;
        readonly expiration: string;
        readonly metadata: string;
        readonly builder: string;
        readonly signature: string;
    };
    readonly owner: string;
    readonly orderType: T;
    readonly deferExec: boolean;
    readonly postOnly: boolean;
}
export interface UserOrderV2 {
    /**
     * TokenID of the Conditional token asset being traded
     */
    tokenID: string;
    /**
     * Price used to create the order
     */
    price: number;
    /**
     * Size in terms of the ConditionalToken
     */
    size: number;
    /**
     * Side of the order
     */
    side: Side;
    /**
     * Metadata (bytes32)
     */
    metadata?: string;
    /**
     * Builder code (bytes32)
     */
    builderCode?: string;
    /**
     * Expiration timestamp (unix seconds). Defaults to 0 (no expiration).
     */
    expiration?: number;
}
export interface UserMarketOrderV2 {
    /**
     * TokenID of the Conditional token asset being traded
     */
    tokenID: string;
    /**
     * Price used to create the order
     * If it is not present the market price will be used.
     */
    price?: number;
    /**
     * BUY orders: $$$ Amount to buy
     * SELL orders: Shares to sell
     */
    amount: number;
    /**
     * Side of the order
     */
    side: Side;
    /**
     * Specifies the type of order execution:
     * - FOK (Fill or Kill): The order must be filled entirely or not at all.
     * - FAK (Fill and Kill): The order can be partially filled, and any unfilled portion is canceled.
     */
    orderType?: OrderType.FOK | OrderType.FAK;
    /**
     * User's USDC balance. If provided and sufficient to cover amount + fees, the order
     * amount is used as-is. Otherwise fees are deducted from the amount.
     * If this field is left empty, the default flow is to use the order amount as-is
     */
    userUSDCBalance?: number;
    /**
     * Metadata (bytes32)
     */
    metadata?: string;
    /**
     * Builder code (bytes32)
     */
    builderCode?: string;
}
