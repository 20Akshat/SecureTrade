const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/server.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for index price generator or mock loop...");
lines.forEach((line, idx) => {
    if (line.includes('marketState') && (line.includes('currentPrice') || line.includes('realPrice') || line.includes('random'))) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
