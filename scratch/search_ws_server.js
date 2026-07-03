const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/server.js');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('ws') || line.includes('wss') || line.includes('broadcast')) {
        if (line.includes('send(') || line.includes('clients.forEach')) {
            console.log(`Line ${idx+1}: ${line.trim()}`);
        }
    }
});
