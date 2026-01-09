// Metrics Logger & Alerts
// MANDATORY: DESCRIPTION.md L372-407, L502-507
// Track 8 KPIs, 15-min reports, alerts for capture<75% and WS issues

import { METRICS } from '../config.js';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';

class MetricsLogger extends EventEmitter {
    constructor() {
        super();

        // Core metrics (MANDATORY - L372-407)
        this.metrics = {
            opportunitiesDetected: 0,
            ordersPlaced: 0,
            ordersFilled: 0,
            bothSidesFilled: 0,
            oneSideFilled: 0,
            totalProfit: 0,
            avgExecutionTime: 0,
            captureRate: 0,

            // Additional tracking
            executionTimes: [],
            wsDisconnects: 0,
            wsDisconnectTimes: [],
            cycleStartTime: Date.now(),
            lastReportTime: Date.now()
        };

        // Start 15-minute reporting interval
        this.startReporting();
    }

    /**
     * Log opportunity detected
     */
    logOpportunityDetected() {
        this.metrics.opportunitiesDetected++;
        this.updateCaptureRate();
    }

    /**
     * Log orders placed
     * @param {number} count - Number of orders placed
     */
    logOrdersPlaced(count) {
        this.metrics.ordersPlaced += count;
        this.updateCaptureRate();
    }

    /**
     * Log order filled
     * @param {Object} fillData - { marketId, side, shares, price }
     */
    logOrderFilled(fillData) {
        this.metrics.ordersFilled++;
        // TODO: Track both-sides vs one-side fills
        // Requires position tracking to determine if DOWN+UP both filled
    }

    /**
     * Log execution time
     * @param {number} time - Execution time in ms
     */
    logExecutionTime(time) {
        this.metrics.executionTimes.push(time);
        this.updateAvgExecutionTime();
    }

    /**
     * Log profit
     * @param {number} profit - Profit in USD
     */
    logProfit(profit) {
        this.metrics.totalProfit += profit;
    }

    /**
     * Log WebSocket disconnect
     */
    logWebSocketDisconnect() {
        this.metrics.wsDisconnects++;
        this.metrics.wsDisconnectTimes.push(Date.now());

        // Check for excessive disconnects (>5 per hour)
        this.checkWebSocketHealth();
    }

    /**
     * Update capture rate
     * MANDATORY: captureRate = ordersPlaced / opportunitiesDetected
     */
    updateCaptureRate() {
        if (this.metrics.opportunitiesDetected > 0) {
            this.metrics.captureRate =
                this.metrics.ordersPlaced / this.metrics.opportunitiesDetected;

            // Alert if capture rate < 75% (MANDATORY - L372-407)
            if (this.metrics.captureRate < METRICS.MIN_CAPTURE_RATE) {
                this.alertLowCaptureRate();
            }
        }
    }

    /**
     * Update average execution time
     */
    updateAvgExecutionTime() {
        if (this.metrics.executionTimes.length > 0) {
            const sum = this.metrics.executionTimes.reduce((a, b) => a + b, 0);
            this.metrics.avgExecutionTime = sum / this.metrics.executionTimes.length;
        }
    }

    /**
     * Check WebSocket health
     * MANDATORY: Alert if disconnects > 5/hour (L541)
     */
    checkWebSocketHealth() {
        const oneHourAgo = Date.now() - 3600000; // 1 hour in ms

        // Count disconnects in last hour
        const recentDisconnects = this.metrics.wsDisconnectTimes.filter(
            time => time > oneHourAgo
        ).length;

        if (recentDisconnects > METRICS.MAX_WS_DISCONNECTS_PER_HOUR) {
            this.alertWebSocketIssue(recentDisconnects);
        }
    }

    /**
     * Alert: Low capture rate
     * MANDATORY: "LATENCY FAIL" if capture < 75%
     */
    alertLowCaptureRate() {
        const alert = {
            type: 'LATENCY FAIL',
            message: `⚠️ CAPTURE RATE LOW! Current: ${(this.metrics.captureRate * 100).toFixed(1)}% | Target: ${METRICS.MIN_CAPTURE_RATE * 100}%`,
            captureRate: this.metrics.captureRate,
            threshold: METRICS.MIN_CAPTURE_RATE,
            timestamp: new Date().toISOString()
        };

        console.error(alert.message);
        this.emit('alert', alert);
    }

    /**
     * Alert: WebSocket connection issues
     * MANDATORY: "RECONNECT FAIL" if disconnects > 5/hour
     */
    alertWebSocketIssue(disconnectCount) {
        const alert = {
            type: 'RECONNECT FAIL',
            message: `⚠️ WEBSOCKET UNSTABLE! Disconnects in last hour: ${disconnectCount} | Max: ${METRICS.MAX_WS_DISCONNECTS_PER_HOUR}`,
            disconnectCount,
            threshold: METRICS.MAX_WS_DISCONNECTS_PER_HOUR,
            timestamp: new Date().toISOString()
        };

        console.error(alert.message);
        this.emit('alert', alert);
    }

