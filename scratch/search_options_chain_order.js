const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/OptionsChain.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for order execution or inputs in OptionsChain.tsx...");

lines.forEach((line, idx) => {
    if (line.includes('buy') || line.includes('Buy') || line.includes('Order') || line.includes('limit')) {
        if (line.includes('click') || line.includes('handler') || line.includes('button') || line.includes('input')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
