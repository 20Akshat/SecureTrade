const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/frontend/src/context/MarketContext.tsx', 'utf8');

const lines = code.split('\n');
console.log("=== Bot Init Lines ===");
lines.forEach((line, idx) => {
    if (line.includes('const bot =') || line.includes('useRef') && line.includes('active')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
