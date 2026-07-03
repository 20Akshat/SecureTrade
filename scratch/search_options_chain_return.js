const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/OptionsChain.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for return ( in OptionsChain.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('return (') || line.includes('return (')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
        for (let i = idx; i <= idx + 8; i++) {
            console.log(`  [${i + 1}] ${lines[i]}`);
        }
    }
});
