import { type ClobSigner } from "../signing/index.js";
import type { ApiKeyCreds, Chain, L1PolyHeader, L2HeaderArgs, L2PolyHeader } from "../types/index.js";
export declare const createL1Headers: (signer: ClobSigner, chainId: Chain, nonce?: number, timestamp?: number) => Promise<L1PolyHeader>;
export declare const createL2Headers: (signer: ClobSigner, creds: ApiKeyCreds, l2HeaderArgs: L2HeaderArgs, timestamp?: number) => Promise<L2PolyHeader>;
