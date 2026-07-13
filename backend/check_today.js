require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const supabase = require('./db');

async function checkTodayTrades() {
    console.log("🔍 Checking today's Supabase portfolio updates...");
    
    // Fetch all portfolio entries from today (July 13, 2026)
    const { data: portfolio, error } = await supabase
        .from('portfolio')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("❌ Error fetching portfolio:", error.message);
        return;
    }

    const todayStr = "2026-07-13";
    const todayTrades = portfolio.filter(p => p.created_at && p.created_at.startsWith(todayStr));

    if (todayTrades.length === 0) {
        console.log("📭 No trades were executed today (July 13, 2026) yet!");
    } else {
        console.log(`📦 Found ${todayTrades.length} trades executed today:`);
        todayTrades.forEach(t => {
            console.log(`  - Time: ${t.created_at} | Symbol: ${t.symbol} | Qty: ${t.quantity} | Avg Price: ₹${t.average_price}`);
        });
    }
}

checkTodayTrades();
