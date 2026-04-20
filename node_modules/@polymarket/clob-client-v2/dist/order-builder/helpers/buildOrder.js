import { ExchangeOrderBuilderV1, ExchangeOrderBuilderV2, } from "../../order-utils/index.js";
/**
 * Generate and sign a order
 *
 * @param signer
 * @param exchangeAddress ctf exchange contract address
 * @param chainId
 * @param OrderData
 * @returns SignedOrder
 */
export const buildOrder = async (signer, exchangeAddress, chainId, orderData, version = 2) => {
    switch (version) {
        case 1:
            return buildOrderV1(signer, exchangeAddress, chainId, orderData);
        case 2:
            return buildOrderV2(signer, exchangeAddress, chainId, orderData);
        default:
            throw new Error(`unsupported order version ${version}`);
    }
};
export const buildOrderV1 = async (signer, exchangeAddress, chainId, orderData) => {
    const ctfExchangeOrderBuilder = new ExchangeOrderBuilderV1(exchangeAddress, chainId, signer);
    return ctfExchangeOrderBuilder.buildSignedOrder(orderData);
};
export const buildOrderV2 = async (signer, exchangeAddress, chainId, orderData) => {
    const ctfExchangeOrderBuilder = new ExchangeOrderBuilderV2(exchangeAddress, chainId, signer);
    return ctfExchangeOrderBuilder.buildSignedOrder(orderData);
};
//# sourceMappingURL=buildOrder.js.map