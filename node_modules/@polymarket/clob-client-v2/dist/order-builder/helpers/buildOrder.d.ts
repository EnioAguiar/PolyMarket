import { type OrderDataV1, type OrderDataV2, type SignedOrderV1, type SignedOrderV2 } from "../../order-utils/index.js";
import type { ClobSigner } from "../../signing/signer.js";
/**
 * Generate and sign a order
 *
 * @param signer
 * @param exchangeAddress ctf exchange contract address
 * @param chainId
 * @param OrderData
 * @returns SignedOrder
 */
export declare const buildOrder: (signer: ClobSigner, exchangeAddress: string, chainId: number, orderData: OrderDataV1 | OrderDataV2, version?: number) => Promise<SignedOrderV1 | SignedOrderV2>;
export declare const buildOrderV1: (signer: ClobSigner, exchangeAddress: string, chainId: number, orderData: OrderDataV1) => Promise<SignedOrderV1>;
export declare const buildOrderV2: (signer: ClobSigner, exchangeAddress: string, chainId: number, orderData: OrderDataV2) => Promise<SignedOrderV2>;
