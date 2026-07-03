const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/app/dashboard/page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('Refer a Friend') || line.includes('referral') || line.includes('VIRAL REFERRAL')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
