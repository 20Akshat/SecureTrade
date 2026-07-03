const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/app/dashboard/page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for chartSymbol in dashboard/page.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('chartSymbol') || line.includes('ChartSymbol') || line.includes('TradingChart')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
