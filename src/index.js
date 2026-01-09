// Main Orchestrator - Polymarket Arbitrage Bot
// Coordinates all modules: WebSocket → Detector → Orders → Metrics

import 'dotenv/config';  // Load .env file
import WebSocketMonitor from './websocket/monitor.js';
import OpportunityDetector from './detector/opportunity.js';
import OrderManager from './orders/manager.js';
import MetricsLogger from './metrics/logger.js';
import MarketDiscovery from './market/discovery.js';
import { checkLicense } from './license.js';

// Check license before anything else
checkLicense(process.env.LICENSE_KEY);

class PolymarketArbBot {
    constructor() {
        // Initialize modules
        this.wsMonitor = new WebSocketMonitor();
        this.detector = new OpportunityDetector();
        this.orderManager = new OrderManager();
        this.metrics = new MetricsLogger();
        this.marketDiscovery = new MarketDiscovery();

        this.isRunning = false;

        // Wire up event handlers
        this.setupEventHandlers();
    }

    /**
     * Setup event handlers between modules
     */
    setupEventHandlers() {
        // WebSocket → Detector (with market filtering)
        this.wsMonitor.on('price_update', (priceUpdate, parseTime) => {
            // CRITICAL: Only process valid 15-min crypto tokens
            if (!this.marketDiscovery.isValidToken(priceUpdate.tokenId)) {
                return; // Skip non-target markets (hot path exit)
            }
            // Forward to detector (hot path)
            this.detector.detectOpportunity(priceUpdate, parseTime);
        });

        // WebSocket events
        this.wsMonitor.on('connected', () => {
            console.log('🟢 Bot connected to Polymarket WebSocket');
        });

        this.wsMonitor.on('disconnected', (count) => {
            this.metrics.logWebSocketDisconnect();
        });

        this.wsMonitor.on('error', (error) => {
            console.error('WebSocket error:', error.message);
        });

        // Detector → Order Manager
        this.detector.on('opportunity_detected', async (opportunity) => {
            // Log opportunity
            this.metrics.logOpportunityDetected();
            this.metrics.logExecutionTime(opportunity.totalTime);

            // Trigger order placement
            await this.orderManager.placeOrders(opportunity);
        });

        // Detector performance warnings
        this.detector.on('performance_warning', (warning) => {
            console.warn(`⚠️ Performance: ${warning.type} took ${warning.time}ms (threshold: ${warning.threshold}ms)`);
        });

        // Order Manager → Metrics
        this.orderManager.on('orders_placed', (result) => {
            this.metrics.logOrdersPlaced(result.successful);
            this.metrics.logExecutionTime(result.placementTime);

            console.log(`📝 Placed ${result.successful}/${result.orders.length} orders in ${result.placementTime.toFixed(2)}ms`);
        });

        this.orderManager.on('order_filled', (data) => {
            this.metrics.logOrderFilled(data);
        });

        this.orderManager.on('order_skipped', (data) => {
            console.log(`⏭️ Order skipped: ${data.reason}`);
        });

        this.orderManager.on('rate_limited', (data) => {
            console.warn(`⚠️ Rate limited (attempt ${data.attempt}), backing off ${data.backoffTime}ms`);
        });

        // Metrics alerts
        this.metrics.on('alert', (alert) => {
            console.error(`🚨 ALERT: ${alert.type} - ${alert.message}`);
        });
    }

    /**
     * Start the bot
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ Bot already running');
            return;
        }

        console.log('🚀 Starting Polymarket Arbitrage Bot...');
        console.log('');
        console.log('Configuration:');
        console.log('  - WebSocket: wss://ws-subscriptions-clob.polymarket.com/ws/market');
        console.log('  - Trigger: sum < 0.998');
        console.log('  - Orders: 4x limit (6 shares each)');
        console.log('  - Capital: $18 per cycle');
        console.log('  - Target: 80-85% capture rate');
        console.log('');

        // Initialize market discovery first (CRITICAL for filtering)
        await this.marketDiscovery.initialize();

        // Connect to WebSocket
        this.wsMonitor.connect();

        this.isRunning = true;

        console.log('✅ Bot started successfully');
        console.log('📊 Monitoring for opportunities...\n');
    }

    /**
     * Stop the bot
     */
    stop() {
        console.log('\n🛑 Stopping bot...');

        this.wsMonitor.close();
        this.isRunning = false;

        console.log('✅ Bot stopped');
    }

    /**
     * Get bot status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            websocket: this.wsMonitor.getStats(),
            detector: this.detector.getStats(),
            orders: this.orderManager.getStats(),
            metrics: this.metrics.getMetrics(),
            markets: this.marketDiscovery.getStatus()
        };
    }
}

// Run bot if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    const bot = new PolymarketArbBot();

    // Start bot
    bot.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        bot.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        bot.stop();
        process.exit(0);
    });
}

export default PolymarketArbBot;
