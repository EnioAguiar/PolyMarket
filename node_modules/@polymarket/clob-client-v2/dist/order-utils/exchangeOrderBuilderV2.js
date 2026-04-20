import { hashTypedData } from "viem";
import { bytes32Zero } from "../constants.js";
import { getSignerAddress, signTypedDataWithSigner } from "../signing/signer.js";
import { CTF_EXCHANGE_V2_DOMAIN_NAME, CTF_EXCHANGE_V2_DOMAIN_VERSION, CTF_EXCHANGE_V2_ORDER_STRUCT, } from "./model/ctfExchangeV2TypedData.js";
import { EIP712_DOMAIN } from "./model/eip712.js";
import { SignatureTypeV2 } from "./model/signatureTypeV2.js";
import { generateOrderSalt } from "./utils.js";
export class ExchangeOrderBuilderV2 {
    contractAddress;
    chainId;
    signer;
    generateSalt;
    constructor(contractAddress, chainId, signer, generateSalt = generateOrderSalt) {
        this.contractAddress = contractAddress;
        this.chainId = chainId;
        this.signer = signer;
        this.generateSalt = generateSalt;
    }
    /**
     * build an order object including the signature.
     * @param orderData
     * @returns a SignedOrder object (order + signature)
     */
    async buildSignedOrder(orderData) {
        const order = await this.buildOrder(orderData);
        const orderTypedData = this.buildOrderTypedData(order);
        const orderSignature = await this.buildOrderSignature(orderTypedData);
        return {
            ...order,
            signature: orderSignature,
        };
    }
    /**
     * Creates an Order object from order data.
     * @param OrderData
     * @returns a Order object (not signed)
     */
    async buildOrder({ maker, tokenId, makerAmount, takerAmount, side, signer, signatureType, timestamp, metadata, builder, expiration, }) {
        if (!signer) {
            signer = maker;
        }
        const signerAddress = await getSignerAddress(this.signer);
        if (signer !== signerAddress) {
            throw new Error("signer does not match");
        }
        return {
            salt: this.generateSalt(),
            maker,
            signer,
            tokenId,
            makerAmount,
            takerAmount,
            side,
            signatureType: signatureType ?? SignatureTypeV2.EOA,
            metadata: metadata ?? bytes32Zero,
            builder: builder ?? bytes32Zero,
            timestamp: timestamp ?? Date.now().toString(),
            expiration: expiration ?? "0",
        };
    }
    /**
     * Parses an Order object to EIP712 typed data
     * @param order
     * @returns a EIP712TypedData object
     */
    buildOrderTypedData(order) {
        return {
            primaryType: "Order",
            types: {
                EIP712Domain: EIP712_DOMAIN,
                Order: CTF_EXCHANGE_V2_ORDER_STRUCT,
            },
            domain: {
                name: CTF_EXCHANGE_V2_DOMAIN_NAME,
                version: CTF_EXCHANGE_V2_DOMAIN_VERSION,
                chainId: this.chainId,
                verifyingContract: this.contractAddress,
            },
            message: {
                salt: order.salt,
                maker: order.maker,
                signer: order.signer,
                tokenId: order.tokenId,
                makerAmount: order.makerAmount,
                takerAmount: order.takerAmount,
                timestamp: order.timestamp,
                side: order.side === "BUY" ? 0 : 1,
                signatureType: order.signatureType,
                metadata: order.metadata,
                builder: order.builder,
            },
        };
    }
    /**
     * Generates order's signature from a EIP712TypedData object + the signer address
     * @param typedData
     * @returns a OrderSignature that is an string
     */
    buildOrderSignature(typedData) {
        delete typedData.types.EIP712Domain;
        return signTypedDataWithSigner({
            signer: this.signer,
            domain: typedData.domain,
            types: typedData.types,
            value: typedData.message,
            primaryType: typedData.primaryType,
        });
    }
    /**
     * Generates the hash of the order from a EIP712TypedData object.
     * @param orderTypedData
     * @returns a OrderHash that is an string
     */
    buildOrderHash(orderTypedData) {
        const digest = hashTypedData(orderTypedData);
        return digest;
    }
}
//# sourceMappingURL=exchangeOrderBuilderV2.js.map