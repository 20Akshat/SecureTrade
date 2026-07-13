require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const supabase = require('./db');

async function checkPriyeshTrades() {
    console.log("🔍 Checking database for 'Priyesh' and today's trades...");
    
    // Fetch all users
    const { data: users, error: userError } = await supabase.from('users').select('*');
    if (userError) {
        console.error("❌ Error fetching users:", userError.message);
        return;
    }
    
    // Find Priyesh
    const priyesh = users.find(u => u.email && u.email.toLowerCase().includes("priyesh"));
    if (!priyesh) {
        console.log("⚠️ No user found containing 'priyesh' in their email.");
        console.log("Registered Users:");
        users.forEach(u => console.log(`  - ID: ${u.id} | Email: ${u.email} | Balance: ₹${u.balance}`));
        return;
    }

    console.log(`👤 Found Priyesh: ID = ${priyesh.id} | Email = ${priyesh.email} | Balance = ₹${priyesh.balance}`);

    // Fetch Priyesh's portfolio trades today (July 13, 2026)
    const { data: portfolio, error: pError } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', priyesh.id);

    if (pError) {
        console.error("❌ Error fetching portfolio for Priyesh:", pError.message);
        return;
    }

    const todayStr = "2026-07-13";
    const todayTrades = portfolio.filter(p => p.created_at && p.created_at.startsWith(todayStr));

    if (todayTrades.length === 0) {
        console.log(`📭 Priyesh had ZERO trades executed today (July 13, 2026).`);
    } else {
        console.log(`📦 Found ${todayTrades.length} trades executed today for Priyesh:`);
        todayTrades.forEach(t => {
            console.log(`  - Time: ${t.created_at} | Symbol: ${t.symbol} | Qty: ${t.quantity} | Avg Price: ₹${t.average_price}`);
        });
    }
}

checkPriyeshTrades();
