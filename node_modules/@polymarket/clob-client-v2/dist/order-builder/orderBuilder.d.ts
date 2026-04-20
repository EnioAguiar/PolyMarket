import { SignatureTypeV2, type SignedOrderV1, type SignedOrderV2 } from "../order-utils/index.js";
import type { ClobSigner } from "../signing/signer.js";
import type { Chain, CreateOrderOptions, UserMarketOrderV1, UserMarketOrderV2, UserOrderV1, UserOrderV2 } from "../types/index.js";
export declare class OrderBuilder {
    readonly signer: ClobSigner;
    readonly chainId: Chain;
    readonly signatureType: SignatureTypeV2;
    readonly funderAddress?: string;
    /**
     * Optional function to dynamically resolve the signer.
     * If provided, this function will be called to obtain a fresh signer instance
     * (e.g., for smart contract wallets or when the signer may change).
     * Should return a Wallet or JsonRpcSigner, or a Promise resolving to one.
     * If not provided, the static `signer` property is used.
     */
    private getSigner?;
    constructor(signer: ClobSigner, chainId: Chain, signatureType?: SignatureTypeV2, funderAddress?: string, getSigner?: () => Promise<ClobSigner> | ClobSigner);
    /**
     * Generate and sign a order
     */
    buildOrder(userOrder: UserOrderV1 | UserOrderV2, options: CreateOrderOptions, version: number): Promise<SignedOrderV1 | SignedOrderV2>;
    /**
     * Generate and sign a market order
     */
    buildMarketOrder(userMarketOrder: UserMarketOrderV1 | UserMarketOrderV2, options: CreateOrderOptions, version: number): Promise<SignedOrderV1 | SignedOrderV2>;
    /** Unified getter: use fresh signer if available */
    private resolveSigner;
}
