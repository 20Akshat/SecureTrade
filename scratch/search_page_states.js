const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/app/dashboard/page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for useState hook in page.tsx...");
lines.forEach((line, idx) => {
    if (line.includes('useState')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
