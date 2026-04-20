import { type ClobSigner } from "../signing/signer.js";
import { type EIP712TypedData } from "./model/eip712.js";
import type { OrderHash, OrderSignature } from "./model/order.js";
import type { OrderDataV2, OrderV2, SignedOrderV2 } from "./model/orderDataV2.js";
import { generateOrderSalt } from "./utils.js";
export declare class ExchangeOrderBuilderV2 {
    private readonly contractAddress;
    private readonly chainId;
    private readonly signer;
    private readonly generateSalt;
    constructor(contractAddress: string, chainId: number, signer: ClobSigner, generateSalt?: typeof generateOrderSalt);
    /**
     * build an order object including the signature.
     * @param orderData
     * @returns a SignedOrder object (order + signature)
     */
    buildSignedOrder(orderData: OrderDataV2): Promise<SignedOrderV2>;
    /**
     * Creates an Order object from order data.
     * @param OrderData
     * @returns a Order object (not signed)
     */
    buildOrder({ maker, tokenId, makerAmount, takerAmount, side, signer, signatureType, timestamp, metadata, builder, expiration, }: OrderDataV2): Promise<OrderV2>;
    /**
     * Parses an Order object to EIP712 typed data
     * @param order
     * @returns a EIP712TypedData object
     */
    buildOrderTypedData(order: OrderV2): EIP712TypedData;
    /**
     * Generates order's signature from a EIP712TypedData object + the signer address
     * @param typedData
     * @returns a OrderSignature that is an string
     */
    buildOrderSignature(typedData: EIP712TypedData): Promise<OrderSignature>;
    /**
     * Generates the hash of the order from a EIP712TypedData object.
     * @param orderTypedData
     * @returns a OrderHash that is an string
     */
    buildOrderHash(orderTypedData: EIP712TypedData): OrderHash;
}
