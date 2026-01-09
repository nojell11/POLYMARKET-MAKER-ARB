// WebSocket Monitor - CRITICAL PATH #1
// MANDATORY: DESCRIPTION.md L100-127, L478-483
// NO console.log in message loop (hot path)

import WebSocket from 'ws';
import { WEBSOCKET } from '../config.js';
import { EventEmitter } from 'events';

class WebSocketMonitor extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.connectionAttempts = 0;
        this.disconnectCount = 0;
        this.lastDisconnectTime = null;
        this.isConnected = false;
        this.uptimeStart = Date.now();
    }

    /**
     * Connect to Polymarket WebSocket
     * MANDATORY: wss://ws-subscriptions-clob.polymarket.com/ws/market
     */
    connect() {
        try {
            this.ws = new WebSocket(WEBSOCKET.ENDPOINT);

            this.ws.on('open', () => {
                this.isConnected = true;
                this.connectionAttempts = 0;
                this.emit('connected');
                // Only log on connection, not in message loop
                console.log('✅ WebSocket connected to Polymarket');
            });

            this.ws.on('message', (data) => {
                // HOT PATH - NO LOGGING HERE
                // Parse and forward immediately (<1ms target)
                const startTime = performance.now();

                try {
                    const update = JSON.parse(data);

                    // Extract price data
                    // NOTE: Format needs verification from actual WebSocket messages
                    // Assuming structure: { market_id, down_bid, up_bid, ... }
                    const priceUpdate = this.parseMessage(update);

                    if (priceUpdate) {
                        const parseTime = performance.now() - startTime;
                        this.emit('price_update', priceUpdate, parseTime);
                    }
                } catch (error) {
                    // Emit error but don't log in hot path
                    this.emit('parse_error', error);
                }
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                this.disconnectCount++;
                this.lastDisconnectTime = Date.now();

                // Log disconnect (outside hot path)
                console.log('⚠️ WebSocket disconnected. Reconnecting in 2s...');
                this.emit('disconnected', this.disconnectCount);

                // Auto-reconnect within 2 seconds (MANDATORY)
                setTimeout(() => {
                    this.connect();
                }, WEBSOCKET.AUTO_RECONNECT_DELAY);
            });

            this.ws.on('error', (error) => {
                // Don't crash on errors (MANDATORY - L325-368)
                console.error('⚠️ WebSocket error:', error.message);
                this.emit('error', error);
            });

        } catch (error) {
            console.error('❌ Failed to create WebSocket connection:', error.message);
            this.emit('connection_failed', error);

            // Retry connection
            setTimeout(() => {
                this.connect();
            }, WEBSOCKET.AUTO_RECONNECT_DELAY);
        }
    }

    /**
     * Parse WebSocket message
     * CRITICAL: Must be <1ms for hot path compliance
     * 
     * @param {Object} message - Raw WebSocket message
     * @returns {Object|null} Parsed price update or null
     */
    parseMessage(message) {
        // Fast path - simple object access only
        // NO complex calculations or I/O

        // Polymarket WebSocket message formats:
        // 1. Order book: { event: 'book', asset_id: '1234...', bids: [...], asks: [...] }
        // 2. Price change: { event: 'price_change', asset_id: '1234...', price: 0.50 }
        // 3. Trade: { event: 'last_trade_price', asset_id: '1234...', price: 0.50 }

        if (!message || typeof message !== 'object') {
            return null;
        }

        // Extract token/asset ID (critical for market filtering)
        const tokenId = message.asset_id || message.token_id || message.tokenId;

        if (!tokenId) {
            return null;
        }

        // Handle order book updates (has bids/asks)
        if (message.bids && message.asks) {
            // Extract best bid prices for DOWN and UP
            // Note: For binary markets, we need both token order books
            // This simplified version uses single token data
            const bestBid = message.bids[0]?.price ? parseFloat(message.bids[0].price) : null;
            const bestAsk = message.asks[0]?.price ? parseFloat(message.asks[0].price) : null;

            if (bestBid !== null) {
                return {
                    tokenId,
                    marketId: message.market || tokenId,
                    downBid: bestBid,  // For full impl, fetch paired token
                    upBid: bestAsk ? 1 - bestBid : null,
                    timestamp: message.timestamp || Date.now()
                };
            }
        }

        // Handle price change events
        if (message.event === 'price_change' && message.price !== undefined) {
            return {
                tokenId,
                marketId: message.market || tokenId,
                downBid: parseFloat(message.price),
                upBid: 1 - parseFloat(message.price),
                timestamp: message.timestamp || Date.now()
            };
        }

        return null;
    }

    /**
     * Subscribe to specific markets (15-min BTC/ETH/SOL binaries)
     * @param {Array<string>} marketIds - Market IDs to subscribe to
     */
    subscribeToMarkets(marketIds) {
        if (!this.isConnected || !this.ws) {
            console.warn('⚠️ Cannot subscribe: WebSocket not connected');
            return;
        }

        // Send subscription message
        // NOTE: Format needs verification from Polymarket WebSocket docs
        const subscribeMessage = {
            action: 'subscribe',
            markets: marketIds
        };

        this.ws.send(JSON.stringify(subscribeMessage));
        console.log(`📡 Subscribed to ${marketIds.length} markets`);
    }

    /**
     * Get uptime percentage
     * Target: 99.9% (MANDATORY - L522)
     */
    getUptime() {
        const totalTime = Date.now() - this.uptimeStart;
        // Estimate downtime from disconnect events (assuming 2s per disconnect)
        const estimatedDowntime = this.disconnectCount * WEBSOCKET.AUTO_RECONNECT_DELAY;
        const uptime = ((totalTime - estimatedDowntime) / totalTime) * 100;
        return uptime;
    }

    /**
     * Get connection stats
     */
    getStats() {
        return {
            isConnected: this.isConnected,
            disconnectCount: this.disconnectCount,
            uptime: this.getUptime(),
            lastDisconnect: this.lastDisconnectTime
        };
    }

    /**
     * Close WebSocket connection
     */
    close() {
        if (this.ws) {
            this.ws.close();
            this.isConnected = false;
        }
    }
}

export default WebSocketMonitor;
