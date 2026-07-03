const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('closePosition') || line.includes('pnlPercent') || line.includes('STOP LOSS') || line.includes('stopLossPrice')) {
        if (idx > 800 && idx < 1200) {
            console.log(`Line ${idx+1}: ${line.trim()}`);
        }
    }
});
