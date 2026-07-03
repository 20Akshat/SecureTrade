require('dotenv').config();
const supabase = require('./db');

async function checkAllTrades() {
    try {
        const { data, error } = await supabase
            .from('portfolio')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        console.log("Recent Trades (Last 20):");
        data.forEach(t => {
            console.log(`[${t.created_at}] ID: ${t.id} | Symbol: ${t.symbol} | Qty: ${t.quantity} | Price: ${t.average_price}`);
        });

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

checkAllTrades();
