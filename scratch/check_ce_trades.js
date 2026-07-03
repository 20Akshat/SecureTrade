const fs = require('fs');
const localDb = JSON.parse(fs.readFileSync('c:/SecureTrade/backend/local_db.json', 'utf8'));

console.log("=== All NIFTY50 23900 CE Trades ===");
localDb.portfolio.forEach((p, idx) => {
    if (p.symbol.includes('23900 CE')) {
        console.log(`${idx + 1}. ID: ${p.id} | Qty: ${p.quantity} | Price: ${p.average_price} | Created: ${p.created_at}`);
    }
});
