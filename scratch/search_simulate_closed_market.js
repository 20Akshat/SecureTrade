const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/server.js');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('SIMULATE_CLOSED_MARKET')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
