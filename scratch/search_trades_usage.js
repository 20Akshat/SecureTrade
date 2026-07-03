const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for trades in MarketContext.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('trades') || line.includes('Trades')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
