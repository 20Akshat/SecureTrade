const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/BotNotificationPopup.tsx');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('fetch(') || line.includes('api/buy') || line.includes('api/sell') || line.includes('body:')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
