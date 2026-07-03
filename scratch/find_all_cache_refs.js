const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/backend/server.js', 'utf8');

const lines = code.split('\n');
console.log("=== All userPortfolioCache references ===");
lines.forEach((line, idx) => {
    if (line.includes('userPortfolioCache')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
