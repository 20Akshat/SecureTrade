const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for POST requests in MarketContext.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('method: "POST"') || line.includes("method: 'POST'")) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
        // Log adjacent lines
        for (let i = Math.max(0, idx - 4); i <= Math.min(lines.length - 1, idx + 8); i++) {
            console.log(`  [${i + 1}] ${lines[i]}`);
        }
    }
});
