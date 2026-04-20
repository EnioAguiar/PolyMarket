import pino from 'pino';
let logger;
export function initLogger(config) {
    const transport = config.logging.pretty
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined;
    logger = pino({
        level: config.logging.level || 'debug',
        transport,
        base: {
            service: 'polymarket-bot',
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    });
    return logger;
}
export function getLogger() {
    if (!logger) {
        throw new Error('Logger not initialized. Call initLogger(config) first.');
    }
    return logger;
}
// Structured log helpers for betting decisions
export function logBetDecision(decision) {
    getLogger().info({
        marketId: decision.marketId,
        odds: decision.odds,
        positionSize: decision.positionSize,
        dryRun: decision.dryRun,
        action: decision.action,
        safetyCheck: decision.safetyCheck,
        reason: decision.reason,
    }, `Bet decision: ${decision.action}`);
}
export function logSafetyCheck(result) {
    if (result.passed) {
        getLogger().debug({
            checkType: result.checkType,
            value: result.value,
            threshold: result.threshold,
        }, 'Safety check passed');
    }
    else {
        getLogger().warn({
            checkType: result.checkType,
            value: result.value,
            threshold: result.threshold,
        }, 'Safety check failed');
    }
}
//# sourceMappingURL=index.js.map