const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/OptionsChain.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for setSelected( in OptionsChain.tsx...");
lines.forEach((line, idx) => {
    if (line.includes('setSelected(')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
