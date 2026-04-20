import WebSocket from 'ws';
import { SourceCategory } from '../types/source.js';
import type { ResearchSource, ResearchSignal } from './interface.js';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

export class BinanceAdapter implements ResearchSource {
  id = 'binance';
  name = 'Binance WebSocket';
  category = SourceCategory.CRYPTO;
  rating = 4 as const;  // Default high rating for real-time data
  
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  
  async fetch(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal> {
    const symbol = this.topicToSymbol(topic);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.closeWs();
        reject(new Error('Binance WebSocket timeout'));
      }, 5000);
      
      try {
        this.ws = new WebSocket(`${BINANCE_WS_URL}/${symbol}@ticker`);
        
        this.ws.on('message', (data: Buffer) => {
          clearTimeout(timeout);
          this.closeWs();
          
          const parsed = JSON.parse(data.toString());
          const signal = {
            symbol: parsed.s,
            price: parsed.c,
            volume: parsed.v,
            priceChange: parsed.p,
            priceChangePercent: parsed.P,
            high24h: parsed.h,
            low24h: parsed.l,
            timestamp: parsed.E,
          };
          
          resolve({
            sourceId: this.id,
            category: this.category,
            signal,
            confidence: this.calculateConfidence(parsed),
            timestamp: new Date(),
            recency: 1.0,  // Real-time = fresh
            metadata: { symbol },
          });
        });
        
        this.ws.on('error', (err) => {
          clearTimeout(timeout);
          this.closeWs();
          reject(err);
        });
      } catch (err) {
        clearTimeout(timeout);
        this.closeWs();
        reject(err);
      }
    });
  }
  
  isAvailable(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }
  
  private closeWs(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  private topicToSymbol(topic: string): string {
    // Convert topic to Binance symbol format
    // e.g., "Bitcoin" -> "btcusdt"
    const mapping: Record<string, string> = {
      'bitcoin': 'btcusdt',
      'btc': 'btcusdt',
      'ethereum': 'ethusdt',
      'eth': 'ethusdt',
      'solana': 'solusdt',
      'sol': 'solusdt',
    };
    
    const lower = topic.toLowerCase();
    return mapping[lower] || 'btcusdt';
  }
  
  private calculateConfidence(data: Record<string, unknown>): number {
    // Higher confidence for:
    // - High volume
    // - Significant price movement
    // - Good data quality
    
    let confidence = 0.7;  // Base
    
    const volume = parseFloat(data.v as string || '0');
    if (volume > 1000) confidence += 0.1;
    
    const priceChangePercent = parseFloat(data.P as string || '0');
    if (Math.abs(priceChangePercent) > 1) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
}
