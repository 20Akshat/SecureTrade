const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');

// Print lines around app.post('/api/buy'
let buyLineIdx = -1;
let sellLineIdx = -1;

lines.forEach((line, idx) => {
    if (line.includes("app.post('/api/buy'")) {
        buyLineIdx = idx;
    }
    if (line.includes("app.post('/api/sell'")) {
        sellLineIdx = idx;
    }
});

if (buyLineIdx !== -1) {
    console.log("=== BUY ENDPOINT (first 40 lines) ===");
    console.log(lines.slice(buyLineIdx, buyLineIdx + 45).join('\n'));
}
if (sellLineIdx !== -1) {
    console.log("=== SELL ENDPOINT (first 40 lines) ===");
    console.log(lines.slice(sellLineIdx, sellLineIdx + 45).join('\n'));
}
