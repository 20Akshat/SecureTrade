const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
let startLine = -1;
let endLine = -1;

lines.forEach((line, idx) => {
    if (line.includes('const symbolsNeedingBuyToday = new Set();')) {
        startLine = idx;
    }
    if (startLine !== -1 && endLine === -1 && line.includes('todayTrades.sort(')) {
        endLine = idx;
    }
});

if (startLine !== -1 && endLine !== -1) {
    console.log(`Block starts at line ${startLine + 1} and ends at line ${endLine + 1}`);
    console.log(lines.slice(startLine - 2, endLine + 2).join('\n'));
} else {
    console.log("Not found");
}
