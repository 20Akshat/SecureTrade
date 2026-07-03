const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/PositionsPanel.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('/api/portfolio') || line.includes('fetchPositions') || line.includes('positions') && line.includes('set')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
