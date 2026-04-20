import http from 'http';
import { loadConfig } from './config/index.js';
import { initLogger, getLogger } from './logging/index.js';
import { runBotCycle } from './main.js';

let isHealthy = false;

function healthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: isHealthy ? 'healthy' : 'initializing',
      timestamp: new Date().toISOString(),
      service: 'polymarket-bot',
    }));
    return;
  }
  
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

function startServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer(healthCheck);
    const port = process.env.PORT || 3000;
    
    server.listen(port, () => {
      getLogger().info({ port, msg: 'Health check server started' });
      isHealthy = true;
      resolve(server);
    });
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  initLogger(config);
  const logger = getLogger();
  
  logger.info({ 
    dryRun: config.dryRun,
    msg: 'Polymarket Bot starting',
  });
  
  try {
    await startServer();
    await runBotCycle();
    
    logger.info({ msg: 'Bot cycle complete, exiting' });
    isHealthy = false;
    process.exit(0);
  } catch (error) {
    logger.error({ error, msg: 'Fatal error in bot cycle' });
    isHealthy = false;
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

export { main, healthCheck, startServer };
