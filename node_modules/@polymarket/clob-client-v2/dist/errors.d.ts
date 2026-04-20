export declare const L1_AUTH_UNAVAILABLE_ERROR: Error;
export declare const L2_AUTH_NOT_AVAILABLE: Error;
export declare class ApiError extends Error {
    readonly status?: number;
    readonly data?: unknown;
    constructor(message: string, status?: number, data?: unknown);
}
