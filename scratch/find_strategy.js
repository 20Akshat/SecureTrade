const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/frontend/src/context/MarketContext.tsx', 'utf8');

const lines = code.split('\n');
console.log("=== Strategy Lines ===");
lines.forEach((line, idx) => {
    if (line.includes('activeStrategy') || line.includes('setActiveStrategy')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
