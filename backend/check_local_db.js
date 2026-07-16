const fs = require('fs');
const path = require('path');

function checkLocalDb() {
    try {
        const filePath = 'c:/SecureTrade/backend/local_db.json';
        if (!fs.existsSync(filePath)) {
            console.log("local_db.json does not exist.");
            return;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const db = JSON.parse(content);
        console.log("Checking portfolio entries in local_db.json...");
        const matched = db.portfolio.filter(p => p.symbol.includes("77900 CE"));
        console.log(`Found ${matched.length} entries for 77900 CE:`);
        matched.forEach(t => {
            console.log(`User: ${t.user_id} | Qty: ${t.quantity} | AvgPrice: ${t.average_price} | Created: ${t.created_at}`);
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
}
checkLocalDb();
