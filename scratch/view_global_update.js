const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
let startLine = -1;
lines.forEach((line, idx) => {
    if (line.includes('const globalUpdateInterval = setInterval')) {
        startLine = idx;
    }
});

if (startLine !== -1) {
    console.log(lines.slice(startLine, startLine + 100).join('\n'));
} else {
    console.log("globalUpdateInterval not found");
}
