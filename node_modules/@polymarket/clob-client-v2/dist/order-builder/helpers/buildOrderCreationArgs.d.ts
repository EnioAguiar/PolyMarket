import type { OrderDataV1, OrderDataV2, SignatureTypeV2 } from "../../order-utils/index.js";
import type { RoundConfig, UserOrderV1, UserOrderV2 } from "../../types/index.js";
export declare function buildOrderCreationArgs(signer: string, maker: string, signatureType: SignatureTypeV2, userOrder: UserOrderV1 | UserOrderV2, roundConfig: RoundConfig, version: 1): Promise<OrderDataV1>;
export declare function buildOrderCreationArgs(signer: string, maker: string, signatureType: SignatureTypeV2, userOrder: UserOrderV1 | UserOrderV2, roundConfig: RoundConfig, version?: 2): Promise<OrderDataV2>;
export declare function buildOrderCreationArgs(signer: string, maker: string, signatureType: SignatureTypeV2, userOrder: UserOrderV1 | UserOrderV2, roundConfig: RoundConfig, version: number): Promise<OrderDataV1 | OrderDataV2>;
