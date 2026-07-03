const fs = require('fs');
const localDb = JSON.parse(fs.readFileSync('c:/SecureTrade/backend/local_db.json', 'utf8'));

console.log("=== Last 10 Trades in local_db.json ===");
const len = localDb.portfolio.length;
localDb.portfolio.slice(Math.max(0, len - 10)).forEach((p, idx) => {
    console.log(`${idx + 1}. ID: ${p.id} | Symbol: ${p.symbol} | Qty: ${p.quantity} | AvgPrice: ${p.average_price} | Created: ${p.created_at}`);
});
