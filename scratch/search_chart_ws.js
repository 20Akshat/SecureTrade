const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/TradingChart.tsx');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('ws') || line.includes('WebSocket') || line.includes('socket') || line.includes('onmessage')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
