#!/bin/bash

# Railway EU-West Deployment Script
# Deploys Polymarket Arbitrage Bot to Railway with health checks

set -e  # Exit on error

echo "🚀 RAILWAY EU-WEST DEPLOYMENT"
echo "=============================="
echo ""

# Step 1: Verify environment variables
echo "Step 1: Checking environment variables..."

if [ -z "$CLOB_API_KEY" ]; then
  echo "⚠️ WARNING: CLOB_API_KEY not set"
  echo "   Get credentials from: https://polymarket.com/settings/api"
fi

if [ -z "$CLOB_SECRET" ]; then
  echo "⚠️ WARNING: CLOB_SECRET not set"
fi

if [ -z "$CLOB_PASS_PHRASE" ]; then
  echo "⚠️ WARNING: CLOB_PASS_PHRASE not set"
fi

echo "✅ Environment check complete"
echo ""

# Step 2: Install dependencies
echo "Step 2: Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
  echo "❌ npm install failed"
  exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Step 3: Test authentication
echo "Step 3: Testing Polymarket API authentication..."
npm run test:auth

if [ $? -ne 0 ]; then
  echo "❌ Authentication test failed - deployment aborted"
  echo "   Check your CLOB_API_KEY, CLOB_SECRET, CLOB_PASS_PHRASE"
  exit 1
fi

echo "✅ Authentication test passed"
echo ""

# Step 4: Testing network latency
echo "Step 4: Testing network latency to Polymarket..."
npm run latency-check

if [ $? -ne 0 ]; then
  echo "❌ Latency test failed - deployment aborted"
  exit 1
fi

echo "✅ Latency test passed"
echo ""

# Step 5: Run stress test
echo "Step 5: Running latency stress test (1000 cycles)..."
npm test

echo "✅ Stress test complete"
echo ""

# Step 6: Deploy
echo "Step 6: Starting bot..."
echo "Region: EU-West (Amsterdam)"
echo "Target latency: <80ms"
echo "Capture rate target: 80-85%"
echo ""

# Start the bot
npm start

if [ $? -ne 0 ]; then
  echo "❌ npm install failed"
  exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Step 4: Run latency stress test
echo "Step 4: Running latency stress test (1000 cycles)..."
node src/test/latency-stress.js

echo "✅ Stress test complete"
echo ""

# Step 5: Run error recovery drill
echo "Step 5: Running error recovery drill..."
node src/test/error-recovery.js

echo "✅ Recovery drill complete"
echo ""

# Step 6: Deploy
echo "Step 6: Starting bot..."
echo "Region: EU-West (Amsterdam)"
echo "Target latency: <80ms"
echo "Capture rate target: 80-85%"
echo ""

# Start the bot
npm start

# Health check loop (for Railway health endpoint)
while true; do
  sleep 30
  
  # Check if bot is still running
  if ! pgrep -f "node src/index.js" > /dev/null; then
    echo "⚠️ Bot process died - restarting..."
    npm start &
  fi
done
