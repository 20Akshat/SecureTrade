const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for trade placement logic in MarketContext.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('buy') || line.includes('place') || line.includes('order') || line.includes('api')) {
        if (line.includes('fetch') || line.includes('POST') || line.includes('action') || line.includes('trade')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
