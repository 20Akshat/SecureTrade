const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/PositionsPanel.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for headings in PositionsPanel.tsx...");
lines.forEach((line, idx) => {
    if (line.includes('heading') || line.includes('h2') || line.includes('tab') || line.includes('Tab')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
