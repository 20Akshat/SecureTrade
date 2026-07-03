const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/BotNotificationPopup.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log(lines.slice(35, 105).join('\n'));
