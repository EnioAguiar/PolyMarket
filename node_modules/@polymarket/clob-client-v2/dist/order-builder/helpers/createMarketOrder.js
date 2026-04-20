import { getContractConfig } from "../../config.js";
import { SignatureTypeV2 } from "../../order-utils/index.js";
import { getSignerAddress } from "../../signing/signer.js";
import { buildMarketOrderCreationArgs } from "./buildMarketOrderCreationArgs.js";
import { buildOrder } from "./buildOrder.js";
import { ROUNDING_CONFIG } from "./roundingConfig.js";
export const createMarketOrder = async (eoaSigner, chainId, signatureType, funderAddress, userMarketOrder, options, version) => {
    const eoaSignerAddress = await getSignerAddress(eoaSigner);
    // If funder address is not given, use the signer address
    const maker = funderAddress === undefined ? eoaSignerAddress : funderAddress;
    const contractConfig = getContractConfig(chainId);
    const orderData = await buildMarketOrderCreationArgs(eoaSignerAddress, maker, signatureType, userMarketOrder, ROUNDING_CONFIG[options.tickSize], version);
    let exchangeContract;
    switch (version) {
        case 1:
            if (signatureType === SignatureTypeV2.POLY_1271) {
                throw new Error(`signature type POLY_1271 is not supported for v1 orders`);
            }
            exchangeContract = options.negRisk
                ? contractConfig.negRiskExchange
                : contractConfig.exchange;
            break;
        case 2:
            exchangeContract = options.negRisk
                ? contractConfig.negRiskExchangeV2
                : contractConfig.exchangeV2;
            break;
        default:
            throw new Error(`unsupported order version ${version}`);
    }
    return buildOrder(eoaSigner, exchangeContract, chainId, orderData, version);
};
//# sourceMappingURL=createMarketOrder.js.map