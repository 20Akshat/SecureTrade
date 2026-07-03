const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/backend/server.js', 'utf8');

const lines = code.split('\n');
console.log("=== userPortfolioCache updates ===");
lines.forEach((line, idx) => {
    if (line.includes('userPortfolioCache') && (line.includes('=') || line.includes('push') || line.includes('splice') || line.includes('filter'))) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
