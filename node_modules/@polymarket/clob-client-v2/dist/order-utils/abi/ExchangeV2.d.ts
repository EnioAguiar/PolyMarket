declare const exchangeV2Abi: readonly [{
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
export { exchangeV2Abi };
