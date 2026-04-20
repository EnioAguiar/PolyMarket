export * from "./exchangeOrderBuilderV1.js";
export * from "./exchangeOrderBuilderV2.js";
export declare const ABIs: {
    exchangeV1: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_collateral";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "_ctf";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "_proxyFactory";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "_safeFactory";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "constructor";
    }, {
        readonly inputs: readonly [];
        readonly name: "AlreadyRegistered";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "FeeTooHigh";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "InvalidComplement";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "InvalidNonce";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "InvalidSignature";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "InvalidTokenId";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "MakingGtRemaining";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "MismatchedTokenIds";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "NotAdmin";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "NotCrossing";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "NotOperator";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "NotOwner";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "NotTaker";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "OrderExpired";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "OrderFilledOrCancelled";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "Paused";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "TooLittleTokensReceived";
        readonly type: "error";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "receiver";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "tokenId";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "amount";
            readonly type: "uint256";
        }];
        readonly name: "FeeCharged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newAdminAddress";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "admin";
            readonly type: "address";
        }];
        readonly name: "NewAdmin";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newOperatorAddress";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "admin";
            readonly type: "address";
        }];
        readonly name: "NewOperator";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "orderHash";
            readonly type: "bytes32";
        }];
        readonly name: "OrderCancelled";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "orderHash";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "maker";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "taker";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "makerAssetId";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "takerAssetId";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "makerAmountFilled";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "takerAmountFilled";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "fee";
            readonly type: "uint256";
        }];
        readonly name: "OrderFilled";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "takerOrderHash";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "takerOrderMaker";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "makerAssetId";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "takerAssetId";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "makerAmountFilled";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "takerAmountFilled";
            readonly type: "uint256";
        }];
        readonly name: "OrdersMatched";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "oldProxyFactory";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newProxyFactory";
            readonly type: "address";
        }];
        readonly name: "ProxyFactoryUpdated";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "removedAdmin";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "admin";
            readonly type: "address";
        }];
        readonly name: "RemovedAdmin";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "removedOperator";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "admin";
            readonly type: "address";
        }];
        readonly name: "RemovedOperator";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "oldSafeFactory";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newSafeFactory";
            readonly type: "address";
        }];
        readonly name: "SafeFactoryUpdated";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "uint256";
            readonly name: "token0";
            readonly type: "uint256";
        }, {
            readonly indexed: true;
            readonly internalType: "uint256";
            readonly name: "token1";
            readonly type: "uint256";
        }, {
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "conditionId";
            readonly type: "bytes32";
        }];
        readonly name: "TokenRegistered";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "pauser";
            readonly type: "address";
        }];
        readonly name: "TradingPaused";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "pauser";
            readonly type: "address";
        }];
        readonly name: "TradingUnpaused";
        readonly type: "event";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "admin_";
            readonly type: "address";
        }];
        readonly name: "addAdmin";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "operator_";
            readonly type: "address";
        }];
        readonly name: "addOperator";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly name: "admins";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "uint256";
                readonly name: "salt";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "maker";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "signer";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "taker";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "tokenId";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "makerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "takerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "expiration";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "nonce";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "feeRateBps";
                readonly type: "uint256";
            }, {
                readonly internalType: "enum Side";
                readonly name: "side";
                readonly type: "uint8";
            }, {
                readonly internalType: "enum SignatureType";
                readonly name: "signatureType";
                readonly type: "uint8";
            }, {
                readonly internalType: "bytes";
                readonly name: "signature";
                readonly type: "bytes";
            }];
            readonly internalType: "struct Order";
            readonly name: "order";
            readonly type: "tuple";
        }];
        readonly name: "cancelOrder";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "uint256";
                readonly name: "salt";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "maker";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "signer";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "taker";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "tokenId";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "makerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "takerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "expiration";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "nonce";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "feeRateBps";
                readonly type: "uint256";
            }, {
                readonly internalType: "enum Side";
                readonly name: "side";
                readonly type: "uint8";
            }, {
                readonly internalType: "enum SignatureType";
                readonly name: "signatureType";
                readonly type: "uint8";
            }, {
                readonly internalType: "bytes";
                readonly name: "signature";
                readonly type: "bytes";
            }];
            readonly internalType: "struct Order[]";
            readonly name: "orders";
            readonly type: "tuple[]";
        }];
        readonly name: "cancelOrders";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "domainSeparator";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "uint256";
                readonly name: "salt";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "maker";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "signer";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "taker";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "tokenId";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "makerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "takerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "expiration";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "nonce";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "feeRateBps";
                readonly type: "uint256";
            }, {
                readonly internalType: "enum Side";
                readonly name: "side";
                readonly type: "uint8";
            }, {
                readonly internalType: "enum SignatureType";
                readonly name: "signatureType";
                readonly type: "uint8";
            }, {
                readonly internalType: "bytes";
                readonly name: "signature";
                readonly type: "bytes";
            }];
            readonly internalType: "struct Order";
            readonly name: "order";
            readonly type: "tuple";
        }, {
            readonly internalType: "uint256";
            readonly name: "fillAmount";
            readonly type: "uint256";
        }];
        readonly name: "fillOrder";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "uint256";
                readonly name: "salt";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "maker";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "signer";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "taker";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "tokenId";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "makerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "takerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "expiration";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "nonce";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "feeRateBps";
                readonly type: "uint256";
            }, {
                readonly internalType: "enum Side";
                readonly name: "side";
                readonly type: "uint8";
            }, {
                readonly internalType: "enum SignatureType";
                readonly name: "signatureType";
                readonly type: "uint8";
            }, {
                readonly internalType: "bytes";
                readonly name: "signature";
                readonly type: "bytes";
            }];
            readonly internalType: "struct Order[]";
            readonly name: "orders";
            readonly type: "tuple[]";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "fillAmounts";
            readonly type: "uint256[]";
        }];
        readonly name: "fillOrders";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getCollateral";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "token";
            readonly type: "uint256";
        }];
        readonly name: "getComplement";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "token";
            readonly type: "uint256";
        }];
        readonly name: "getConditionId";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getCtf";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getMaxFeeRate";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "orderHash";
            readonly type: "bytes32";
        }];
        readonly name: "getOrderStatus";
        readonly outputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "bool";
                readonly name: "isFilledOrCancelled";
                readonly type: "bool";
            }, {
                readonly internalType: "uint256";
                readonly name: "remaining";
                readonly type: "uint256";
            }];
            readonly internalType: "struct OrderStatus";
            readonly name: "";
            readonly type: "tuple";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getPolyProxyFactoryImplementation";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }];
        readonly name: "getPolyProxyWalletAddress";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getProxyFactory";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_addr";
            readonly type: "address";
        }];
        readonly name: "getSafeAddress";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getSafeFactory";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getSafeFactoryImplementation";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "uint256";
                readonly name: "salt";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "maker";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "signer";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "taker";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "tokenId";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "makerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "takerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "expiration";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "nonce";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "feeRateBps";
                readonly type: "uint256";
            }, {
                readonly internalType: "enum Side";
                readonly name: "side";
                readonly type: "uint8";
            }, {
                readonly internalType: "enum SignatureType";
                readonly name: "signatureType";
                readonly type: "uint8";
            }, {
                readonly internalType: "bytes";
                readonly name: "signature";
                readonly type: "bytes";
            }];
            readonly internalType: "struct Order";
            readonly name: "order";
            readonly type: "tuple";
        }];
        readonly name: "hashOrder";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "incrementNonce";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "usr";
            readonly type: "address";
        }];
        readonly name: "isAdmin";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "usr";
            readonly type: "address";
        }];
        readonly name: "isOperator";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "usr";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "nonce";
            readonly type: "uint256";
        }];
        readonly name: "isValidNonce";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "uint256";
                readonly name: "salt";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "maker";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "signer";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "taker";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "tokenId";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "makerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "takerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "expiration";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "nonce";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "feeRateBps";
                readonly type: "uint256";
            }, {
                readonly internalType: "enum Side";
                readonly name: "side";
                readonly type: "uint8";
            }, {
                readonly internalType: "enum SignatureType";
                readonly name: "signatureType";
                readonly type: "uint8";
            }, {
                readonly internalType: "bytes";
                readonly name: "signature";
                readonly type: "bytes";
            }];
            readonly internalType: "struct Order";
            readonly name: "takerOrder";
            readonly type: "tuple";
        }, {
            readonly components: readonly [{
                readonly internalType: "uint256";
                readonly name: "salt";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "maker";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "signer";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "taker";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "tokenId";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "makerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "takerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "expiration";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "nonce";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "feeRateBps";
                readonly type: "uint256";
            }, {
                readonly internalType: "enum Side";
                readonly name: "side";
                readonly type: "uint8";
            }, {
                readonly internalType: "enum SignatureType";
                readonly name: "signatureType";
                readonly type: "uint8";
            }, {
                readonly internalType: "bytes";
                readonly name: "signature";
                readonly type: "bytes";
            }];
            readonly internalType: "struct Order[]";
            readonly name: "makerOrders";
            readonly type: "tuple[]";
        }, {
            readonly internalType: "uint256";
            readonly name: "takerFillAmount";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "makerFillAmounts";
            readonly type: "uint256[]";
        }];
        readonly name: "matchOrders";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly name: "nonces";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "";
            readonly type: "uint256[]";
        }, {
            readonly internalType: "uint256[]";
            readonly name: "";
            readonly type: "uint256[]";
        }, {
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly name: "onERC1155BatchReceived";
        readonly outputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "";
            readonly type: "bytes4";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly name: "onERC1155Received";
        readonly outputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "";
            readonly type: "bytes4";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly name: "operators";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly name: "orderStatus";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "isFilledOrCancelled";
            readonly type: "bool";
        }, {
            readonly internalType: "uint256";
            readonly name: "remaining";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "parentCollectionId";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "pauseTrading";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "paused";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "proxyFactory";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "token";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "complement";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes32";
            readonly name: "conditionId";
            readonly type: "bytes32";
        }];
        readonly name: "registerToken";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly name: "registry";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "complement";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes32";
            readonly name: "conditionId";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "admin";
            readonly type: "address";
        }];
        readonly name: "removeAdmin";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "operator";
            readonly type: "address";
        }];
        readonly name: "removeOperator";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "renounceAdminRole";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "renounceOperatorRole";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "safeFactory";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_newProxyFactory";
            readonly type: "address";
        }];
        readonly name: "setProxyFactory";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_newSafeFactory";
            readonly type: "address";
        }];
        readonly name: "setSafeFactory";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "interfaceId";
            readonly type: "bytes4";
        }];
        readonly name: "supportsInterface";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "unpauseTrading";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "token";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "complement";
            readonly type: "uint256";
        }];
        readonly name: "validateComplement";
        readonly outputs: readonly [];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "uint256";
                readonly name: "salt";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "maker";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "signer";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "taker";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "tokenId";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "makerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "takerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "expiration";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "nonce";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "feeRateBps";
                readonly type: "uint256";
            }, {
                readonly internalType: "enum Side";
                readonly name: "side";
                readonly type: "uint8";
            }, {
                readonly internalType: "enum SignatureType";
                readonly name: "signatureType";
                readonly type: "uint8";
            }, {
                readonly internalType: "bytes";
                readonly name: "signature";
                readonly type: "bytes";
            }];
            readonly internalType: "struct Order";
            readonly name: "order";
            readonly type: "tuple";
        }];
        readonly name: "validateOrder";
        readonly outputs: readonly [];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "orderHash";
            readonly type: "bytes32";
        }, {
            readonly components: readonly [{
                readonly internalType: "uint256";
                readonly name: "salt";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "maker";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "signer";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "taker";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "tokenId";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "makerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "takerAmount";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "expiration";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "nonce";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "feeRateBps";
                readonly type: "uint256";
            }, {
                readonly internalType: "enum Side";
                readonly name: "side";
                readonly type: "uint8";
            }, {
                readonly internalType: "enum SignatureType";
                readonly name: "signatureType";
                readonly type: "uint8";
            }, {
                readonly internalType: "bytes";
                readonly name: "signature";
                readonly type: "bytes";
            }];
            readonly internalType: "struct Order";
            readonly name: "order";
            readonly type: "tuple";
        }];
        readonly name: "validateOrderSignature";
        readonly outputs: readonly [];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "tokenId";
            readonly type: "uint256";
        }];
        readonly name: "validateTokenId";
        readonly outputs: readonly [];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    exchangeV2: readonly [{
        readonly type: "constructor";
        readonly inputs: readonly [{
            readonly name: "params";
            readonly type: "tuple";
            readonly internalType: "struct ExchangeInitParams";
            readonly components: readonly [{
                readonly name: "admin";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "collateral";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "ctf";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "ctfCollateral";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "outcomeTokenFactory";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "proxyFactory";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "safeFactory";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "feeReceiver";
                readonly type: "address";
                readonly internalType: "address";
            }];
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "PARENT_COLLECTION_ID";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "addAdmin";
        readonly inputs: readonly [{
            readonly name: "_admin";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "addOperator";
        readonly inputs: readonly [{
            readonly name: "_operator";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "eip712Domain";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "fields";
            readonly type: "bytes1";
            readonly internalType: "bytes1";
        }, {
            readonly name: "name";
            readonly type: "string";
            readonly internalType: "string";
        }, {
            readonly name: "version";
            readonly type: "string";
            readonly internalType: "string";
        }, {
            readonly name: "chainId";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "verifyingContract";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "salt";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "extensions";
            readonly type: "uint256[]";
            readonly internalType: "uint256[]";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getCollateral";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getCtf";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getCtfCollateral";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getFeeReceiver";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getMaxFeeRate";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getOrderStatus";
        readonly inputs: readonly [{
            readonly name: "orderHash";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "tuple";
            readonly internalType: "struct OrderStatus";
            readonly components: readonly [{
                readonly name: "filled";
                readonly type: "bool";
                readonly internalType: "bool";
            }, {
                readonly name: "remaining";
                readonly type: "uint248";
                readonly internalType: "uint248";
            }];
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getOutcomeTokenFactory";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getProxyFactory";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getProxyImplementation";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getProxyWalletAddress";
        readonly inputs: readonly [{
            readonly name: "_addr";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getSafeFactory";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getSafeImplementation";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "getSafeWalletAddress";
        readonly inputs: readonly [{
            readonly name: "_addr";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "hashOrder";
        readonly inputs: readonly [{
            readonly name: "order";
            readonly type: "tuple";
            readonly internalType: "struct Order";
            readonly components: readonly [{
                readonly name: "salt";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "maker";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "signer";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "tokenId";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "makerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "takerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "side";
                readonly type: "uint8";
                readonly internalType: "enum Side";
            }, {
                readonly name: "signatureType";
                readonly type: "uint8";
                readonly internalType: "enum SignatureType";
            }, {
                readonly name: "timestamp";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "metadata";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "builder";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "signature";
                readonly type: "bytes";
                readonly internalType: "bytes";
            }];
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "invalidatePreapprovedOrder";
        readonly inputs: readonly [{
            readonly name: "orderHash";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "isAdmin";
        readonly inputs: readonly [{
            readonly name: "_usr";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "isOperator";
        readonly inputs: readonly [{
            readonly name: "_usr";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "isUserPaused";
        readonly inputs: readonly [{
            readonly name: "user";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "matchOrders";
        readonly inputs: readonly [{
            readonly name: "conditionId";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "takerOrder";
            readonly type: "tuple";
            readonly internalType: "struct Order";
            readonly components: readonly [{
                readonly name: "salt";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "maker";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "signer";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "tokenId";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "makerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "takerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "side";
                readonly type: "uint8";
                readonly internalType: "enum Side";
            }, {
                readonly name: "signatureType";
                readonly type: "uint8";
                readonly internalType: "enum SignatureType";
            }, {
                readonly name: "timestamp";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "metadata";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "builder";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "signature";
                readonly type: "bytes";
                readonly internalType: "bytes";
            }];
        }, {
            readonly name: "makerOrders";
            readonly type: "tuple[]";
            readonly internalType: "struct Order[]";
            readonly components: readonly [{
                readonly name: "salt";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "maker";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "signer";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "tokenId";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "makerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "takerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "side";
                readonly type: "uint8";
                readonly internalType: "enum Side";
            }, {
                readonly name: "signatureType";
                readonly type: "uint8";
                readonly internalType: "enum SignatureType";
            }, {
                readonly name: "timestamp";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "metadata";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "builder";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "signature";
                readonly type: "bytes";
                readonly internalType: "bytes";
            }];
        }, {
            readonly name: "takerFillAmount";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "makerFillAmounts";
            readonly type: "uint256[]";
            readonly internalType: "uint256[]";
        }, {
            readonly name: "takerFeeAmount";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "makerFeeAmounts";
            readonly type: "uint256[]";
            readonly internalType: "uint256[]";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "onERC1155BatchReceived";
        readonly inputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "";
            readonly type: "uint256[]";
            readonly internalType: "uint256[]";
        }, {
            readonly name: "";
            readonly type: "uint256[]";
            readonly internalType: "uint256[]";
        }, {
            readonly name: "";
            readonly type: "bytes";
            readonly internalType: "bytes";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes4";
            readonly internalType: "bytes4";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "onERC1155Received";
        readonly inputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "";
            readonly type: "bytes";
            readonly internalType: "bytes";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes4";
            readonly internalType: "bytes4";
        }];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "orderStatus";
        readonly inputs: readonly [{
            readonly name: "";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }];
        readonly outputs: readonly [{
            readonly name: "filled";
            readonly type: "bool";
            readonly internalType: "bool";
        }, {
            readonly name: "remaining";
            readonly type: "uint248";
            readonly internalType: "uint248";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "pauseTrading";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "pauseUser";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "paused";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "preapproveOrder";
        readonly inputs: readonly [{
            readonly name: "order";
            readonly type: "tuple";
            readonly internalType: "struct Order";
            readonly components: readonly [{
                readonly name: "salt";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "maker";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "signer";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "tokenId";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "makerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "takerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "side";
                readonly type: "uint8";
                readonly internalType: "enum Side";
            }, {
                readonly name: "signatureType";
                readonly type: "uint8";
                readonly internalType: "enum SignatureType";
            }, {
                readonly name: "timestamp";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "metadata";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "builder";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "signature";
                readonly type: "bytes";
                readonly internalType: "bytes";
            }];
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "removeAdmin";
        readonly inputs: readonly [{
            readonly name: "_admin";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "removeOperator";
        readonly inputs: readonly [{
            readonly name: "_operator";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "renounceOperatorRole";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setFeeReceiver";
        readonly inputs: readonly [{
            readonly name: "receiver";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setMaxFeeRate";
        readonly inputs: readonly [{
            readonly name: "rate";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "setUserPauseBlockInterval";
        readonly inputs: readonly [{
            readonly name: "_interval";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "supportsInterface";
        readonly inputs: readonly [{
            readonly name: "interfaceId";
            readonly type: "bytes4";
            readonly internalType: "bytes4";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
            readonly internalType: "bool";
        }];
        readonly stateMutability: "pure";
    }, {
        readonly type: "function";
        readonly name: "unpauseTrading";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "unpauseUser";
        readonly inputs: readonly [];
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
    }, {
        readonly type: "function";
        readonly name: "userPauseBlockInterval";
        readonly inputs: readonly [];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "userPausedBlockAt";
        readonly inputs: readonly [{
            readonly name: "";
            readonly type: "address";
            readonly internalType: "address";
        }];
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "validateFee";
        readonly inputs: readonly [{
            readonly name: "fee";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }, {
            readonly name: "cashValue";
            readonly type: "uint256";
            readonly internalType: "uint256";
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "validateOrder";
        readonly inputs: readonly [{
            readonly name: "order";
            readonly type: "tuple";
            readonly internalType: "struct Order";
            readonly components: readonly [{
                readonly name: "salt";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "maker";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "signer";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "tokenId";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "makerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "takerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "side";
                readonly type: "uint8";
                readonly internalType: "enum Side";
            }, {
                readonly name: "signatureType";
                readonly type: "uint8";
                readonly internalType: "enum SignatureType";
            }, {
                readonly name: "timestamp";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "metadata";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "builder";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "signature";
                readonly type: "bytes";
                readonly internalType: "bytes";
            }];
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "view";
    }, {
        readonly type: "function";
        readonly name: "validateOrderSignature";
        readonly inputs: readonly [{
            readonly name: "orderHash";
            readonly type: "bytes32";
            readonly internalType: "bytes32";
        }, {
            readonly name: "order";
            readonly type: "tuple";
            readonly internalType: "struct Order";
            readonly components: readonly [{
                readonly name: "salt";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "maker";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "signer";
                readonly type: "address";
                readonly internalType: "address";
            }, {
                readonly name: "tokenId";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "makerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "takerAmount";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "side";
                readonly type: "uint8";
                readonly internalType: "enum Side";
            }, {
                readonly name: "signatureType";
                readonly type: "uint8";
                readonly internalType: "enum SignatureType";
            }, {
                readonly name: "timestamp";
                readonly type: "uint256";
                readonly internalType: "uint256";
            }, {
                readonly name: "metadata";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "builder";
                readonly type: "bytes32";
                readonly internalType: "bytes32";
            }, {
                readonly name: "signature";
                readonly type: "bytes";
                readonly internalType: "bytes";
            }];
        }];
        readonly outputs: readonly [];
        readonly stateMutability: "view";
    }, {
        readonly type: "event";
        readonly name: "FeeCharged";
        readonly inputs: readonly [{
            readonly name: "receiver";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "amount";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "FeeReceiverUpdated";
        readonly inputs: readonly [{
            readonly name: "feeReceiver";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "MaxFeeRateUpdated";
        readonly inputs: readonly [{
            readonly name: "maxFeeRate";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "NewAdmin";
        readonly inputs: readonly [{
            readonly name: "newAdminAddress";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "admin";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "NewOperator";
        readonly inputs: readonly [{
            readonly name: "newOperatorAddress";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "admin";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OrderFilled";
        readonly inputs: readonly [{
            readonly name: "orderHash";
            readonly type: "bytes32";
            readonly indexed: true;
            readonly internalType: "bytes32";
        }, {
            readonly name: "maker";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "taker";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "side";
            readonly type: "uint8";
            readonly indexed: false;
            readonly internalType: "enum Side";
        }, {
            readonly name: "tokenId";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "makerAmountFilled";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "takerAmountFilled";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "fee";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "builder";
            readonly type: "bytes32";
            readonly indexed: false;
            readonly internalType: "bytes32";
        }, {
            readonly name: "metadata";
            readonly type: "bytes32";
            readonly indexed: false;
            readonly internalType: "bytes32";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OrderPreapprovalInvalidated";
        readonly inputs: readonly [{
            readonly name: "orderHash";
            readonly type: "bytes32";
            readonly indexed: true;
            readonly internalType: "bytes32";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OrderPreapproved";
        readonly inputs: readonly [{
            readonly name: "orderHash";
            readonly type: "bytes32";
            readonly indexed: true;
            readonly internalType: "bytes32";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "OrdersMatched";
        readonly inputs: readonly [{
            readonly name: "takerOrderHash";
            readonly type: "bytes32";
            readonly indexed: true;
            readonly internalType: "bytes32";
        }, {
            readonly name: "takerOrderMaker";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "side";
            readonly type: "uint8";
            readonly indexed: false;
            readonly internalType: "enum Side";
        }, {
            readonly name: "tokenId";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "makerAmountFilled";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "takerAmountFilled";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RemovedAdmin";
        readonly inputs: readonly [{
            readonly name: "removedAdmin";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "admin";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "RemovedOperator";
        readonly inputs: readonly [{
            readonly name: "removedOperator";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "admin";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "TradingPaused";
        readonly inputs: readonly [{
            readonly name: "pauser";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "TradingUnpaused";
        readonly inputs: readonly [{
            readonly name: "pauser";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "UserPauseBlockIntervalUpdated";
        readonly inputs: readonly [{
            readonly name: "oldInterval";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }, {
            readonly name: "newInterval";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "UserPaused";
        readonly inputs: readonly [{
            readonly name: "user";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }, {
            readonly name: "effectivePauseBlock";
            readonly type: "uint256";
            readonly indexed: false;
            readonly internalType: "uint256";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "event";
        readonly name: "UserUnpaused";
        readonly inputs: readonly [{
            readonly name: "user";
            readonly type: "address";
            readonly indexed: true;
            readonly internalType: "address";
        }];
        readonly anonymous: false;
    }, {
        readonly type: "error";
        readonly name: "AlreadyAdmin";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "AlreadyOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ComplementaryFillExceedsTakerFill";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ExceedsMaxPauseInterval";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "FeeExceedsMaxRate";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "FeeExceedsProceeds";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "InvalidSignature";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "LastAdmin";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "MakingGtRemaining";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "MaxFeeRateExceedsCeiling";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "MismatchedArrayLengths";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "MismatchedTokenIds";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NoMakerOrders";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotAdmin";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotCrossing";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "NotOperator";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "OrderAlreadyFilled";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "Paused";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "TooLittleTokensReceived";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "UserAlreadyPaused";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "UserIsPaused";
        readonly inputs: readonly [];
    }, {
        readonly type: "error";
        readonly name: "ZeroMakerAmount";
        readonly inputs: readonly [];
    }];
};
export * from "./model/abi.js";
export * from "./model/eip712.js";
export * from "./model/orderDataV1.js";
export * from "./model/orderDataV2.js";
export * from "./model/signatureTypeV1.js";
export * from "./model/signatureTypeV2.js";
