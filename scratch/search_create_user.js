const fs = require('fs');
const path = require('path');

const localDbPath = path.join(__dirname, '../backend/localDb.js');
const serverPath = path.join(__dirname, '../backend/server.js');

const dbContent = fs.readFileSync(localDbPath, 'utf8');
const srvContent = fs.readFileSync(serverPath, 'utf8');

console.log("Searching in localDb.js:");
dbContent.split('\n').forEach((line, idx) => {
    if (line.includes('createUser') || line.includes('signup')) {
        console.log(`  Line ${idx + 1}: ${line.trim()}`);
    }
});

console.log("\nSearching in server.js:");
srvContent.split('\n').forEach((line, idx) => {
    if (line.includes('app.post(\'/api/signup\'') || line.includes('/api/signup')) {
        console.log(`  Line ${idx + 1}: ${line.trim()}`);
    }
});
