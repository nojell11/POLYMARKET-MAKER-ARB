// Order Manager - EXECUTION ENGINE
// MANDATORY: DESCRIPTION.md L165-191, L490-495
// 4 limit orders, 6 shares each, <50ms placement, 429 retry

import fetch from 'node-fetch';
import { STRATEGY, API, ERROR_HANDLING, CAPITAL } from '../config.js';
import { EventEmitter } from 'events';
import { generateAuthHeaders, getApiUrl, hasCredentials } from '../auth/polymarket.js';

class OrderManager extends EventEmitter {
    constructor() {
        super();
        this.ordersPlaced = 0;
        this.ordersFilled = 0;
        this.activePositions = [];
        this.orderHistory = [];
    }

    /**
     * Generate 4 limit orders from opportunity
     * MANDATORY: 2 DOWN @ bid±1tick, 2 UP @ bid±1tick (L165-191)
     * 
     * @param {Object} opportunity - { marketId, downBid, upBid, sum }
     * @returns {Array<Object>} 4 order objects
     */
    generateOrders(opportunity) {
        const { marketId, downBid, upBid } = opportunity;
        const { ORDER_SIZE, TICK_SIZE } = STRATEGY;

        // MANDATORY: 4 orders total
        const orders = [
            // Order 1: BUY 6 DOWN @ (bid - 1 tick)
            {
                marketId,
                side: 'DOWN',
                shares: ORDER_SIZE,
                price: downBid - TICK_SIZE,
                orderType: 'limit'
            },
            // Order 2: BUY 6 DOWN @ (bid + 1 tick)
            {
                marketId,
                side: 'DOWN',
                shares: ORDER_SIZE,
                price: downBid + TICK_SIZE,
                orderType: 'limit'
            },
            // Order 3: BUY 6 UP @ (bid - 1 tick)
            {
                marketId,
                side: 'UP',
                shares: ORDER_SIZE,
                price: upBid - TICK_SIZE,
                orderType: 'limit'
            },
            // Order 4: BUY 6 UP @ (bid + 1 tick)
            {
                marketId,
                side: 'UP',
                shares: ORDER_SIZE,
                price: upBid + TICK_SIZE,
                orderType: 'limit'
            }
        ];

        return orders;
    }

