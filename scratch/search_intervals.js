const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
console.log("Searching for setInterval or loops in server.js...");

lines.forEach((line, idx) => {
    if (line.includes('setInterval') || line.includes('setTimeout') || line.includes('function ') || line.includes('const ')) {
        if (line.includes('checkMarket') || line.includes('strategy') || line.includes('Strategy') || line.includes('loop') || line.includes('Loop') || line.includes('tick') || line.includes('Tick')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
