const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/server.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for require('fs') in server.js...");
lines.forEach((line, idx) => {
    if (line.includes("require('fs')") || line.includes('require("fs")')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
