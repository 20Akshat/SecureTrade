const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/ChatBot.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('border-l') || line.includes('border-blue') || line.includes('bg-blue')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
