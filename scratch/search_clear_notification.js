const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let startLine = -1;
lines.forEach((line, idx) => {
    if (line.includes('clearNotification')) {
        startLine = idx;
    }
});

if (startLine !== -1) {
    console.log(lines.slice(startLine - 2, startLine + 35).join('\n'));
} else {
    console.log("clearNotification not found");
}
