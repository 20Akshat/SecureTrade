const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/backend/server.js', 'utf8');

const lines = code.split('\n');
console.log("=== Endpoints ===");
lines.forEach((line, idx) => {
    if (line.includes('app.get(') || line.includes('app.post(') || line.includes('router.get(') || line.includes('router.post(')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
