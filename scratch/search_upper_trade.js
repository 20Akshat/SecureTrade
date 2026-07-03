const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('"BUY"') || line.includes("'BUY'") || line.includes('"SELL"') || line.includes("'SELL'")) {
        // Exclude logger lines or option chain quotes lines if they are too common
        if (!line.includes('console.log') && !line.includes('logger')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
