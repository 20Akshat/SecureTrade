const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../backend/local_db.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
console.log("Keys:", Object.keys(data));
if (data.users) console.log("Users keys:", Object.keys(data.users[0] || {}));