    /**
     * Generate 15-minute report
     * MANDATORY: Report every 15 minutes (L372-407)
     */
    generateReport() {
        const now = Date.now();
        const cycleTime = (now - this.metrics.cycleStartTime) / 1000 / 60; // minutes

        const report = {
            timestamp: new Date().toISOString(),
            cycleTime: `${cycleTime.toFixed(1)} minutes`,

            // Core metrics
            opportunitiesDetected: this.metrics.opportunitiesDetected,
            ordersPlaced: this.metrics.ordersPlaced,
            ordersFilled: this.metrics.ordersFilled,
            bothSidesFilled: this.metrics.bothSidesFilled,
            oneSideFilled: this.metrics.oneSideFilled,

            // Performance
            captureRate: `${(this.metrics.captureRate * 100).toFixed(1)}%`,
            avgExecutionTime: `${this.metrics.avgExecutionTime.toFixed(2)}ms`,
            totalProfit: `$${this.metrics.totalProfit.toFixed(2)}`,

            // Health
            wsDisconnects: this.metrics.wsDisconnects,

            // Targets
            targets: {
                opportunitiesDetected: 100,
                captureRate: `${METRICS.TARGET_CAPTURE_RATE * 100}%`,
                avgExecutionTime: '80-113ms',
                profitPerCycle: '$2.05'
            }
        };

        return report;
    }

    /**
     * Print report to console
     */
    printReport() {
        const report = this.generateReport();

        console.log('\n' + '='.repeat(60));
        console.log('📊 PERFORMANCE REPORT - 15-MINUTE CYCLE');
        console.log('='.repeat(60));
        console.log(`Time: ${report.timestamp}`);
        console.log(`Cycle Duration: ${report.cycleTime}`);
        console.log('');
        console.log('OPPORTUNITIES:');
        console.log(`  Detected: ${report.opportunitiesDetected} / ${report.targets.opportunitiesDetected} target`);
        console.log(`  Orders Placed: ${report.ordersPlaced}`);
        console.log(`  Capture Rate: ${report.captureRate} / ${report.targets.captureRate} target`);
        console.log('');
        console.log('FILLS:');
        console.log(`  Total Filled: ${report.ordersFilled}`);
        console.log(`  Both Sides: ${report.bothSidesFilled}`);
        console.log(`  One Side: ${report.oneSideFilled}`);
        console.log('');
        console.log('PERFORMANCE:');
        console.log(`  Avg Execution: ${report.avgExecutionTime} / ${report.targets.avgExecutionTime} target`);
        console.log(`  Total Profit: ${report.totalProfit} / ${report.targets.profitPerCycle} target`);
        console.log('');
        console.log('HEALTH:');
        console.log(`  WS Disconnects: ${report.wsDisconnects}`);
        console.log('='.repeat(60) + '\n');

        return report;
    }

    /**
     * Write report to bot_scratchpad.md
     * MANDATORY: Update scratchpad every cycle (L12)
     */
    async updateScratchpad(report) {
        const scratchpadPath = './claude/bot_scrathpad.md';

        try {
            const updateText = `
## Latest Metrics
**Cycle**: ${report.timestamp}  
Opps: ${report.opportunitiesDetected}/100 | Placed: ${report.ordersPlaced}/80-85 | Filled: ${report.ordersFilled} | Profit: ${report.totalProfit}  
Latency: ${report.avgExecutionTime} | Capture: ${report.captureRate}
`;

            // Append to file (non-blocking)
            await fs.appendFile(scratchpadPath, updateText);

        } catch (error) {
            // Don't crash if scratchpad update fails
            console.warn('⚠️ Failed to update scratchpad:', error.message);
        }
    }

    /**
     * Start 15-minute reporting interval
     * MANDATORY: Log every 15 minutes (L389-395)
     */
    startReporting() {
        setInterval(() => {
            const report = this.printReport();
            this.updateScratchpad(report);

            // Reset cycle metrics
            this.resetCycleMetrics();

        }, METRICS.LOG_INTERVAL);
    }

    /**
     * Reset metrics for new cycle
     */
    resetCycleMetrics() {
        this.metrics.opportunitiesDetected = 0;
        this.metrics.ordersPlaced = 0;
        this.metrics.ordersFilled = 0;
        this.metrics.bothSidesFilled = 0;
        this.metrics.oneSideFilled = 0;
        this.metrics.totalProfit = 0;
        this.metrics.executionTimes = [];
        this.metrics.cycleStartTime = Date.now();
    }

    /**
     * Get current metrics snapshot
     */
    getMetrics() {
        return { ...this.metrics };
    }
}

export default MetricsLogger;
