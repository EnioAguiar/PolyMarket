import { BUILDER_FEES_BPS, bytes32Zero, END_CURSOR, INITIAL_CURSOR, ORDER_VERSION_MISMATCH_ERROR, } from "./constants.js";
import { ARE_ORDERS_SCORING, CANCEL_ALL, CANCEL_MARKET_ORDERS, CANCEL_ORDER, CANCEL_ORDERS, CLOSED_ONLY, CREATE_API_KEY, CREATE_BUILDER_API_KEY, CREATE_READONLY_API_KEY, DELETE_API_KEY, DELETE_READONLY_API_KEY, DERIVE_API_KEY, DROP_NOTIFICATIONS, GET_API_KEYS, GET_BALANCE_ALLOWANCE, GET_BUILDER_API_KEYS, GET_BUILDER_FEES, GET_BUILDER_TRADES, GET_CLOB_MARKET, GET_EARNINGS_FOR_USER_FOR_DAY, GET_FEE_RATE, GET_LAST_TRADE_PRICE, GET_LAST_TRADES_PRICES, GET_LIQUIDITY_REWARD_PERCENTAGES, GET_MARKET, GET_MARKET_BY_TOKEN, GET_MARKET_TRADES_EVENTS, GET_MARKETS, GET_MIDPOINT, GET_MIDPOINTS, GET_NEG_RISK, GET_NOTIFICATIONS, GET_OPEN_ORDERS, GET_ORDER, GET_ORDER_BOOK, GET_ORDER_BOOKS, GET_PRE_MIGRATION_ORDERS, GET_PRICE, GET_PRICES, GET_PRICES_HISTORY, GET_READONLY_API_KEYS, GET_REWARDS_EARNINGS_PERCENTAGES, GET_REWARDS_MARKETS, GET_REWARDS_MARKETS_CURRENT, GET_SAMPLING_MARKETS, GET_SAMPLING_SIMPLIFIED_MARKETS, GET_SIMPLIFIED_MARKETS, GET_SPREAD, GET_SPREADS, GET_TICK_SIZE, GET_TOTAL_EARNINGS_FOR_USER_FOR_DAY, GET_TRADES, HEARTBEAT, IS_ORDER_SCORING, OK, POST_ORDER, POST_ORDERS, REVOKE_BUILDER_API_KEY, TIME, UPDATE_BALANCE_ALLOWANCE, } from "./endpoints.js";
import { ApiError, L1_AUTH_UNAVAILABLE_ERROR, L2_AUTH_NOT_AVAILABLE } from "./errors.js";
import { createL1Headers, createL2Headers } from "./headers/index.js";
import { DELETE, del, GET, get, POST, parseDropNotificationParams, post, } from "./http-helpers/index.js";
import { calculateBuyMarketPrice, calculateSellMarketPrice, } from "./order-builder/helpers/index.js";
import { OrderBuilder } from "./order-builder/index.js";
import { OrderType, orderToJsonV1, orderToJsonV2, Side } from "./types/index.js";
import { isV2Order } from "./types/unifiedOrder.js";
import { generateOrderBookSummaryHash, isTickSizeSmaller, priceValid } from "./utilities.js";
export function adjustBuyAmountForFees(amount, price, userUSDCBalance, feeRate, feeExponent, builderTakerFeeRate) {
    const platformFeeRate = feeRate * (price * (1 - price)) ** feeExponent;
    const platformFee = (amount / price) * platformFeeRate;
    const totalCost = amount + platformFee + amount * builderTakerFeeRate;
    if (userUSDCBalance <= totalCost) {
        return userUSDCBalance / (1 + platformFeeRate / price + builderTakerFeeRate);
    }
    return amount;
}
export class ClobClient {
    host;
    chainId;
    // Used to perform Level 1 authentication and sign orders
    signer;
    // Used to perform Level 2 authentication
    creds;
    orderBuilder;
    tickSizes;
    negRisk;
    feeInfos;
    // Fee rate bps data for CLOB V1
    feeRates;
    builderFeeRates;
    tokenConditionMap;
    useServerTime;
    builderConfig;
    cachedVersion;
    retryOnError;
    throwOnError;
    constructor({ host, chain, signer, creds, signatureType, funderAddress, useServerTime, builderConfig, getSigner, retryOnError, throwOnError, }) {
        this.host = host.endsWith("/") ? host.slice(0, -1) : host;
        this.chainId = chain;
        if (signer !== undefined) {
            this.signer = signer;
        }
        if (creds !== undefined) {
            this.creds = creds;
        }
        this.orderBuilder = new OrderBuilder(signer, chain, signatureType, funderAddress, getSigner);
        this.tickSizes = {};
        this.negRisk = {};
        this.feeRates = {};
        this.feeInfos = {};
        this.builderFeeRates = {};
        this.tokenConditionMap = {};
        this.retryOnError = retryOnError;
        this.throwOnError = throwOnError;
        this.useServerTime = useServerTime;
        if (builderConfig !== undefined) {
            this.builderConfig = builderConfig;
        }
    }
    // Public endpoints
    async getOk() {
        return this.get(`${this.host}${OK}`);
    }
    async postHeartbeat(heartbeatId = "") {
        this.canL2Auth();
        const body = JSON.stringify({ heartbeat_id: heartbeatId });
        const headers = await createL2Headers(this.signer, this.creds, { method: POST, requestPath: HEARTBEAT, body }, this.useServerTime ? await this.getServerTime() : undefined);
        return this.post(`${this.host}${HEARTBEAT}`, {
            headers,
            data: { heartbeat_id: heartbeatId },
        });
    }
    async getVersion() {
        const response = await this.get(`${this.host}/version`);
        // default to v2
        return response?.version ?? 2;
    }
    async getServerTime() {
        return this.get(`${this.host}${TIME}`);
    }
    async getSamplingSimplifiedMarkets(next_cursor = INITIAL_CURSOR) {
        return this.get(`${this.host}${GET_SAMPLING_SIMPLIFIED_MARKETS}`, {
            params: { next_cursor },
        });
    }
    async getSamplingMarkets(next_cursor = INITIAL_CURSOR) {
        return this.get(`${this.host}${GET_SAMPLING_MARKETS}`, {
            params: { next_cursor },
        });
    }
    async getSimplifiedMarkets(next_cursor = INITIAL_CURSOR) {
        return this.get(`${this.host}${GET_SIMPLIFIED_MARKETS}`, {
            params: { next_cursor },
        });
    }
    async getMarkets(next_cursor = INITIAL_CURSOR) {
        return this.get(`${this.host}${GET_MARKETS}`, {
            params: { next_cursor },
        });
    }
    async getMarket(conditionID) {
        return this.get(`${this.host}${GET_MARKET}${conditionID}`);
    }
    async getClobMarketInfo(conditionID) {
        const result = await this.get(`${this.host}${GET_CLOB_MARKET}${conditionID}`);
        if (!result?.t) {
            throw new Error(`failed to fetch market info for condition id ${conditionID}`);
        }
        for (const token of result.t) {
            if (!token)
                continue;
            const tokenId = token.t;
            this.tokenConditionMap[tokenId] = conditionID;
            this.tickSizes[tokenId] = result.mts.toString();
            this.negRisk[tokenId] = result.nr ?? false;
            this.feeInfos[tokenId] = {
                rate: result.fd?.r ?? 0,
                exponent: result.fd?.e ?? 0,
            };
        }
        return result;
    }
    async getOrderBook(tokenID) {
        return this.get(`${this.host}${GET_ORDER_BOOK}`, {
            params: { token_id: tokenID },
        });
    }
    async getOrderBooks(params) {
        return this.post(`${this.host}${GET_ORDER_BOOKS}`, {
            data: params,
        });
    }
    async getTickSize(tokenID) {
        if (tokenID in this.tickSizes) {
            return this.tickSizes[tokenID];
        }
        if (tokenID in this.tokenConditionMap) {
            await this.getClobMarketInfo(this.tokenConditionMap[tokenID]);
            return this.tickSizes[tokenID];
        }
        const result = await this.get(`${this.host}${GET_TICK_SIZE}`, {
            params: { token_id: tokenID },
        });
        this.tickSizes[tokenID] = result.minimum_tick_size.toString();
        return this.tickSizes[tokenID];
    }
    async getNegRisk(tokenID) {
        if (tokenID in this.negRisk) {
            return this.negRisk[tokenID];
        }
        if (tokenID in this.tokenConditionMap) {
            await this.getClobMarketInfo(this.tokenConditionMap[tokenID]);
            return this.negRisk[tokenID];
        }
        const result = await this.get(`${this.host}${GET_NEG_RISK}`, {
            params: { token_id: tokenID },
        });
        this.negRisk[tokenID] = result.neg_risk;
        return this.negRisk[tokenID];
    }
    async getFeeRateBps(tokenID) {
        if (tokenID in this.feeRates) {
            return this.feeRates[tokenID];
        }
        const result = await this.get(`${this.host}${GET_FEE_RATE}`, {
            params: { token_id: tokenID },
        });
        this.feeRates[tokenID] = result.base_fee;
        return this.feeRates[tokenID];
    }
    async getFeeExponent(tokenID) {
        if (tokenID in this.feeInfos) {
            return this.feeInfos[tokenID].exponent;
        }
        await this._ensureMarketInfoCached(tokenID);
        return this.feeInfos[tokenID].exponent;
    }
    /**
     * Calculates the hash for the given orderbook
     * @param orderbook
     * @returns
     */
    getOrderBookHash(orderbook) {
        return generateOrderBookSummaryHash(orderbook);
    }
    async getMidpoint(tokenID) {
        return this.get(`${this.host}${GET_MIDPOINT}`, {
            params: { token_id: tokenID },
        });
    }
    async getMidpoints(params) {
        return this.post(`${this.host}${GET_MIDPOINTS}`, {
            data: params,
        });
    }
    async getPrice(tokenID, side) {
        return this.get(`${this.host}${GET_PRICE}`, {
            params: { token_id: tokenID, side: side },
        });
    }
    async getPrices(params) {
        return this.post(`${this.host}${GET_PRICES}`, {
            data: params,
        });
    }
    async getSpread(tokenID) {
        return this.get(`${this.host}${GET_SPREAD}`, {
            params: { token_id: tokenID },
        });
    }
    async getSpreads(params) {
        return this.post(`${this.host}${GET_SPREADS}`, {
            data: params,
        });
    }
    async getLastTradePrice(tokenID) {
        return this.get(`${this.host}${GET_LAST_TRADE_PRICE}`, {
            params: { token_id: tokenID },
        });
    }
    async getLastTradesPrices(params) {
        return this.post(`${this.host}${GET_LAST_TRADES_PRICES}`, {
            data: params,
        });
    }
    async getPricesHistory(params) {
        if (!params.interval && (params.startTs === undefined || params.endTs === undefined)) {
            throw new Error("getPricesHistory requires either interval or both startTs and endTs");
        }
        return this.get(`${this.host}${GET_PRICES_HISTORY}`, {
            params,
        });
    }
    // L1 Authed
    /**
     * Creates a new API key for a user
     * @param nonce
     * @returns ApiKeyCreds
     */
    async createApiKey(nonce) {
        this.canL1Auth();
        const endpoint = `${this.host}${CREATE_API_KEY}`;
        const headers = await createL1Headers(this.signer, this.chainId, nonce, this.useServerTime ? await this.getServerTime() : undefined);
        return await this.post(endpoint, { headers }).then((apiKeyRaw) => {
            const apiKey = {
                key: apiKeyRaw.apiKey,
                secret: apiKeyRaw.secret,
                passphrase: apiKeyRaw.passphrase,
            };
            return apiKey;
        });
    }
    /**
     * Derives an existing API key for a user
     * @param nonce
     * @returns ApiKeyCreds
     */
    async deriveApiKey(nonce) {
        this.canL1Auth();
        const endpoint = `${this.host}${DERIVE_API_KEY}`;
        const headers = await createL1Headers(this.signer, this.chainId, nonce, this.useServerTime ? await this.getServerTime() : undefined);
        return await this.get(endpoint, { headers }).then((apiKeyRaw) => {
            const apiKey = {
                key: apiKeyRaw.apiKey,
                secret: apiKeyRaw.secret,
                passphrase: apiKeyRaw.passphrase,
            };
            return apiKey;
        });
    }
    async createOrDeriveApiKey(nonce) {
        return this.createApiKey(nonce).then(response => {
            if (!response.key) {
                return this.deriveApiKey(nonce);
            }
            return response;
        });
    }
    async getApiKeys() {
        this.canL2Auth();
        const endpoint = GET_API_KEYS;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.get(`${this.host}${endpoint}`, { headers });
    }
    async getClosedOnlyMode() {
        this.canL2Auth();
        const endpoint = CLOSED_ONLY;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.get(`${this.host}${endpoint}`, { headers });
    }
    async deleteApiKey() {
        this.canL2Auth();
        const endpoint = DELETE_API_KEY;
        const headerArgs = {
            method: DELETE,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.del(`${this.host}${endpoint}`, { headers });
    }
    async createReadonlyApiKey() {
        this.canL2Auth();
        const endpoint = CREATE_READONLY_API_KEY;
        const headerArgs = {
            method: POST,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.post(`${this.host}${endpoint}`, { headers });
    }
    async getReadonlyApiKeys() {
        this.canL2Auth();
        const endpoint = GET_READONLY_API_KEYS;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.get(`${this.host}${endpoint}`, { headers });
    }
    async deleteReadonlyApiKey(key) {
        this.canL2Auth();
        const endpoint = DELETE_READONLY_API_KEY;
        const payload = { key };
        const headerArgs = {
            method: DELETE,
            requestPath: endpoint,
            body: JSON.stringify(payload),
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.del(`${this.host}${endpoint}`, { headers, data: payload });
    }
    async getOrder(orderID) {
        this.canL2Auth();
        const endpoint = `${GET_ORDER}${orderID}`;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.get(`${this.host}${endpoint}`, { headers });
    }
    async getTrades(params, only_first_page = false, next_cursor) {
        this.canL2Auth();
        const endpoint = GET_TRADES;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        let results = [];
        next_cursor = next_cursor || INITIAL_CURSOR;
        while (next_cursor !== END_CURSOR && (next_cursor === INITIAL_CURSOR || !only_first_page)) {
            const _params = {
                ...params,
                next_cursor,
            };
            const response = await this.get(`${this.host}${endpoint}`, {
                headers,
                params: _params,
            });
            next_cursor = response.next_cursor;
            results = [...results, ...response.data];
        }
        return results;
    }
    async getTradesPaginated(params, next_cursor) {
        this.canL2Auth();
        const endpoint = GET_TRADES;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        next_cursor = next_cursor || INITIAL_CURSOR;
        const _params = { ...params, next_cursor };
        const { data, ...rest } = await this.get(`${this.host}${endpoint}`, { headers, params: _params });
        return { trades: Array.isArray(data) ? [...data] : [], ...rest };
    }
    async getBuilderTrades(params, next_cursor) {
        if (!params.builder_code || params.builder_code === bytes32Zero) {
            throw new Error("builderCode is required and cannot be zero");
        }
        this.canL2Auth();
        const endpoint = GET_BUILDER_TRADES;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        next_cursor = next_cursor || INITIAL_CURSOR;
        const _params = { ...params, next_cursor };
        const { data, ...rest } = await this.get(`${this.host}${endpoint}`, { headers, params: _params });
        return { trades: Array.isArray(data) ? [...data] : [], ...rest };
    }
    async getNotifications() {
        this.canL2Auth();
        const endpoint = GET_NOTIFICATIONS;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.get(`${this.host}${endpoint}`, {
            headers,
            params: { signature_type: this.orderBuilder.signatureType },
        });
    }
    async dropNotifications(params) {
        this.canL2Auth();
        const endpoint = DROP_NOTIFICATIONS;
        const l2HeaderArgs = {
            method: DELETE,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, l2HeaderArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.del(`${this.host}${endpoint}`, {
            headers,
            params: parseDropNotificationParams(params),
        });
    }
    async getBalanceAllowance(params) {
        this.canL2Auth();
        const endpoint = GET_BALANCE_ALLOWANCE;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        const _params = {
            ...params,
            signature_type: this.orderBuilder.signatureType,
        };
        return this.get(`${this.host}${endpoint}`, { headers, params: _params });
    }
    async updateBalanceAllowance(params) {
        this.canL2Auth();
        const endpoint = UPDATE_BALANCE_ALLOWANCE;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        const _params = {
            ...params,
            signature_type: this.orderBuilder.signatureType,
        };
        return this.get(`${this.host}${endpoint}`, { headers, params: _params });
    }
    async createOrder(userOrder, options) {
        this.canL1Auth();
        const orderToSign = { ...userOrder };
        if (this.builderConfig?.builderCode && !orderToSign.builderCode) {
            orderToSign.builderCode = this.builderConfig.builderCode;
        }
        const { tokenID } = orderToSign;
        const tickSize = await this._resolveTickSize(tokenID, options?.tickSize);
        if (!priceValid(orderToSign.price, tickSize)) {
            throw new Error(`invalid price (${orderToSign.price}), min: ${parseFloat(tickSize)} - max: ${1 - parseFloat(tickSize)}`);
        }
        const negRisk = options?.negRisk ?? (await this.getNegRisk(tokenID));
        const version = await this.resolveVersion();
        if (version === 1) {
            const userFeeRateBps = "feeRateBps" in orderToSign ? orderToSign.feeRateBps : undefined;
            const feeRateBps = await this._resolveFeeRateBps(tokenID, userFeeRateBps);
            orderToSign.feeRateBps = feeRateBps;
        }
        return this.orderBuilder.buildOrder(orderToSign, {
            tickSize,
            negRisk,
        }, version);
    }
    async createMarketOrder(userMarketOrder, options) {
        this.canL1Auth();
        const { tokenID } = userMarketOrder;
        await this._ensureMarketInfoCached(tokenID);
        const tickSize = await this._resolveTickSize(tokenID, options?.tickSize);
        if (!userMarketOrder.price) {
            userMarketOrder.price = await this.calculateMarketPrice(tokenID, userMarketOrder.side, userMarketOrder.amount, userMarketOrder.orderType);
        }
        if (!priceValid(userMarketOrder.price, tickSize)) {
            throw new Error(`invalid price (${userMarketOrder.price}), min: ${parseFloat(tickSize)} - max: ${1 - parseFloat(tickSize)}`);
        }
        const orderToSign = { ...userMarketOrder };
        if (this.builderConfig?.builderCode && !orderToSign.builderCode) {
            orderToSign.builderCode = this.builderConfig.builderCode;
        }
        await this.ensureBuilderFeeRateCached(orderToSign.builderCode);
        if (orderToSign.side === Side.BUY &&
            "userUSDCBalance" in orderToSign &&
            orderToSign.userUSDCBalance !== undefined) {
            // biome-ignore lint/style/noNonNullAssertion: price is validated above
            const price = orderToSign.price;
            const { userUSDCBalance } = orderToSign;
            const builderTakerFeeRate = this.isBuilderOrder(orderToSign.builderCode)
                ? (this.builderFeeRates[orderToSign.builderCode ?? ""]?.taker ?? 0)
                : 0;
            orderToSign.amount = adjustBuyAmountForFees(orderToSign.amount, price, userUSDCBalance, this.feeInfos[tokenID].rate, this.feeInfos[tokenID].exponent, builderTakerFeeRate);
        }
        const negRisk = options?.negRisk ?? (await this.getNegRisk(tokenID));
        const version = await this.resolveVersion();
        if (version === 1) {
            const userFeeRateBps = "feeRateBps" in orderToSign
                ? orderToSign.feeRateBps
                : undefined;
            const feeRateBps = await this._resolveFeeRateBps(tokenID, userFeeRateBps);
            orderToSign.feeRateBps = feeRateBps;
        }
        return this.orderBuilder.buildMarketOrder(orderToSign, {
            tickSize,
            negRisk,
        }, version);
    }
    async createAndPostOrder(userOrder, options, orderType = OrderType.GTC, postOnly = false, deferExec = false) {
        let postOrderResponse;
        await this._retryOnVersionUpdate(async () => {
            const order = await this.createOrder(userOrder, options);
            postOrderResponse = await this.postOrder(order, orderType, postOnly, deferExec);
        });
        return postOrderResponse;
    }
    async createAndPostMarketOrder(userMarketOrder, options, orderType = OrderType.FOK, deferExec = false) {
        let postOrderMarketResponse;
        await this._retryOnVersionUpdate(async () => {
            const order = await this.createMarketOrder(userMarketOrder, options);
            postOrderMarketResponse = await this.postOrder(order, orderType, false, deferExec);
        });
        return postOrderMarketResponse;
    }
    async getOpenOrders(params, only_first_page = false, next_cursor) {
        this.canL2Auth();
        const endpoint = GET_OPEN_ORDERS;
        const l2HeaderArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, l2HeaderArgs, this.useServerTime ? await this.getServerTime() : undefined);
        let results = [];
        next_cursor = next_cursor || INITIAL_CURSOR;
        while (next_cursor !== END_CURSOR && (next_cursor === INITIAL_CURSOR || !only_first_page)) {
            const _params = {
                ...params,
                next_cursor,
            };
            const response = await this.get(`${this.host}${endpoint}`, {
                headers,
                params: _params,
            });
            next_cursor = response.next_cursor;
            results = [...results, ...response.data];
        }
        return results;
    }
    async getPreMigrationOrders(only_first_page = false, next_cursor) {
        this.canL2Auth();
        const endpoint = GET_PRE_MIGRATION_ORDERS;
        const l2HeaderArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, l2HeaderArgs, this.useServerTime ? await this.getServerTime() : undefined);
        let results = [];
        next_cursor = next_cursor || INITIAL_CURSOR;
        while (next_cursor !== END_CURSOR && (next_cursor === INITIAL_CURSOR || !only_first_page)) {
            const _params = { next_cursor };
            const response = await this.get(`${this.host}${endpoint}`, {
                headers,
                params: _params,
            });
            next_cursor = response.next_cursor;
            results = [...results, ...response.data];
        }
        return results;
    }
    async postOrder(order, orderType = OrderType.GTC, postOnly = false, deferExec = false) {
        this.canL2Auth();
        if (postOnly && (orderType === OrderType.FOK || orderType === OrderType.FAK)) {
            throw new Error("postOnly is not supported for FOK/FAK orders");
        }
        const endpoint = POST_ORDER;
        const orderPayload = isV2Order(order)
            ? orderToJsonV2(order, this.creds?.key || "", orderType, postOnly, deferExec)
            : orderToJsonV1(order, this.creds?.key || "", orderType, postOnly, deferExec);
        const l2HeaderArgs = {
            method: POST,
            requestPath: endpoint,
            body: JSON.stringify(orderPayload),
        };
        const headers = await createL2Headers(this.signer, this.creds, l2HeaderArgs, this.useServerTime ? await this.getServerTime() : undefined);
        const res = await this.post(`${this.host}${endpoint}`, {
            headers,
            data: orderPayload,
        }, true);
        if (this._isOrderVersionMismatch(res))
            await this.resolveVersion(true);
        return this.throwIfError(res);
    }
    async postOrders(args, postOnly = false, deferExec = false) {
        this.canL2Auth();
        if (postOnly &&
            args.some(({ orderType }) => orderType === OrderType.FOK || orderType === OrderType.FAK)) {
            throw new Error("postOnly is not supported for FOK/FAK orders");
        }
        const endpoint = POST_ORDERS;
        const ordersPayload = [];
        for (const arg of args) {
            const { order, orderType } = arg;
            // Version-aware dispatch
            const orderPayload = isV2Order(order)
                ? orderToJsonV2(order, this.creds?.key || "", orderType, postOnly, deferExec)
                : orderToJsonV1(order, this.creds?.key || "", orderType, postOnly, deferExec);
            ordersPayload.push(orderPayload);
        }
        const l2HeaderArgs = {
            method: POST,
            requestPath: endpoint,
            body: JSON.stringify(ordersPayload),
        };
        const headers = await createL2Headers(this.signer, this.creds, l2HeaderArgs, this.useServerTime ? await this.getServerTime() : undefined);
        const res = await this.post(`${this.host}${endpoint}`, {
            headers,
            data: ordersPayload,
        }, true);
        if (this._isOrderVersionMismatch(res))
            await this.resolveVersion(true);
        return this.throwIfError(res);
    }
    async cancelOrder(payload) {
        this.canL2Auth();
        const endpoint = CANCEL_ORDER;
        const l2HeaderArgs = {
            method: DELETE,
            requestPath: endpoint,
            body: JSON.stringify(payload),
        };
        const headers = await createL2Headers(this.signer, this.creds, l2HeaderArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.del(`${this.host}${endpoint}`, { headers, data: payload });
    }
    async cancelOrders(ordersHashes) {
        this.canL2Auth();
        const endpoint = CANCEL_ORDERS;
        const l2HeaderArgs = {
            method: DELETE,
            requestPath: endpoint,
            body: JSON.stringify(ordersHashes),
        };
        const headers = await createL2Headers(this.signer, this.creds, l2HeaderArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.del(`${this.host}${endpoint}`, { headers, data: ordersHashes });
    }
    async cancelAll() {
        this.canL2Auth();
        const endpoint = CANCEL_ALL;
        const l2HeaderArgs = {
            method: DELETE,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, l2HeaderArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.del(`${this.host}${endpoint}`, { headers });
    }
    async cancelMarketOrders(payload) {
        this.canL2Auth();
        const endpoint = CANCEL_MARKET_ORDERS;
        const l2HeaderArgs = {
            method: DELETE,
            requestPath: endpoint,
            body: JSON.stringify(payload),
        };
        const headers = await createL2Headers(this.signer, this.creds, l2HeaderArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.del(`${this.host}${endpoint}`, { headers, data: payload });
    }
    async isOrderScoring(params) {
        this.canL2Auth();
        const endpoint = IS_ORDER_SCORING;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.get(`${this.host}${endpoint}`, { headers, params });
    }
    async areOrdersScoring(params) {
        this.canL2Auth();
        const endpoint = ARE_ORDERS_SCORING;
        const payload = JSON.stringify(params?.orderIds);
        const headerArgs = {
            method: POST,
            requestPath: endpoint,
            body: payload,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.post(`${this.host}${endpoint}`, {
            headers,
            data: payload,
        });
    }
    // Rewards
    async getEarningsForUserForDay(date) {
        this.canL2Auth();
        const endpoint = GET_EARNINGS_FOR_USER_FOR_DAY;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        let results = [];
        let next_cursor = INITIAL_CURSOR;
        while (next_cursor !== END_CURSOR) {
            const params = {
                date,
                signature_type: this.orderBuilder.signatureType,
                next_cursor,
            };
            const response = await this.get(`${this.host}${endpoint}`, {
                headers,
                params,
            });
            next_cursor = response.next_cursor;
            results = [...results, ...response.data];
        }
        return results;
    }
    async getTotalEarningsForUserForDay(date) {
        this.canL2Auth();
        const endpoint = GET_TOTAL_EARNINGS_FOR_USER_FOR_DAY;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        const params = {
            date,
            signature_type: this.orderBuilder.signatureType,
        };
        return await this.get(`${this.host}${endpoint}`, {
            headers,
            params,
        });
    }
    async getUserEarningsAndMarketsConfig(date, order_by = "", position = "", no_competition = false) {
        this.canL2Auth();
        const endpoint = GET_REWARDS_EARNINGS_PERCENTAGES;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        let results = [];
        let next_cursor = INITIAL_CURSOR;
        while (next_cursor !== END_CURSOR) {
            const params = {
                date,
                signature_type: this.orderBuilder.signatureType,
                next_cursor,
                order_by,
                position,
                no_competition,
            };
            const response = await this.get(`${this.host}${endpoint}`, {
                headers,
                params,
            });
            next_cursor = response.next_cursor;
            results = [...results, ...response.data];
        }
        return results;
    }
    async getRewardPercentages() {
        this.canL2Auth();
        const endpoint = GET_LIQUIDITY_REWARD_PERCENTAGES;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        const _params = {
            signature_type: this.orderBuilder.signatureType,
        };
        return this.get(`${this.host}${endpoint}`, { headers, params: _params });
    }
    async getCurrentRewards() {
        let results = [];
        let next_cursor = INITIAL_CURSOR;
        while (next_cursor !== END_CURSOR) {
            const response = await this.get(`${this.host}${GET_REWARDS_MARKETS_CURRENT}`, {
                params: { next_cursor },
            });
            next_cursor = response.next_cursor;
            results = [...results, ...response.data];
        }
        return results;
    }
    async getRawRewardsForMarket(conditionId) {
        let results = [];
        let next_cursor = INITIAL_CURSOR;
        while (next_cursor !== END_CURSOR) {
            const response = await this.get(`${this.host}${GET_REWARDS_MARKETS}${conditionId}`, {
                params: { next_cursor },
            });
            next_cursor = response.next_cursor;
            results = [...results, ...response.data];
        }
        return results;
    }
    async calculateMarketPrice(tokenID, side, amount, orderType = OrderType.FOK) {
        const book = await this.getOrderBook(tokenID);
        if (!book) {
            throw new Error("no orderbook");
        }
        if (side === Side.BUY) {
            if (!book.asks) {
                throw new Error("no match");
            }
            return calculateBuyMarketPrice(book.asks, amount, orderType);
        }
        else {
            if (!book.bids) {
                throw new Error("no match");
            }
            return calculateSellMarketPrice(book.bids, amount, orderType);
        }
    }
    async createBuilderApiKey() {
        this.canL2Auth();
        const endpoint = CREATE_BUILDER_API_KEY;
        const headerArgs = {
            method: POST,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.post(`${this.host}${endpoint}`, { headers });
    }
    async getBuilderApiKeys() {
        this.canL2Auth();
        const endpoint = GET_BUILDER_API_KEYS;
        const headerArgs = {
            method: GET,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.get(`${this.host}${endpoint}`, { headers });
    }
    async revokeBuilderApiKey() {
        this.canL2Auth();
        const endpoint = REVOKE_BUILDER_API_KEY;
        const headerArgs = {
            method: DELETE,
            requestPath: endpoint,
        };
        const headers = await createL2Headers(this.signer, this.creds, headerArgs, this.useServerTime ? await this.getServerTime() : undefined);
        return this.del(`${this.host}${endpoint}`, { headers });
    }
    async getMarketTradesEvents(conditionID) {
        return this.get(`${this.host}${GET_MARKET_TRADES_EVENTS}${conditionID}`);
    }
    canL1Auth() {
        if (this.signer === undefined) {
            throw L1_AUTH_UNAVAILABLE_ERROR;
        }
    }
    canL2Auth() {
        if (this.signer === undefined) {
            throw L1_AUTH_UNAVAILABLE_ERROR;
        }
        if (this.creds === undefined) {
            throw L2_AUTH_NOT_AVAILABLE;
        }
    }
    isBuilderOrder(builderCode) {
        return builderCode !== undefined && builderCode !== bytes32Zero;
    }
    async _ensureMarketInfoCached(tokenID) {
        if (tokenID in this.feeInfos)
            return;
        if (!(tokenID in this.tokenConditionMap)) {
            const result = await this.get(`${this.host}${GET_MARKET_BY_TOKEN}${tokenID}`);
            if (!result?.condition_id) {
                throw new Error(`failed to resolve condition id for token ${tokenID}`);
            }
            this.tokenConditionMap[tokenID] = result.condition_id;
        }
        await this.getClobMarketInfo(this.tokenConditionMap[tokenID]);
    }
    async ensureBuilderFeeRateCached(builderCode) {
        if (!builderCode || builderCode === bytes32Zero)
            return;
        if (builderCode in this.builderFeeRates)
            return;
        const result = await this.get(`${this.host}${GET_BUILDER_FEES}${builderCode}`);
        this.builderFeeRates[builderCode] = {
            maker: result.builder_maker_fee_rate_bps / BUILDER_FEES_BPS,
            taker: result.builder_taker_fee_rate_bps / BUILDER_FEES_BPS,
        };
    }
    async _resolveTickSize(tokenID, tickSize) {
        const minTickSize = await this.getTickSize(tokenID);
        if (tickSize) {
            if (isTickSizeSmaller(tickSize, minTickSize)) {
                throw new Error(`invalid tick size (${tickSize}), minimum for the market is ${minTickSize}`);
            }
        }
        else {
            tickSize = minTickSize;
        }
        return tickSize;
    }
    async _resolveFeeRateBps(tokenID, userFeeRateBps) {
        const marketFeeRateBps = await this.getFeeRateBps(tokenID);
        if (marketFeeRateBps > 0 &&
            userFeeRateBps !== undefined &&
            userFeeRateBps !== marketFeeRateBps) {
            throw new Error(`invalid user provided fee rate: ${userFeeRateBps}, fee rate for the market must be ${marketFeeRateBps}`);
        }
        return marketFeeRateBps;
    }
    async resolveVersion(forceUpdate = false) {
        // Use cached version if given
        if (!forceUpdate && this.cachedVersion !== undefined) {
            return this.cachedVersion;
        }
        // Query API and cache the result
        const apiVersion = await this.getVersion();
        this.cachedVersion = apiVersion;
        return apiVersion;
    }
    async _retryOnVersionUpdate(retryFunc) {
        const version = await this.resolveVersion();
        for (let attempt = 0; attempt < 2; attempt++) {
            await retryFunc();
            // no need to retry if version is unchanged
            if (version === (await this.resolveVersion()))
                break;
        }
    }
    _isOrderVersionMismatch(resp) {
        const error = resp?.error;
        if (!error)
            return false;
        const message = typeof error === "string" ? error : JSON.stringify(error);
        return message.includes(ORDER_VERSION_MISMATCH_ERROR);
    }
    throwIfError(result) {
        if (this.throwOnError && result && typeof result === "object" && "error" in result) {
            const msg = typeof result.error === "string" ? result.error : JSON.stringify(result.error);
            throw new ApiError(msg, result.status, result);
        }
        return result;
    }
    // http methods
    async get(endpoint, options, skipThrow = false) {
        const result = await get(endpoint, options);
        return skipThrow ? result : this.throwIfError(result);
    }
    async post(endpoint, options, skipThrow = false) {
        const result = await post(endpoint, options, this.retryOnError);
        return skipThrow ? result : this.throwIfError(result);
    }
    async del(endpoint, options, skipThrow = false) {
        const result = await del(endpoint, options);
        return skipThrow ? result : this.throwIfError(result);
    }
}
//# sourceMappingURL=client.js.map