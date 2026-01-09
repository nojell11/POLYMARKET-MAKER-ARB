// Opportunity Detector - HOT PATH
// MANDATORY: DESCRIPTION.md L252-268, L484-489
// <10ms total processing, NO DB/IO operations

import { STRATEGY, MARKETS } from '../config.js';
import { EventEmitter } from 'events';

class OpportunityDetector extends EventEmitter {
    constructor() {
        super();
        this.opportunitiesDetected = 0;
        this.lastOpportunityTime = null;
    }

    /**
     * Detect arbitrage opportunity
     * CRITICAL: Must execute in <10ms (MANDATORY - L194-228)
     * 
     * @param {Object} priceUpdate - { marketId, downBid, upBid, timestamp }
     * @param {number} parseTime - Time taken to parse message (ms)
     */
    detectOpportunity(priceUpdate, parseTime = 0) {
        const startTime = performance.now();

        try {
            // Fast path - simple arithmetic only
            const { marketId, downBid, upBid, timestamp } = priceUpdate;

            // Validate inputs (fast type check only)
            if (typeof downBid !== 'number' || typeof upBid !== 'number') {
                return; // Exit fast
            }

            // CORE LOGIC: sum = DOWNbid + UPbid
            const sum = downBid + upBid;

            // TRIGGER: If sum <= 0.998 → IMMEDIATE order placement
            if (sum <= STRATEGY.OPPORTUNITY_THRESHOLD) {
                this.opportunitiesDetected++;
                this.lastOpportunityTime = Date.now();

                const detectionTime = performance.now() - startTime;
                const totalTime = parseTime + detectionTime;

                // Emit trigger event (non-blocking)
                // Order manager will handle order placement
                this.emit('opportunity_detected', {
                    marketId,
                    downBid,
                    upBid,
                    sum,
                    timestamp,
                    detectionTime,
                    totalTime
                });

                // Validate <10ms requirement
                if (totalTime > 10) {
                    this.emit('performance_warning', {
                        type: 'slow_detection',
                        time: totalTime,
                        threshold: 10
                    });
                }
            }

            // If sum >= 0.998, no action needed (no logging in hot path)

        } catch (error) {
            // Emit error but don't crash
            this.emit('detection_error', error);
        }
    }

    /**
     * Filter for 15-min binary markets only
     * MANDATORY: BTC/ETH/SOL 15-minute binaries (L287-322)
     * 
     * @param {string} marketId - Market identifier
     * @returns {boolean} True if valid market
     */
    isValidMarket(marketId) {
        // Fast string operations only
        // NOTE: Market ID format needs verification from Polymarket API
        // Assuming format like: "BTC-15min-binary" or similar

        if (!marketId || typeof marketId !== 'string') {
            return false;
        }

        // Check for target assets
        const hasTargetAsset = MARKETS.TARGET_ASSETS.some(asset =>
            marketId.toUpperCase().includes(asset)
        );

        // Check for 15-min duration
        const is15Min = marketId.includes('15min') || marketId.includes('15m');

        // Check for binary type
        const isBinary = marketId.includes('binary') ||
            marketId.includes('up-down') ||
            marketId.includes('UP') && marketId.includes('DOWN');

        return hasTargetAsset && is15Min && isBinary;
    }

    /**
     * Get detector statistics
     */
    getStats() {
        return {
            opportunitiesDetected: this.opportunitiesDetected,
            lastOpportunityTime: this.lastOpportunityTime
        };
    }

    /**
     * Reset statistics (for testing or new cycle)
     */
    resetStats() {
        this.opportunitiesDetected = 0;
        this.lastOpportunityTime = null;
    }
}

export default OpportunityDetector;
