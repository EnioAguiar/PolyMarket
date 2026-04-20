import type { Chain } from "../types/index.js";
import { type ClobSigner } from "./signer.js";
/**
 * Builds the canonical Polymarket CLOB EIP712 signature
 * @param signer
 * @param ts
 * @returns string
 */
export declare const buildClobEip712Signature: (signer: ClobSigner, chainId: Chain, timestamp: number, nonce: number) => Promise<string>;
