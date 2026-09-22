import https from 'node:https';

export interface GeoblockStatus {
  blocked: boolean;
  country: string;
  region: string;
  ip: string;
}

export function checkGeoblock(): Promise<GeoblockStatus> {
  return new Promise((resolve, reject) => {
    https
      .get('https://polymarket.com/api/geoblock', (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Geoblock check failed: HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}
