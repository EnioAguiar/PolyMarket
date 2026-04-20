import type { OrderDataV1, OrderDataV2, SignatureTypeV2 } from "../../order-utils/index.js";
import type { RoundConfig, UserMarketOrderV1, UserMarketOrderV2 } from "../../types/index.js";
export declare function buildMarketOrderCreationArgs(signer: string, maker: string, signatureType: SignatureTypeV2, userMarketOrder: UserMarketOrderV1 | UserMarketOrderV2, roundConfig: RoundConfig, version: 1): Promise<OrderDataV1>;
export declare function buildMarketOrderCreationArgs(signer: string, maker: string, signatureType: SignatureTypeV2, userMarketOrder: UserMarketOrderV1 | UserMarketOrderV2, roundConfig: RoundConfig, version?: 2): Promise<OrderDataV2>;
export declare function buildMarketOrderCreationArgs(signer: string, maker: string, signatureType: SignatureTypeV2, userMarketOrder: UserMarketOrderV1 | UserMarketOrderV2, roundConfig: RoundConfig, version: number): Promise<OrderDataV1 | OrderDataV2>;
