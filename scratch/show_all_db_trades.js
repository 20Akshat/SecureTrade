const fs = require('fs');
const localDb = JSON.parse(fs.readFileSync('c:/SecureTrade/backend/local_db.json', 'utf8'));

console.log(`Total trades in local DB: ${localDb.portfolio.length}`);
localDb.portfolio.forEach((p, idx) => {
    console.log(`${idx + 1}. Symbol: ${p.symbol} | Qty: ${p.quantity} | AvgPrice: ${p.average_price} | Created: ${p.created_at}`);
});
