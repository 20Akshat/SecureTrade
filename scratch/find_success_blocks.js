const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/backend/server.js', 'utf8');

const startIndex = code.indexOf("Success: User=");
if (startIndex !== -1) {
    console.log(code.substring(startIndex - 500, startIndex + 1500));
}

const secondIndex = code.indexOf("Success: User=", startIndex + 50);
if (secondIndex !== -1) {
    console.log("=== SECOND SUCCESS BLOCK ===");
    console.log(code.substring(secondIndex - 500, secondIndex + 1500));
}
