const fs = require('fs');
const code = fs.readFileSync('c:/SecureTrade/backend/server.js', 'utf8');

const startIndex = code.indexOf("app.get('/api/portfolio'");
if (startIndex !== -1) {
    console.log(code.substring(startIndex, startIndex + 1500));
} else {
    console.log("Not found app.get('/api/portfolio'");
}
