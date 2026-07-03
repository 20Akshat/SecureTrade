const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/server.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let startLine = -1;
lines.forEach((line, idx) => {
    if (line.includes("app.post('/api/sell'")) {
        startLine = idx;
    }
});

if (startLine !== -1) {
    console.log(lines.slice(startLine - 2, startLine + 70).join('\n'));
} else {
    console.log("app.post('/api/sell') not found");
}
