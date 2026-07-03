const fs = require('fs');
const path = require('path');

function run() {
    const localDbPath = path.join(__dirname, '../backend/local_db.json');
    if (!fs.existsSync(localDbPath)) {
        console.error("Local DB file not found");
        return;
    }
    const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    const trades = localDb.portfolio;
    console.log("Total trades in Local DB:", trades.length);

    let balance = 100000;
    trades.forEach((t, idx) => {
        const qty = Number(t.quantity);
        const price = Number(t.average_price);
        balance -= (qty * price);
        console.log(`${idx + 1}. ID: ${t.id}, Date: ${t.created_at}, Symbol: ${t.symbol}, Qty: ${qty}, Price: ${price}, Cost: ${(qty * price).toFixed(2)}, Running Balance: ${balance.toFixed(2)}`);
    });
}

run();
