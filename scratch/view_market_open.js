const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
let startLine = -1;
let endLine = -1;

lines.forEach((line, idx) => {
    if (line.includes('function checkIsMarketOpen')) {
        startLine = idx;
    }
    if (startLine !== -1 && endLine === -1 && line.trim() === '}') {
        // Find the matching close brace (simple approximation)
        if (idx > startLine + 10) {
            endLine = idx;
        }
    }
});

if (startLine !== -1) {
    console.log(lines.slice(startLine - 2, startLine + 60).join('\n'));
} else {
    console.log("checkIsMarketOpen not found as a function definition");
}
