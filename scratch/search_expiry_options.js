const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/OptionsChain.tsx');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('expiry') || line.includes('Expiry') || line.includes('EXPIRY')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
