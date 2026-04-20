export var SignatureTypeV2;
(function (SignatureTypeV2) {
    /**
     * ECDSA EIP712 signatures signed by EOAs
     */
    SignatureTypeV2[SignatureTypeV2["EOA"] = 0] = "EOA";
    /**
     * EIP712 signatures signed by EOAs that own Polymarket Proxy wallets
     */
    SignatureTypeV2[SignatureTypeV2["POLY_PROXY"] = 1] = "POLY_PROXY";
    /**
     * EIP712 signatures signed by EOAs that own Polymarket Gnosis safes
     */
    SignatureTypeV2[SignatureTypeV2["POLY_GNOSIS_SAFE"] = 2] = "POLY_GNOSIS_SAFE";
    /**
     * EIP1271 signatures signed by smart contracts. To be used by smart contract wallets or vaults
     */
    SignatureTypeV2[SignatureTypeV2["POLY_1271"] = 3] = "POLY_1271";
})(SignatureTypeV2 || (SignatureTypeV2 = {}));
//# sourceMappingURL=signatureTypeV2.js.map