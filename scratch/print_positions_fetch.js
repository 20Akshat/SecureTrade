const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/components/PositionsPanel.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log(lines.slice(50, 120).join('\n'));
