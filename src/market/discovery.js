// Market Discovery - Fetch and track active 15-min crypto markets
// Required because WebSocket sends numeric Token IDs, not market names

import { MARKETS } from '../config.js';

class MarketDiscovery {
    constructor() {
        this.validTokens = new Map(); // tokenId -> market info
        this.lastRefresh = null;
        this.refreshInterval = 60000; // 1 minute
        this.isReady = false;
    }

    /**
     * Initialize market discovery - call on startup
     */
    async initialize() {
        console.log('🔍 Starting market discovery...');
        await this.refreshMarkets();

        // Start periodic refresh
        setInterval(() => this.refreshMarkets(), this.refreshInterval);

        this.isReady = true;
        console.log(`✅ Market discovery ready. Tracking ${this.validTokens.size} tokens`);
    }

    /**
     * Fetch active 15-min crypto markets from Polymarket API
     */
    async refreshMarkets() {
        try {
            const response = await fetch('https://clob.polymarket.com/sampling-markets');
            const data = await response.json();

            if (!data.data) {
                console.warn('⚠️ No market data received');
                return;
            }

            const newTokens = new Map();

            for (const market of data.data) {
                // Check if market matches our criteria
                if (!this.isTargetMarket(market)) continue;

                // Add all tokens from this market
                for (const token of market.tokens || []) {
                    if (token.token_id) {
                        newTokens.set(token.token_id, {
                            marketId: market.condition_id,
                            question: market.question,
                            outcome: token.outcome,
                            tokenId: token.token_id,
                            minOrderSize: market.minimum_order_size,
                            tickSize: market.minimum_tick_size
                        });
                    }
                }
            }

            this.validTokens = newTokens;
            this.lastRefresh = Date.now();

            if (newTokens.size > 0) {
                console.log(`📡 Refreshed markets: ${newTokens.size} valid tokens found`);
            }

        } catch (error) {
            console.error('❌ Market refresh failed:', error.message);
        }
    }

    /**
     * Check if market matches our 15-min crypto criteria
     * MANDATORY: BTC/ETH/SOL 15-minute binaries (DESCRIPTION.md L287-322)
     */
    isTargetMarket(market) {
        if (!market.question || !market.accepting_orders || !market.enable_order_book) {
            return false;
        }

        const question = market.question.toLowerCase();

        // Check for target assets (BTC, ETH, SOL)
        const hasTargetAsset = MARKETS.TARGET_ASSETS.some(asset =>
            question.includes(asset.toLowerCase()) ||
            question.includes('bitcoin') ||
            question.includes('ethereum') ||
            question.includes('solana')
        );

        // Check for 15-minute duration
        const is15Min = question.includes('15') &&
            (question.includes('min') || question.includes(':'));

        // Check for binary type (up/down)
        const isBinary = question.includes('up') || question.includes('down') ||
            (market.tokens?.length === 2);

        return hasTargetAsset && is15Min && isBinary;
    }

    /**
     * Check if a token ID is valid for trading
     * @param {string} tokenId - Token ID from WebSocket
     * @returns {boolean} True if valid 15-min crypto token
     */
    isValidToken(tokenId) {
        return this.validTokens.has(tokenId);
    }

    /**
     * Get market info for a token
     * @param {string} tokenId - Token ID
     * @returns {Object|null} Market info or null
     */
    getMarketInfo(tokenId) {
        return this.validTokens.get(tokenId) || null;
    }

    /**
     * Get all valid token IDs for WebSocket subscription
     * @returns {string[]} Array of token IDs
     */
    getTokenIds() {
        return Array.from(this.validTokens.keys());
    }

    /**
     * Get status summary
     */
    getStatus() {
        return {
            isReady: this.isReady,
            tokenCount: this.validTokens.size,
            lastRefresh: this.lastRefresh,
            tokens: Array.from(this.validTokens.values()).slice(0, 5) // First 5 for display
        };
    }
}

export default MarketDiscovery;
