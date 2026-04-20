import { parseUnits, zeroAddress } from "viem";
import { COLLATERAL_TOKEN_DECIMALS } from "../../config.js";
import { bytes32Zero } from "../../constants.js";
import { getOrderRawAmounts } from "./getOrderRawAmounts.js";
export async function buildOrderCreationArgs(signer, maker, signatureType, userOrder, roundConfig, version = 2) {
    const { side, rawMakerAmt, rawTakerAmt } = getOrderRawAmounts(userOrder.side, userOrder.size, userOrder.price, roundConfig);
    const makerAmount = parseUnits(rawMakerAmt.toString(), COLLATERAL_TOKEN_DECIMALS).toString();
    const takerAmount = parseUnits(rawTakerAmt.toString(), COLLATERAL_TOKEN_DECIMALS).toString();
    if (version === 1) {
        const v1Order = userOrder;
        return {
            maker,
            taker: v1Order.taker ?? zeroAddress,
            tokenId: userOrder.tokenID,
            makerAmount,
            takerAmount,
            side,
            signer,
            signatureType: signatureType,
            feeRateBps: v1Order.feeRateBps?.toString() ?? "0",
            nonce: v1Order.nonce?.toString() ?? "0",
            expiration: userOrder.expiration !== undefined ? userOrder.expiration.toString() : "0",
        };
    }
    return {
        maker,
        tokenId: userOrder.tokenID,
        makerAmount,
        takerAmount,
        side,
        signer,
        signatureType,
        timestamp: Date.now().toString(),
        metadata: "metadata" in userOrder ? (userOrder.metadata ?? bytes32Zero) : bytes32Zero,
        builder: userOrder.builderCode ?? bytes32Zero,
        expiration: userOrder.expiration !== undefined ? userOrder.expiration.toString() : "0",
    };
}
//# sourceMappingURL=buildOrderCreationArgs.js.map