import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { Config } from '../types/index.js';

export function loadConfig(): Config {
  const configPath = './config.yaml';
  const fileContents = readFileSync(configPath, 'utf8');
  const config = parse(fileContents) as Config;
  
  // Validate required fields
  if (config.dryRun === undefined) {
    throw new Error('config.yaml must contain "dryRun" field');
  }
  if (!config.safety?.maxPositionSizePct) {
    throw new Error('config.yaml must contain "safety.maxPositionSizePct"');
  }
  
  return config;
}

export function isDryRun(config: Config): boolean {
  return config.dryRun === true;
}
