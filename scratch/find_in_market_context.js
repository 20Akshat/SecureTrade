const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/frontend/src/context/MarketContext.tsx', 'utf8');

// Find all functions/lines containing "signal" or "BUY" or "notification"
const lines = code.split('\n');
console.log("=== Matching Lines ===");
lines.forEach((line, idx) => {
    if (line.includes('signal') || line.includes('Notification') || line.includes('alert') || line.includes('websocket') || line.includes('ws.')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
