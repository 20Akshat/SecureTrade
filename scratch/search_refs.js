const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('lastOptionPremium') || line.includes('lastOptionFetchTime')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
