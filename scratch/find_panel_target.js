const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/frontend/src/components/PositionsPanel.tsx', 'utf8');

const lines = code.split('\n');
console.log("=== Target/SL Calculations in PositionsPanel.tsx ===");
lines.forEach((line, idx) => {
    if (line.includes('target') || line.includes('stopLoss') || line.includes('takeProfit') || line.includes('TP') || line.includes('SL')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
