const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/frontend/src/components/PositionsPanel.tsx', 'utf8');

const lines = code.split('\n');
console.log("=== Sell / Exit / Square Off in PositionsPanel.tsx ===");
lines.forEach((line, idx) => {
    if (line.includes('handleSell') || line.includes('handleExit') || line.includes('squareOff') || line.includes('fetch') || line.includes('lastActionTime') || line.includes('triggerTransactionLock')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
