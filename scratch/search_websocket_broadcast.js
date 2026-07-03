const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/server.js');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('ws.send') || line.includes('broadcast') || line.includes('setInterval') && line.includes('symbol')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
