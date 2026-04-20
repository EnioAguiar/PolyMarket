import { readFileSync } from 'fs';
import { parse } from 'yaml';
export function loadConfig() {
    const configPath = './config.yaml';
    const fileContents = readFileSync(configPath, 'utf8');
    const config = parse(fileContents);
    // Validate required fields
    if (config.dryRun === undefined) {
        throw new Error('config.yaml must contain "dryRun" field');
    }
    if (!config.safety?.maxPositionSizePct) {
        throw new Error('config.yaml must contain "safety.maxPositionSizePct"');
    }
    return config;
}
export function isDryRun(config) {
    return config.dryRun === true;
}
//# sourceMappingURL=index.js.map