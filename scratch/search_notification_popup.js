const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/BotNotificationPopup.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('POST') || line.includes('fetch') || line.includes('api')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
