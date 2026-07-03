const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
lines.forEach((line, idx) => {
    if (line.includes("from('portfolio')") || line.includes("from('users')") || line.includes("localDb.addTrade") || line.includes("localDb.updateBalance")) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
