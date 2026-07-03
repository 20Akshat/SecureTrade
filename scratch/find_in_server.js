const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/backend/server.js', 'utf8');

// Find all functions/lines containing "generateSignal" or "EMA" or "RSI"
const lines = code.split('\n');
console.log("=== Matching Lines ===");
lines.forEach((line, idx) => {
    if (line.includes('generateSignal') || line.includes('calculateRSI') || line.includes('calculateEMA') || line.includes('isFlatMarket')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
