import pino from 'pino';

const logger = pino({ level: 'debug' });

export class MarketMutex {
  private locked: Set<string> = new Set();

  acquire(marketId: string): boolean {
    if (this.locked.has(marketId)) {
      logger.debug({ marketId }, 'MarketMutex: already locked');
      return false;
    }
    this.locked.add(marketId);
    logger.debug({ marketId }, 'MarketMutex: acquired');
    return true;
  }

  release(marketId: string): void {
    if (this.locked.has(marketId)) {
      this.locked.delete(marketId);
      logger.debug({ marketId }, 'MarketMutex: released');
    }
  }

  isLocked(marketId: string): boolean {
    return this.locked.has(marketId);
  }

  getLockedMarkets(): string[] {
    return [...this.locked];
  }

  getLockCount(): number {
    return this.locked.size;
  }

  clear(): void {
    this.locked.clear();
    logger.info({ msg: 'MarketMutex: cleared all locks' });
  }
}

export function createMarketMutex(): MarketMutex {
  return new MarketMutex();
}
