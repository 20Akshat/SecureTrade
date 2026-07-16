require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const supabase = require('./db');

async function dumpTradesTable() {
    try {
        console.log("Dumping all trades table entries today (July 13, 2026)...");
        const { data, error } = await supabase
            .from('trades')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        data.forEach(t => {
            console.log(`Time: ${t.created_at} | Symbol: ${t.symbol} | Option: ${t.option_symbol} | Type: ${t.type} | Entry: ${t.entry_price} | Exit: ${t.exit_price} | PnL: ${t.pnl} | Status: ${t.status}`);
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
}
dumpTradesTable();
