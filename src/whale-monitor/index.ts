// Live monitor for the "fresh/dormant whale" signal (see
// src/research/whale-signal.ts for the full methodology and its doc
// comment). Runs as its own long-lived Railway service, independent of the
// trading bot and independent of any local machine staying on.
//
// What it does:
// 1. Polls the global large-trades feed (>= $20k, matching the validated
//    backtest threshold) every ~20s, classifies each wallet as
//    fresh/dormant or established at the moment of that exact trade, and
//    persists EVERY qualifying trade (both groups -- the control
//    comparison only stays meaningful if the established-wallet group
//    keeps accumulating too, review finding 2026-09-22).
// 2. Every ~15 minutes, re-checks all not-yet-resolved stored trades
//    against Gamma; any whose market has now closed to a clean 0/1 winner
//    gets its outcome and P&L backfilled.
// 3. Serves a minimal HTTP endpoint to download the accumulated SQLite
//    file and a JSON summary, so the data survives and is retrievable
//    without needing this process's own machine to stay reachable.
//
// This process places no bets and is not wired into the trading bot's
// decision path -- data collection only, per the project's standing rule
// that research signals stay disconnected from real trading until
// explicitly decided otherwise.

import http from 'node:http';
import { createReadStream, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { sql, eq } from 'drizzle-orm';
import { getDb, DB_PATH } from '../db/index.js';
import { whaleBets } from '../db/schema.js';
import {
  fetchLargeTrades,
  classifyWallet,
  fetchOutcomesByCondition,
  scoreBet,
  type RawTrade,
} from '../research/whale-signal.js';

const MIN_BET_USD = Number(process.env.MIN_BET_USD) || 20000;
const POLL_INTERVAL_MS = 20_000;
const RESOLUTION_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const PORT = Number(process.env.PORT) || 8080;

const db = getDb();

function ensureSchema(): void {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS whale_bets (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      condition_id TEXT NOT NULL,
      token_id TEXT NOT NULL,
      event_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      outcome_index INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      shares REAL NOT NULL,
      usd_staked REAL NOT NULL,
      avg_price REAL NOT NULL,
      trades_before INTEGER NOT NULL,
      gap_days REAL,
      is_fresh_or_dormant INTEGER NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolved_at INTEGER,
      won INTEGER,
      pnl REAL,
      created_at TEXT NOT NULL
    )
  `);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_whale_bets_resolved ON whale_bets(resolved)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_whale_bets_condition ON whale_bets(condition_id)`);
}

let lastSeenTimestamp = 0;

async function primeLastSeenTimestamp(): Promise<void> {
  const row = db.get<{ maxTs: number | null }>(sql`SELECT MAX(timestamp) as maxTs FROM whale_bets`);
  lastSeenTimestamp = row?.maxTs ?? Math.floor(Date.now() / 1000) - 300; // fresh start: look back 5 min
  console.log(`[monitor] Resuming from timestamp ${lastSeenTimestamp} (${new Date(lastSeenTimestamp * 1000).toISOString()})`);
}

const MAX_CATCHUP_PAGES = 50; // bounds worst-case work after a very long outage

async function ingestOnce(): Promise<void> {
  // Paginate back until reaching lastSeenTimestamp, not a fixed page count
  // -- review finding, 2026-09-22: a hardcoded single page would silently
  // lose any trade older than that page's oldest entry after a real
  // outage/redeploy longer than that page's time span covers, which is
  // exactly the failure mode this collector exists to avoid.
  const batch = await fetchLargeTrades(MIN_BET_USD, MAX_CATCHUP_PAGES, lastSeenTimestamp);
  const fresh = batch.filter((t) => t.timestamp > lastSeenTimestamp);
  if (fresh.length === 0) return;

  let maxTs = lastSeenTimestamp;
  // Oldest-first so a mid-batch failure still advances lastSeenTimestamp
  // correctly for what did succeed, rather than skipping ahead past a
  // trade that never got persisted.
  for (const [i, trade] of [...fresh].sort((a, b) => a.timestamp - b.timestamp).entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    try {
      await persistTrade(trade);
      maxTs = Math.max(maxTs, trade.timestamp);
    } catch (error) {
      console.error(`[monitor] Failed to persist trade ${trade.proxy_wallet.slice(0, 10)}: ${error}`);
      break;
    }
  }
  lastSeenTimestamp = maxTs;
}

