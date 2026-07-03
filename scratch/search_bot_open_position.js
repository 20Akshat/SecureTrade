const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/server.js');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('activeBotTrade') || line.includes('openBotTrade') || line.includes('triggerTrade') || line.includes('findStrike') || line.includes('CE') && line.includes('PE')) {
        if (idx > 500 && idx < 1200) {
            console.log(`Line ${idx+1}: ${line.trim()}`);
        }
    }
});
