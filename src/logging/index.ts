import pino from 'pino';
import type { Config } from '../types/index.js';

let logger: pino.Logger;

export function initLogger(config: Config): pino.Logger {
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

export function getLogger(): pino.Logger {
  if (!logger) {
    throw new Error('Logger not initialized. Call initLogger(config) first.');
  }
  return logger;
}

// Structured log helpers for betting decisions
export function logBetDecision(decision: {
  marketId: string;
  odds: number;
  positionSize: number;
  dryRun: boolean;
  action: 'monitor' | 'analyze' | 'bet' | 'skip';
  safetyCheck: string;
  reason: string;
}): void {
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

export function logSafetyCheck(result: {
  passed: boolean;
  checkType: string;
  value?: number;
  threshold?: number;
}): void {
  if (result.passed) {
    getLogger().debug({
      checkType: result.checkType,
      value: result.value,
      threshold: result.threshold,
    }, 'Safety check passed');
  } else {
    getLogger().warn({
      checkType: result.checkType,
      value: result.value,
      threshold: result.threshold,
    }, 'Safety check failed');
  }
}
