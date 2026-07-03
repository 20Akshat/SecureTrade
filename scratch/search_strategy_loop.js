const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
console.log("Searching for automated order placement in server.js...");

lines.forEach((line, idx) => {
    if (line.includes('executeTrade') || line.includes('placeOrder') || line.includes('autoTrade') || line.includes('bot') || line.includes('auto_trade') || line.includes('autoBuy') || line.includes('autoSell')) {
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('console.log')) return;
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
