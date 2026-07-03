const supabase = require('./db');

async function main() {
    try {
        const { data, error } = await supabase
            .from('portfolio')
            .select('*')
            .ilike('symbol', '%24500%')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log("24500 PE Trades:");
        data.forEach(t => {
            console.log(`[${t.created_at}] ID: ${t.id} | User: ${t.user_id} | Symbol: ${t.symbol} | Qty: ${t.quantity} | AvgPrice: ${t.average_price}`);
        });

        // Also get user balance
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('*');
        if (userError) throw userError;
        console.log("\nUsers:");
        users.forEach(u => {
            console.log(`Email: ${u.email} | Balance: ${u.balance}`);
        });

    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();