async function persistTrade(trade: RawTrade): Promise<void> {
  const id = `${trade.proxy_wallet}:${trade.condition_id}:${trade.timestamp}`;
  const profile = await classifyWallet(trade.proxy_wallet, trade.timestamp);
  db.insert(whaleBets)
    .values({
      id,
      wallet: trade.proxy_wallet,
      conditionId: trade.condition_id,
      tokenId: trade.token_id,
      eventSlug: trade.event_slug,
      title: trade.title,
      outcomeIndex: trade.outcome_index,
      timestamp: trade.timestamp,
      shares: trade.size,
      usdStaked: trade.size * trade.price,
      avgPrice: trade.price,
      tradesBefore: profile.tradesBefore,
      gapDays: profile.gapDays,
      isFreshOrDormant: profile.isFreshOrDormant,
      resolved: false,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .run();
  console.log(
    `[monitor] ${profile.isFreshOrDormant ? 'FRESH/DORMANT' : 'control'} "${trade.title.slice(0, 50)}" wallet=${trade.proxy_wallet.slice(0, 10)} staked=$${(trade.size * trade.price).toFixed(0)} price=${trade.price.toFixed(2)}`
  );
}

async function backfillResolutions(): Promise<void> {
  const pending = db.select().from(whaleBets).where(eq(whaleBets.resolved, false)).all();
  if (pending.length === 0) return;
  console.log(`[monitor] Checking ${pending.length} pending bets for resolution...`);

  const uniqueConditions = [...new Set(pending.map((b) => b.conditionId))];
  const outcomes = await fetchOutcomesByCondition(uniqueConditions);

  let resolvedCount = 0;
  for (const bet of pending) {
    const outcome = outcomes.get(bet.conditionId);
    const result = scoreBet(
      { outcomeIndex: bet.outcomeIndex, avgPrice: bet.avgPrice, shares: bet.shares } as never,
      outcome
    );
    if (!result) continue;
    db.update(whaleBets)
      .set({
        resolved: true,
        resolvedAt: Math.floor(Date.now() / 1000),
        won: result.won,
        pnl: result.pnl,
      })
      .where(eq(whaleBets.id, bet.id))
      .run();
    resolvedCount++;
  }
  console.log(`[monitor] Resolved ${resolvedCount}/${pending.length} pending bets this cycle.`);
}

function computeStats() {
  const groups = db.select().from(whaleBets).where(eq(whaleBets.resolved, true)).all();
  function summarize(items: typeof groups) {
    const staked = items.reduce((s, b) => s + b.usdStaked, 0);
    const pnl = items.reduce((s, b) => s + (b.pnl ?? 0), 0);
    return { n: items.length, staked, pnl, roiPct: staked > 0 ? (pnl / staked) * 100 : null };
  }
  const freshDormant = groups.filter((b) => b.isFreshOrDormant);
  const control = groups.filter((b) => !b.isFreshOrDormant);
  const totalStored = db.select({ count: sql<number>`count(*)` }).from(whaleBets).get();
  const pendingCount = db.select({ count: sql<number>`count(*)` }).from(whaleBets).where(eq(whaleBets.resolved, false)).get();
  return {
    totalStored: totalStored?.count ?? 0,
    pending: pendingCount?.count ?? 0,
    freshDormant: summarize(freshDormant),
    control: summarize(control),
  };
}

// Optional simple token gate for /stats and /download -- review nit,
// 2026-09-22: these would otherwise be public on the Railway-assigned URL
// with no auth. The underlying data is public on-chain fact either way,
// but an unguarded endpoint invites a scanner/bot hammering the .db
// download repeatedly and burning paid bandwidth for no reason. Opt-in:
// unset MONITOR_TOKEN behaves exactly as before (open), matching how this
// was first deployed and verified locally.
const monitorToken = process.env.MONITOR_TOKEN;
function isAuthorized(req: http.IncomingMessage): boolean {
  if (!monitorToken) return true;
  const url = new URL(req.url ?? '/', 'http://localhost');
  return url.searchParams.get('token') === monitorToken;
}

function startServer(): void {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', lastSeenTimestamp }));
      return;
    }
    if (!isAuthorized(req)) {
      res.writeHead(401);
      res.end('Unauthorized. Pass ?token=<MONITOR_TOKEN>.');
      return;
    }
    if (req.url?.startsWith('/stats')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(computeStats(), null, 2));
      return;
    }
    if (req.url?.startsWith('/download')) {
      const dbFilePath = resolve(DB_PATH);
      if (!existsSync(dbFilePath)) {
        res.writeHead(404);
        res.end('Database file not found');
        return;
      }
      // Stream a consistent snapshot, not the live file -- review finding,
      // 2026-09-22: the ingest loop writes to this file every ~20s, so a
      // byte-for-byte stream of the live file mid-write could be served
      // corrupted/inconsistent to a downloader. VACUUM INTO produces a
      // complete, consistent copy in one call; the target must not already
      // exist, so clear any leftover snapshot from a prior request first.
      const snapshotPath = `${dbFilePath}.snapshot`;
      if (existsSync(snapshotPath)) unlinkSync(snapshotPath);
      try {
        db.run(sql.raw(`VACUUM INTO '${snapshotPath}'`));
      } catch (error) {
        console.error('[monitor] Snapshot for /download failed:', error);
        res.writeHead(500);
        res.end('Failed to prepare a consistent snapshot');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="whale-monitor.db"',
      });
      const stream = createReadStream(snapshotPath);
      stream.pipe(res);
      stream.on('close', () => {
        if (existsSync(snapshotPath)) unlinkSync(snapshotPath);
      });
      return;
    }
    res.writeHead(404);
    res.end('Not found. Try /health, /stats, or /download.');
  });
  server.listen(PORT, () => {
    console.log(`[monitor] HTTP server listening on port ${PORT} (/health, /stats, /download)`);
  });
}

async function main(): Promise<void> {
  ensureSchema();
  await primeLastSeenTimestamp();
  startServer();

  setInterval(() => {
    ingestOnce().catch((error) => console.error('[monitor] Ingest cycle failed:', error));
  }, POLL_INTERVAL_MS);

  setInterval(() => {
    backfillResolutions().catch((error) => console.error('[monitor] Resolution backfill failed:', error));
  }, RESOLUTION_CHECK_INTERVAL_MS);

  // Run both once immediately on startup rather than waiting a full interval.
  await ingestOnce().catch((error) => console.error('[monitor] Initial ingest failed:', error));
  await backfillResolutions().catch((error) => console.error('[monitor] Initial backfill failed:', error));

  console.log('[monitor] Whale signal monitor started.');
}

main().catch((error) => {
  console.error('[monitor] Fatal error:', error);
  process.exit(1);
});
