export var SignatureTypeV1;
(function (SignatureTypeV1) {
    /**
     * ECDSA EIP712 signatures signed by EOAs
     */
    SignatureTypeV1[SignatureTypeV1["EOA"] = 0] = "EOA";
    /**
     * EIP712 signatures signed by EOAs that own Polymarket Proxy wallets
     */
    SignatureTypeV1[SignatureTypeV1["POLY_PROXY"] = 1] = "POLY_PROXY";
    /**
     * EIP712 signatures signed by EOAs that own Polymarket Gnosis safes
     */
    SignatureTypeV1[SignatureTypeV1["POLY_GNOSIS_SAFE"] = 2] = "POLY_GNOSIS_SAFE";
})(SignatureTypeV1 || (SignatureTypeV1 = {}));
//# sourceMappingURL=signatureTypeV1.js.map