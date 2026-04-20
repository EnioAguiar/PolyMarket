declare const exchangeV1Abi: readonly [{
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
export { exchangeV1Abi };
