const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/frontend/src/components/PositionsPanel.tsx', 'utf8');

const lines = code.split('\n');
console.log("=== Pcts in PositionsPanel.tsx ===");
lines.forEach((line, idx) => {
    if (line.includes('defaultSlPct') || line.includes('defaultTgtPct') || line.includes('default') || line.includes('0.85') || line.includes('1.2')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
