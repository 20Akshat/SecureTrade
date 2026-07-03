const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/AdminPanel.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Searching for components or tabs in AdminPanel.tsx...");
lines.forEach((line, idx) => {
    if (line.includes('tab') || line.includes('Tab') || line.includes('headers') || line.includes('const AdminPanel')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
