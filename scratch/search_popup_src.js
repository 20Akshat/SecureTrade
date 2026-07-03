const fs = require('fs');
const path = require('path');

const files = [
    '../frontend/src/components/BotNotificationPopup.tsx',
    '../frontend/src/components/PositionsPanel.tsx'
];

files.forEach(f => {
    const filePath = path.join(__dirname, f);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach((line, idx) => {
        if (line.includes('Auto Advisor') || line.includes('Average') || line.includes('BUY MORE')) {
            console.log(`${path.basename(f)} Line ${idx+1}: ${line.trim()}`);
        }
    });
});
