const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
console.log("Searching for strategy/averaging logic in server.js...");

lines.forEach((line, idx) => {
    if (line.includes('5EMA') || line.includes('average') || line.includes('averaging') || line.includes('avg') || line.includes('bot') || line.includes('strategy')) {
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('console.log')) return;
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
