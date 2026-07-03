const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/PositionsPanel.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let startLine = -1;
lines.forEach((line, idx) => {
    if (line.includes("activeTab === 'trades'") || line.includes("trades.map")) {
        startLine = idx;
    }
});

if (startLine !== -1) {
    console.log(lines.slice(startLine - 5, startLine + 95).join('\n'));
} else {
    console.log("Not found");
}
