const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
let startLine1 = -1;
let startLine2 = -1;
lines.forEach((line, idx) => {
    if (line.includes('function parseOptionSymbol')) {
        startLine1 = idx;
    }
    if (line.includes('function parseDteFromSymbol')) {
        startLine2 = idx;
    }
});

if (startLine1 !== -1) {
    console.log(lines.slice(startLine1 - 2, startLine1 + 30).join('\n'));
}
if (startLine2 !== -1) {
    console.log(lines.slice(startLine2 - 2, startLine2 + 30).join('\n'));
}
