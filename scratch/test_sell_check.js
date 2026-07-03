const fs = require('fs');
const localDb = JSON.parse(fs.readFileSync('c:/SecureTrade/backend/local_db.json', 'utf8'));

const symbol = 'NIFTY50 23 JUN 26 23900 CE';
const quantity = 650;

const matchedHoldings = localDb.portfolio.filter(p => p.symbol === symbol);
console.log("Matched Holdings count:", matchedHoldings.length);

let totalShares = 0;
matchedHoldings.forEach(p => {
    console.log(`Holding Trade ID: ${p.id} | Qty: ${p.quantity}`);
    totalShares += Number(p.quantity);
});

console.log(`Total Shares calculated: ${totalShares}`);
console.log(`Is totalShares < quantity? ${totalShares < quantity}`);
