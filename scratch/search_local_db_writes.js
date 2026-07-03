const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
console.log("Searching for local_db in server.js...");

lines.forEach((line, idx) => {
    if (line.includes('local_db') || line.includes('localDb')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
