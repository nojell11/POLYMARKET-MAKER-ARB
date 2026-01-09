# Polymarket Arbitrage Bot

High-frequency maker arbitrage bot for Polymarket 15-minute binary prediction markets.

## 🎯 Strategy

Detects when `DOWN_bid + UP_bid < 0.998` and places 4 limit orders to capture arbitrage profit.

**Expected Performance:**
- 100 opportunities per 15-min market
- 80-85% capture rate
- ~$200/day profit

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Create a `.env` file:

```env
CLOB_API_KEY=your-api-key
CLOB_SECRET=your-secret
CLOB_PASS_PHRASE=your-passphrase
POLY_ADDRESS=0xYourWalletAddress
LICENSE_KEY=your-license-key
```

### 3. Run the Bot

```bash
npm start
```

---

## ⚙️ Configuration

Edit `src/config.js`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `OPPORTUNITY_THRESHOLD` | 0.998 | Trigger when sum < this |
| `ORDER_SIZE` | 6 | Shares per order |
| `TOTAL_ORDERS` | 4 | 2 DOWN + 2 UP |
| `CAPITAL_PER_CYCLE` | 18 | USD per cycle |

---

## 📁 Project Structure

```
src/
├── index.js              # Main orchestrator
├── config.js             # Bot configuration
├── auth/
│   └── polymarket.js     # API authentication
├── market/
│   └── discovery.js      # Find 15-min crypto markets
├── websocket/
│   └── monitor.js        # WebSocket connection
├── detector/
│   └── opportunity.js    # Detect arbitrage opportunities
├── orders/
│   └── manager.js        # Order placement
└── metrics/
    └── logger.js         # Performance logging
```

---

## 🚂 Deploy to Railway

**Required:** Deploy to **EU West (Amsterdam)** for <80ms latency.

### Railway Environment Variables

```
CLOB_API_KEY=xxx
CLOB_SECRET=xxx
CLOB_PASS_PHRASE=xxx
POLY_ADDRESS=0x...
```

### Deploy

```bash
railway up
```

---

## 📊 Logs & Metrics

The bot logs performance every 15 minutes:

```
📊 PERFORMANCE REPORT - 15-MINUTE CYCLE
============================================================
OPPORTUNITIES:
  Detected: 98 / 100 target
  Capture Rate: 83.7% / 82.5% target
PERFORMANCE:
  Avg Execution: 92.45ms / 80-113ms target
  Total Profit: $2.15 / $2.05 target
============================================================
```

---

## ⚠️ Important Notes

1. **Latency matters** - Deploy to EU West for 80-85% capture rate
2. **Fund your wallet** - Bot needs USDC on Polygon
3. **Monitor health** - Watch for capture rate < 75% alerts

---

## 📝 License

MIT
