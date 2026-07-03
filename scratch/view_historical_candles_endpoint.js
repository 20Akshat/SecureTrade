const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
let startLine = -1;
lines.forEach((line, idx) => {
    if (line.includes("app.get('/api/historical-candles'")) {
        startLine = idx;
    }
});

if (startLine !== -1) {
    console.log(lines.slice(startLine, startLine + 95).join('\n'));
} else {
    console.log("historical-candles endpoint not found");
}
