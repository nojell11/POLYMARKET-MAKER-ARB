// Market Discovery - Simplified WebSocket-based approach
// Skips REST API discovery - just track tokens seen via WebSocket

class MarketDiscovery {
    constructor() {
        this.validTokens = new Map(); // tokenId -> market info
        this.lastRefresh = null;
        this.isReady = true; // Always ready - tokens added dynamically
    }

    async initialize() {
        console.log('🔍 Market discovery initialized (WebSocket mode)');
        console.log('   Will discover tokens from incoming price updates');
        this.isReady = true;
    }

    /**
     * Add a token dynamically when seen from WebSocket
     */
    addToken(tokenId, marketInfo) {
        if (!this.validTokens.has(tokenId)) {
            this.validTokens.set(tokenId, {
                tokenId,
                ...marketInfo,
                discoveredAt: Date.now()
            });
            console.log(`📡 Discovered token: ${tokenId.slice(0, 10)}... [${marketInfo.outcome || 'Unknown'}]`);
        }
    }

    /**
     * Check if a token ID is valid for trading
     * In WebSocket mode, all tokens are valid until filtered by strategy
     */
    isValidToken(tokenId) {
        return true; // Accept all - filter at detection stage
    }

    /**
     * Get market info for a token
     */
    getMarketInfo(tokenId) {
        return this.validTokens.get(tokenId) || null;
    }

    /**
     * Get all valid token IDs
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
            tokens: Array.from(this.validTokens.values()).slice(0, 5)
        };
    }
}

export default MarketDiscovery;
