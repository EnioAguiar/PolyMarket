import { type ClobSigner } from "../signing/signer.js";
import { type EIP712TypedData } from "./model/eip712.js";
import type { OrderHash, OrderSignature } from "./model/order.js";
import type { OrderDataV1, OrderV1, SignedOrderV1 } from "./model/orderDataV1.js";
import { generateOrderSalt } from "./utils.js";
export declare class ExchangeOrderBuilderV1 {
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
    buildSignedOrder(orderData: OrderDataV1): Promise<SignedOrderV1>;
    /**
     * Creates an Order object from order data.
     * @param OrderData
     * @returns a Order object (not signed)
     */
    buildOrder({ maker, taker, tokenId, makerAmount, takerAmount, side, feeRateBps, nonce, signer, expiration, signatureType, }: OrderDataV1): Promise<OrderV1>;
    /**
     * Parses an Order object to EIP712 typed data
     * @param order
     * @returns a EIP712TypedData object
     */
    buildOrderTypedData(order: OrderV1): EIP712TypedData;
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
