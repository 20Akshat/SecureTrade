const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/server.js');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('bot') || line.includes('signal') || line.includes('position') || line.includes('buy') || line.includes('sell')) {
        if (line.includes('execute') || line.includes('create') || line.includes('open') || line.includes('trigger')) {
            console.log(`Line ${idx+1}: ${line.trim()}`);
        }
    }
});
