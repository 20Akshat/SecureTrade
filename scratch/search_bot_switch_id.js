const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/app/dashboard/page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for bot switch container in page.tsx...");
lines.forEach((line, idx) => {
    if (line.includes('bot') || line.includes('Bot') || line.includes('switch') || line.includes('Switch')) {
        if (line.includes('id=') || line.includes('div') || line.includes('button')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
