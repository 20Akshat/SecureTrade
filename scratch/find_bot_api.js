const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/backend/server.js', 'utf8');

const lines = code.split('\n');
console.log("=== Bot / Settings / Strategy Lines ===");
lines.forEach((line, idx) => {
    if (line.includes('app.post(') && (line.includes('bot') || line.includes('settings') || line.includes('strategy') || line.includes('mode'))) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
