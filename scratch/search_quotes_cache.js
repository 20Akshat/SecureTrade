const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/server.js');
const content = fs.readFileSync(filePath, 'utf8');

content.split('\n').forEach((line, idx) => {
    if (line.includes('option_quotes_cache.json') || line.includes('optionQuotesCache')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
