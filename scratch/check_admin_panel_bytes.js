const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/AdminPanel.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const line = lines[373]; // 0-indexed is 373 (which is line 374)
console.log("Line content:", JSON.stringify(line));
for (let i = 0; i < line.length; i++) {
    console.log(`Char ${i}: ${line[i]} (code: ${line.charCodeAt(i)})`);
}
