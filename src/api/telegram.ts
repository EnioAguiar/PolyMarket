import { Telegraf } from 'telegraf';
import pino from 'pino';

const logger = pino({ level: 'info' });

let bot: Telegraf | null = null;
let isPaused = false;
let cycleManagerRef: any = null;
let safetyModuleRef: any = null;
let bankrollRef: any = null;

export interface TelegramConfig {
  botToken: string;
  chatId?: string;
}

export function initTelegram(config: TelegramConfig): Telegraf | null {
  if (!config.botToken) {
    logger.warn({ msg: 'TELEGRAM_BOT_TOKEN not set, Telegram disabled' });
    return null;
  }

  bot = new Telegraf(config.botToken);

  bot.start((ctx) => {
    ctx.reply(
      '🤖 Polymarket Bot\n\n' +
      'Available commands:\n' +
      '/status - Bot status overview\n' +
      '/cycle - Detailed cycle info\n' +
      '/pause - Pause betting\n' +
      '/resume - Resume betting\n' +
      '/bankroll - Bankroll state'
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      'Commands:\n' +
      '/status - Quick overview\n' +
      '/cycle - Detailed cycle\n' +
      '/pause - Stop betting\n' +
      '/resume - Allow betting\n' +
      '/bankroll - Bankroll info'
    );
  });

  bot.command('status', async (ctx) => {
    try {
      const status = getBotStatus();
      ctx.reply(formatStatusMessage(status));
    } catch (error) {
      logger.error({ error }, 'Error in /status command');
      ctx.reply('Error getting status');
    }
  });

  bot.command('cycle', async (ctx) => {
    try {
      const cycle = getCycleStatus();
      ctx.reply(formatCycleMessage(cycle));
    } catch (error) {
      logger.error({ error }, 'Error in /cycle command');
      ctx.reply('Error getting cycle info');
    }
  });

  bot.command('pause', (ctx) => {
    isPaused = true;
    if (safetyModuleRef) {
      safetyModuleRef.forceKillSwitch(true);
    }
    logger.info({ msg: 'Bot paused via Telegram' });
    ctx.reply('⏸️ Bot paused. Use /resume to continue.');
  });

  bot.command('resume', (ctx) => {
    isPaused = false;
    if (safetyModuleRef) {
      safetyModuleRef.forceKillSwitch(false);
    }
    logger.info({ msg: 'Bot resumed via Telegram' });
    ctx.reply('▶️ Bot resumed.');
  });

  bot.command('bankroll', async (ctx) => {
    try {
      const bankroll = getBankrollStatus();
      ctx.reply(formatBankrollMessage(bankroll));
    } catch (error) {
      logger.error({ error }, 'Error in /bankroll command');
      ctx.reply('Error getting bankroll info');
    }
  });

  bot.launch().then(() => {
    logger.info({ msg: 'Telegram bot started' });
  });

  process.once('SIGINT', () => bot?.stop('SIGINT'));
  process.once('SIGTERM', () => bot?.stop('SIGTERM'));

  return bot;
}

export function isBotPaused(): boolean {
  return isPaused;
}

export function setCycleManager(cm: any): void {
  cycleManagerRef = cm;
}

export function setSafetyModule(sm: any): void {
  safetyModuleRef = sm;
}

export function setBankroll(b: any): void {
  bankrollRef = b;
}

function getBotStatus(): any {
  const cycleStats = cycleManagerRef?.getStats?.() || {};
  const safetyState = safetyModuleRef?.getState?.() || {};
  return {
    cycleStatus: cycleStats.status || 'unknown',
    paused: isPaused,
    betsInCycle: cycleStats.betsTotal || 0,
    maxBets: cycleStats.maxBets || 3,
    pendingBets: cycleStats.betsPending || 0,
    totalPnl: safetyState.totalPnl || 0,
    wsConnected: true,
  };
}

function getCycleStatus(): any {
  const stats = cycleManagerRef?.getStats?.() || {};
  return {
    status: stats.status || 'unknown',
    betsTotal: stats.betsTotal || 0,
    betsPending: stats.betsPending || 0,
    betsResolved: stats.betsResolved || 0,
    openedAt: stats.openedAt || 'N/A',
    timeInCycle: stats.timeInCycle || 'N/A',
  };
}

function getBankrollStatus(): any {
  if (bankrollRef) {
    return bankrollRef;
  }
  const safetyState = safetyModuleRef?.getState?.() || {};
  return {
    current: safetyState.currentBankroll || 1000,
    initial: safetyState.initialBankroll || 1000,
    pnl: safetyState.totalPnl || 0,
    roi: safetyState.roi || 0,
  };
}

function formatStatusMessage(status: any): string {
  return (
    `📊 Bot Status\n\n` +
    `State: ${status.cycleStatus || 'unknown'}\n` +
    `Paused: ${status.paused ? 'YES ⏸️' : 'NO ▶️'}\n` +
    `Bets in cycle: ${status.betsInCycle || 0}/${status.maxBets || 3}\n` +
    `Open positions: ${status.pendingBets || 0}\n` +
    `Total P&L: ${status.totalPnl || 0}\n` +
    `WS Connected: ${status.wsConnected ? '✅' : '❌'}`
  );
}

function formatCycleMessage(cycle: any): string {
  return (
    `🔄 Cycle Status\n\n` +
    `Status: ${cycle.status || 'unknown'}\n` +
    `Bets: ${cycle.betsTotal || 0} total\n` +
    `Pending: ${cycle.betsPending || 0}\n` +
    `Resolved: ${cycle.betsResolved || 0}\n` +
    `Opened: ${cycle.openedAt || 'N/A'}\n` +
    `Time in cycle: ${cycle.timeInCycle || 'N/A'}`
  );
}

function formatBankrollMessage(bankroll: any): string {
  return (
    `💰 Bankroll\n\n` +
    `Current: ${bankroll.current || 0}\n` +
    `Initial: ${bankroll.initial || 0}\n` +
    `P&L: ${bankroll.pnl || 0}\n` +
    `ROI: ${bankroll.roi || 0}%`
  );
}

export function stopTelegram(): void {
  bot?.stop('SIGINT');
  bot = null;
}
