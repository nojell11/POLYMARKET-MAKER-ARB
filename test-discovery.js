// Quick test of market discovery
import MarketDiscovery from './src/market/discovery.js';

const discovery = new MarketDiscovery();
await discovery.refreshMarkets();

console.log('Status:', discovery.getStatus());
