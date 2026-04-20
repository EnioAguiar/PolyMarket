import type { SignedOrderV1, SignedOrderV2 } from "../../order-utils/index.js";
import { SignatureTypeV2 } from "../../order-utils/index.js";
import { type ClobSigner } from "../../signing/signer.js";
import type { Chain, CreateOrderOptions, UserMarketOrderV1, UserMarketOrderV2 } from "../../types/index.js";
export declare const createMarketOrder: (eoaSigner: ClobSigner, chainId: Chain, signatureType: SignatureTypeV2, funderAddress: string | undefined, userMarketOrder: UserMarketOrderV1 | UserMarketOrderV2, options: CreateOrderOptions, version: number) => Promise<SignedOrderV1 | SignedOrderV2>;
