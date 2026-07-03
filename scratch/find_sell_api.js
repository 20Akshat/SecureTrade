const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/backend/server.js', 'utf8');

const startIndex = code.indexOf("app.post('/api/sell'");
if (startIndex !== -1) {
    console.log(code.substring(startIndex, startIndex + 3000));
} else {
    console.log("Not found app.post('/api/sell'");
}
