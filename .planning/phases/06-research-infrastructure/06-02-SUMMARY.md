---
phase: 06-research-infrastructure
plan: 02
subsystem: deployment
tags: [railway, volume, sqlite, persistence, docker]

# Dependency graph
requires:
  - phase: 06-01
    provides: Research source adapters
provides:
  - Persistent SQLite storage at /data via Railway volume
affects: [database]

# Tech tracking
tech-stack:
  added:
    - railway.json (volume config)
    - docker-compose.yml (local dev)
    - src/db/index.ts (updated path)
  patterns:
    - "Railway volume mounted at /data for SQLite persistence"
    - "Local docker-compose matches Railway volume behavior"

key-files:
  modified:
    - railway.json
    - src/db/index.ts
  created:
    - docker-compose.yml

key-decisions:
  - "Volume mount path: /data (matches Railway Metal volume)"
  - "Database path: /data/polymarket.db"
  - "DATA_DIR env var replaced with DB_PATH for clarity"
  - "docker-compose for local dev mirrors Railway volume"

patterns-established:
  - "Railway volume configuration in railway.json"
  - "Local volume for development parity"

requirements-completed:
  - DEPL-07

# Metrics
duration: ~30 minutes
completed: 2026-05-02
---

# Phase 06-02: Railway Volume Summary

**Railway volume configured for persistent SQLite storage**

## Accomplishments
- Railway volume mount at `/data` for SQLite persistence
- Database path updated to `/data/polymarket.db`
- docker-compose.yml for local development with volume parity

## Files Created/Modified
- `railway.json` — Added volumes configuration with mountPath: /data
- `src/db/index.ts` — Changed from `DATA_DIR` env to `DB_PATH` env, defaulting to `/data/polymarket.db`
- `docker-compose.yml` — Created for local dev with polymarket-data volume

## Key Implementation Details

### Railway Volume Configuration
```json
{
  "volumes": [
    {
      "mountPath": "/data",
      "name": "polymarket-data"
    }
  ]
}
```

### Database Path
```typescript
const DB_PATH = resolve(process.env.DB_PATH || '/data/polymarket.db');
```

### Local Development (docker-compose)
```yaml
services:
  bot:
    volumes:
      - polymarket-data:/data
volumes:
  polymarket-data:
```

## Success Criteria
- [x] Railway volume mounted at /data
- [x] SQLite database persists across deploys
- [x] Database path configurable via DB_PATH environment
- [x] docker-compose.yml for local development

---
*Phase: 06-02*
*Completed: 2026-05-02*
