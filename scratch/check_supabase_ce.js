require('C:/SecureTrade/backend/node_modules/dotenv').config({ path: 'C:/SecureTrade/backend/.env' });
const supabase = require('C:/SecureTrade/backend/db');

async function checkSupabase() {
    try {
        const { data, error } = await supabase
            .from('portfolio')
            .select('*')
            .eq('user_id', '9ae19ceb-bf80-4719-b797-09b4f9751078')
            .ilike('symbol', '%23900 CE%');
        if (error) throw error;
        console.log("=== Supabase 23900 CE Trades ===");
        data.forEach(t => {
            console.log(`ID: ${t.id} | Symbol: ${t.symbol} | Qty: ${t.quantity} | Price: ${t.average_price} | Created: ${t.created_at}`);
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
}

checkSupabase();
