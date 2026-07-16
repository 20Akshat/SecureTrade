const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'local_db.json');
try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log("Total trades in local_db:", data.trades?.length || 0);
    const todayStr = "2026-07-14";
    const todayTrades = (data.trades || []).filter(t => t.entry_time?.startsWith(todayStr) || t.exit_time?.startsWith(todayStr));
    console.log(`\n--- Trades for Today (${todayStr}) ---`);
    todayTrades.forEach((t, i) => {
        console.log(`[${i}] Symbol: ${t.symbol}`);
        console.log(`    Qty: ${t.quantity} | Entry: ₹${t.entry_price} | Exit: ₹${t.exit_price}`);
        console.log(`    PnL: ₹${t.pnl} | Status: ${t.status}`);
        console.log(`    Entry Time: ${t.entry_time} | Exit Time: ${t.exit_time}`);
        console.log(`    Target: ₹${t.target_price} | SL: ₹${t.stop_loss_price}`);
    });
} catch (e) {
    console.error(e);
}
