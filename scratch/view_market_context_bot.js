const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for bot code in MarketContext.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('bot') || line.includes('Bot') || line.includes('auto') || line.includes('average') || line.includes('place') || line.includes('Buy') || line.includes('Sell')) {
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('console.log')) return;
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
