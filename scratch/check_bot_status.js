const supabase = require('../backend/db');

async function checkStatus() {
    try {
        console.log("🔍 Checking active users in database...");
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('email, balance');
        if (userError) throw userError;
        
        console.log("\n👥 Users in DB:");
        console.table(users);

        console.log("\n💼 Current Portfolio Rows:");
        const { data: portfolio, error: portError } = await supabase
            .from('portfolio')
            .select('*');
        if (portError) throw portError;
        console.table(portfolio);

        console.log("\n📈 Recent Orders/Trades History (Last 10):");
        const { data: trades, error: tradeError } = await supabase
            .from('trades')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        if (tradeError) throw tradeError;
        console.table(trades);

    } catch (err) {
        console.error("Error checking status:", err.message);
    }
}

checkStatus();
