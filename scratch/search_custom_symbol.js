const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/TradingChart.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for customSymbol in TradingChart.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('customSymbol') || line.includes('symbol') || line.includes('Symbol') || line.includes('option') || line.includes('Option')) {
        if (line.includes('customSymbol') || line.includes('prop') || line.includes('Premium') || line.includes('fetch')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
