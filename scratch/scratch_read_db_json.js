const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../backend/local_db.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log("--- LAST 5 TRADES ---");
const trades = data.trades || [];
console.log(JSON.stringify(trades.slice(-5), null, 2));

console.log("--- PORTFOLIO ---");
console.log(JSON.stringify(data.portfolio || [], null, 2));
