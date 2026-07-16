require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const supabase = require('./db');

async function checkTrade() {
    try {
        console.log("Fetching today's recent trades...");
        const { data, error } = await supabase
            .from('portfolio')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        console.log("Recent Trades in Portfolio Table:");
        data.forEach(t => {
            console.log(`ID: ${t.id}`);
            console.log(`User ID: ${t.user_id}`);
            console.log(`Symbol: ${t.symbol}`);
            console.log(`Type: ${t.type}`);
            console.log(`Qty: ${t.quantity}`);
            console.log(`Avg Price: ${t.average_price}`);
            console.log(`Target: ${t.target}`);
            console.log(`SL: ${t.stop_loss}`);
            console.log(`Reasoning: ${t.reasoning}`);
            console.log(`Created At: ${t.created_at}`);
            console.log("--------------------------------------");
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
}
checkTrade();
