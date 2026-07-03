const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for symbols scan loop in MarketContext.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('const symbols') || line.includes('symbolsTo') || line.includes('forEach') || line.includes('NIFTY')) {
        if (line.includes('Scan') || line.includes('symbol') || line.includes('SENSEX')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