    /**
     * Place orders via Polymarket REST API
     * MANDATORY: POST /order, <50ms placement time (L194-228)
     * MANDATORY: Retry 429s with backoff (L325-368)
     * 
     * @param {Array<Object>} orders - Orders to place
     * @param {Object} opportunity - Original opportunity data
     */
    async placeOrders(opportunity) {
        const startTime = performance.now();

        try {
            // Check capital limits before placing
            if (!this.canPlaceOrder()) {
                this.emit('order_skipped', {
                    reason: 'capital_limit',
                    activePositions: this.activePositions.length,
                    totalValue: this.getTotalPositionValue()
                });
                return;
            }

            const orders = this.generateOrders(opportunity);

            // Place all 4 orders in parallel for speed
            const orderPromises = orders.map(order =>
                this.placeOrderWithRetry(order)
            );

            const results = await Promise.allSettled(orderPromises);

            const placementTime = performance.now() - startTime;

            // Process results
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            this.ordersPlaced += successful;

            this.emit('orders_placed', {
                opportunity,
                successful,
                failed,
                placementTime,
                orders: results
            });

            // Validate <50ms requirement
            if (placementTime > STRATEGY.MAX_ORDER_PLACEMENT_TIME) {
                this.emit('performance_warning', {
                    type: 'slow_order_placement',
                    time: placementTime,
                    threshold: STRATEGY.MAX_ORDER_PLACEMENT_TIME
                });
            }

            // Track active positions
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    this.activePositions.push({
                        orderId: result.value.orderId,
                        marketId: orders[index].marketId,
                        side: orders[index].side,
                        shares: orders[index].shares,
                        price: orders[index].price,
                        value: orders[index].shares * orders[index].price,
                        timestamp: Date.now()
                    });
                }
            });

        } catch (error) {
            this.emit('order_error', error);
        }
    }

    /**
     * Place single order with retry logic
     * MANDATORY: 3 retries, 100ms→5s backoff for 429 (L325-368)
     * Now with L2 HMAC-SHA256 authentication
     * 
     * @param {Object} order - Order object
     * @returns {Promise<Object>} Order result
     */
    async placeOrderWithRetry(order, attempt = 1) {
        try {
            // Prepare request body
            const bodyString = JSON.stringify(order);
            const path = API.ENDPOINTS.ORDER;

            // Generate authenticated headers (HMAC-SHA256)
            // Hot path: signature generation is ~0.1ms (crypto is fast)
            const headers = hasCredentials()
                ? generateAuthHeaders('POST', path, bodyString)
                : { 'Content-Type': 'application/json' };  // Fallback for testing

            const apiUrl = hasCredentials() ? getApiUrl() : API.BASE_URL;

            const response = await fetch(`${apiUrl}${path}`, {
                method: 'POST',
                headers,
                body: bodyString
            });

            // Handle rate limiting (429)
            if (response.status === ERROR_HANDLING.RATE_LIMIT_STATUS_CODE) {
                if (attempt <= ERROR_HANDLING.ORDER_RETRY_ATTEMPTS) {
                    // Exponential backoff for rate limits
                    const backoffTime = attempt === 1
                        ? ERROR_HANDLING.ORDER_RETRY_DELAY
                        : ERROR_HANDLING.RATE_LIMIT_BACKOFF;

                    this.emit('rate_limited', {
                        attempt,
                        backoffTime,
                        order
                    });

                    await this.sleep(backoffTime);
                    return this.placeOrderWithRetry(order, attempt + 1);
                } else {
                    throw new Error('Rate limit exceeded, max retries reached');
                }
            }

            if (!response.ok) {
                throw new Error(`Order placement failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            // Retry on network errors
            if (attempt <= ERROR_HANDLING.ORDER_RETRY_ATTEMPTS) {
                this.emit('order_retry', {
                    attempt,
                    error: error.message,
                    order
                });

                await this.sleep(ERROR_HANDLING.ORDER_RETRY_DELAY);
                return this.placeOrderWithRetry(order, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Check if we can place orders based on capital limits
     * MANDATORY: Max 20% at risk, max 5 parallel positions (L410-438)
     */
    canPlaceOrder() {
        // Check max parallel positions
        if (this.activePositions.length >= CAPITAL.MAX_PARALLEL_POSITIONS) {
            return false;
        }

        // Check max risk percentage
        const totalAtRisk = this.getTotalPositionValue();
        const maxRisk = CAPITAL.TOTAL * CAPITAL.MAX_RISK_PERCENT;

        if (totalAtRisk + CAPITAL.PER_CYCLE > maxRisk) {
            return false;
        }

        return true;
    }

    /**
     * Get total value of active positions
     */
    getTotalPositionValue() {
        return this.activePositions.reduce((sum, pos) => sum + pos.value, 0);
    }

    /**
     * Track order fill
     * @param {string} orderId - Filled order ID
     */
    trackFill(orderId) {
        this.ordersFilled++;

        const position = this.activePositions.find(p => p.orderId === orderId);
        if (position) {
            position.filled = true;
            position.fillTime = Date.now();
        }

        this.emit('order_filled', { orderId, ordersFilled: this.ordersFilled });
    }

    /**
     * Remove closed position
     * @param {string} orderId - Order ID to remove
     */
    removePosition(orderId) {
        this.activePositions = this.activePositions.filter(p => p.orderId !== orderId);
    }

    /**
     * Get manager statistics
     */
    getStats() {
        return {
            ordersPlaced: this.ordersPlaced,
            ordersFilled: this.ordersFilled,
            activePositions: this.activePositions.length,
            totalPositionValue: this.getTotalPositionValue()
        };
    }

    /**
     * Utility: Sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default OrderManager;
