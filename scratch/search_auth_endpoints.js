const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '../backend/server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

const lines = serverJs.split('\n');
console.log("Searching for registration/auth routes in server.js...");

lines.forEach((line, idx) => {
    if (line.includes('signup') || line.includes('register') || line.includes('login') || line.includes('auth')) {
        if (line.includes('app.post') || line.includes('app.get')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
