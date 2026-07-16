require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const supabase = require('./db');

async function dumpTrades() {
    try {
        console.log("Dumping all portfolio entries for user 9ae19ceb-bf80-4719-b797-09b4f9751078 today (July 13, 2026)...");
        const { data, error } = await supabase
            .from('portfolio')
            .select('*')
            .eq('user_id', '9ae19ceb-bf80-4719-b797-09b4f9751078')
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        data.forEach(t => {
            console.log(`Time: ${t.created_at} | Symbol: ${t.symbol} | Qty: ${t.quantity} | AvgPrice: ${t.average_price} | ID: ${t.id}`);
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
}
dumpTrades();
