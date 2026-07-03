const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/context/MarketContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('const bot = useRef') || line.includes('useRef({') && idx < 320) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
        for (let i = 1; i <= 25; i++) {
            console.log(`  Line ${idx+1+i}: ${content.split('\n')[idx+i].trim()}`);
        }
    }
});
