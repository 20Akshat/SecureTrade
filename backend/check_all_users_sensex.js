require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const supabase = require('./db');

async function checkAllUsersSensex() {
    try {
        console.log("Checking all users SENSEX 77900 CE portfolio entries today...");
        const { data, error } = await supabase
            .from('portfolio')
            .select('*')
            .like('symbol', '%77900 CE%')
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        data.forEach(t => {
            console.log(`User: ${t.user_id} | Time: ${t.created_at} | Symbol: ${t.symbol} | Qty: ${t.quantity} | AvgPrice: ${t.average_price}`);
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
}
checkAllUsersSensex();
