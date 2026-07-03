const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../backend/local_db.db');
const db = new Database(dbPath);

console.log("--- RECENT TRADES ---");
const trades = db.prepare("SELECT * FROM trades ORDER BY created_at DESC LIMIT 5").all();
console.log(JSON.stringify(trades, null, 2));

console.log("--- PORTFOLIO ---");
const portfolio = db.prepare("SELECT * FROM portfolio").all();
console.log(JSON.stringify(portfolio, null, 2));
db.close();
