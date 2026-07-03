const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/TradingChart.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for realLtp in TradingChart.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('realLtp') || line.includes('setRealLtp')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
