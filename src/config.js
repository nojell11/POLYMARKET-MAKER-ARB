// Polymarket Arbitrage Bot Configuration
// CRITICAL: All values from DESCRIPTION.md mandatory requirements

export const CONFIG = {
  // WebSocket Configuration (MANDATORY - L100-127)
  WEBSOCKET: {
    ENDPOINT: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
    AUTO_RECONNECT_DELAY: 2000, // 2 seconds
    MAX_RECONNECT_ATTEMPTS: Infinity,
    UPTIME_TARGET: 0.999 // 99.9%
  },

  // REST API Endpoints (MANDATORY - L231-241)
  API: {
    BASE_URL: 'https://clob.polymarket.com',
    ENDPOINTS: {
      ORDER: '/order',
      POSITIONS: '/positions',
      BALANCES: '/balances',
      PING: '/ping'
    }
  },

  // Strategy Parameters (MANDATORY - L252-268, L165-191)
  STRATEGY: {
    OPPORTUNITY_THRESHOLD: 0.998, // sum < 0.998
    ORDER_SIZE: 6, // shares per order
    TOTAL_ORDERS: 4, // 2 DOWN + 2 UP
    TICK_SIZE: 0.001, // ASSUMED - needs verification
    CAPITAL_PER_CYCLE: 18 // dollars ($3 per order × 6 shares)
  },

  // Market Selection (MANDATORY - L287-322)
  MARKETS: {
    DURATION: '15min',
    TYPE: 'binary',
    TARGET_ASSETS: ['BTC', 'ETH', 'SOL'],
    MIN_VOLUME_24H: 50000, // $50,000
    MIN_LIQUIDITY: 1000 // shares
  },

  // Execution Speed (MANDATORY - L194-228)
  PERFORMANCE: {
    MAX_DETECTION_TIME: 10, // ms
    MAX_CALCULATION_TIME: 5, // ms
    MAX_ORDER_PLACEMENT_TIME: 50, // ms
    MAX_TOTAL_EXECUTION_TIME: 150, // ms
    TARGET_EXECUTION_TIME: 113 // ms (80-113ms target)
  },

  // Capital Management (MANDATORY - L410-438)
  CAPITAL: {
    TOTAL: 100, // USD
    PER_CYCLE: 18, // USD
    MAX_RISK_PERCENT: 0.20, // 20% max at risk
    MAX_PARALLEL_POSITIONS: 5
  },

  // Error Handling (MANDATORY - L325-368)
  ERROR_HANDLING: {
    ORDER_RETRY_ATTEMPTS: 3,
    ORDER_RETRY_DELAY: 100, // ms
    RATE_LIMIT_BACKOFF: 5000, // ms (5 seconds for 429)
    RATE_LIMIT_STATUS_CODE: 429
  },

  // Metrics & Alerts (MANDATORY - L372-407)
  METRICS: {
    LOG_INTERVAL: 900000, // 15 minutes in ms
    MIN_CAPTURE_RATE: 0.75, // 75% alert threshold
    MAX_WS_DISCONNECTS_PER_HOUR: 5,
    TARGET_CAPTURE_RATE: 0.825 // 82.5% target
  },

  // Deployment (MANDATORY - L130-161)
  DEPLOYMENT: {
    REGION: 'eu-west',
    MAX_LATENCY: 80, // ms
    TARGET_LATENCY: 53 // ms
  }
};

// Convenience exports
export const {
  WEBSOCKET,
  API,
  STRATEGY,
  MARKETS,
  PERFORMANCE,
  CAPITAL,
  ERROR_HANDLING,
  METRICS,
  DEPLOYMENT
} = CONFIG;
