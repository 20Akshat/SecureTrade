const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for early exit handlers in MarketContext.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('early') || line.includes('Exit') || line.includes('squareOff')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
