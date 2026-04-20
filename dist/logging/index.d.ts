import pino from 'pino';
import type { Config } from '../types/index.js';
export declare function initLogger(config: Config): pino.Logger;
export declare function getLogger(): pino.Logger;
export declare function logBetDecision(decision: {
    marketId: string;
    odds: number;
    positionSize: number;
    dryRun: boolean;
    action: 'monitor' | 'analyze' | 'bet' | 'skip';
    safetyCheck: string;
    reason: string;
}): void;
export declare function logSafetyCheck(result: {
    passed: boolean;
    checkType: string;
    value?: number;
    threshold?: number;
}): void;
//# sourceMappingURL=index.d.ts.map