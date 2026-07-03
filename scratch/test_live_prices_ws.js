const WebSocket = require('../backend/node_modules/ws');

const ws = new WebSocket('ws://localhost:5001');

ws.on('open', () => {
  console.log("Connected to SecureTrade WebSocket");
});

ws.on('message', (data) => {
  console.log("Received live market data update:");
  const parsed = JSON.parse(data);
  for (const symbol in parsed) {
      console.log(`- ${symbol}: Price ₹${parsed[symbol].price}, RSI: ${parsed[symbol].rsi}, Signal: ${parsed[symbol].signal}, 5EMA Signal: ${parsed[symbol].signal5ema}, Gainz Signal: ${parsed[symbol].signalGainz}`);
  }
  ws.close();
  process.exit(0);
});

ws.on('error', (err) => {
  console.error("WS Error:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log("Timeout waiting for message");
  process.exit(1);
}, 5000);
