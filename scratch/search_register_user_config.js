const fs = require('fs');
const path = require('path');

const localDbPath = path.join(__dirname, '../backend/localDb.js');
const dbContent = fs.readFileSync(localDbPath, 'utf8');

const lines = dbContent.split('\n');
let startLine = -1;
lines.forEach((line, idx) => {
    if (line.includes('registerUserConfig')) {
        startLine = idx;
    }
});

if (startLine !== -1) {
    console.log(lines.slice(startLine - 2, startLine + 25).join('\n'));
} else {
    console.log("registerUserConfig not found");
}
