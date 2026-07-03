const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach((line, idx) => {
        if (line.includes('botNotification') || line.includes('setBotNotification')) {
            console.log(`Line ${idx+1}: ${line.trim()}`);
        }
    });
} else {
    console.log("MarketContext.tsx not found!");
}
