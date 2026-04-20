# Polymarket Bot Deployment

## Railway Setup

1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard:
   - `PRIVATE_KEY`: Your wallet private key
   - `FUNDER_ADDRESS`: Your wallet address
3. Deploy using the Railway template

## Local Development

1. Copy `.env.example` to `.env` and fill in values
2. Run `npm install`
3. Run `npm run dev`

## Production

The bot runs on Railway cron every 5 minutes:
- Service starts
- Executes one bot cycle (monitor → research → analyze → decide → execute)
- Exits cleanly
- Railway schedules next run

## Health Check

The `/health` endpoint returns 200 when:
- Config is loaded
- Logger is initialized
- Service is ready to process

## Dry Run Mode

Set `dryRun: true` in `config.yaml` to log decisions without executing trades.
