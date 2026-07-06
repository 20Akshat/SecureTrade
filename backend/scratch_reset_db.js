require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const supabase = require('../backend/db');
const axios = require('axios');

async function resetDatabase() {
    console.log("🔍 Fetching portfolio records to filter KYC configurations...");
    try {
        // 1. Fetch all portfolio rows
        const { data: portfolioRows, error: fetchErr } = await supabase.from('portfolio').select('*');
        if (fetchErr) throw fetchErr;

        // Filter out KYC rows, preserve verification status so users don't have to re-verify!
        const rowsToDelete = portfolioRows.filter(row => !row.symbol.startsWith("KYC_CFG"));
        const deleteIds = rowsToDelete.map(row => row.id);

        if (deleteIds.length > 0) {
            console.log(`🧹 Deleting ${deleteIds.length} trade records from portfolio (KYC rows preserved)...`);
            const { error: delErr } = await supabase
                .from('portfolio')
                .delete()
                .in('id', deleteIds);
            if (delErr) throw delErr;
            console.log("✅ Portfolio trade records deleted successfully!");
        } else {
            console.log("ℹ️ No active option trades to delete from portfolio (KYC rows preserved).");
        }

        // 2. Delete all records from trades table (Order History)
        console.log("🧹 Clearing trades/orders history table...");
        const { error: tradeDelErr } = await supabase
            .from('trades')
            .delete()
            .neq('symbol', 'FAKE_SYMBOL_JUST_TO_DELETE_ALL');
        if (tradeDelErr) {
            console.warn("⚠️ Trades table clear warning (might be empty or missing):", tradeDelErr.message);
        } else {
            console.log("✅ Trades history table cleared successfully!");
        }

        // 3. Reset all user balances to 1 Lakh (100,000)
        console.log("💰 Resetting all user balances to ₹1,00,000...");
        const { error: balanceErr } = await supabase
            .from('users')
            .update({ balance: 100000 })
            .neq('email', 'placeholder_non_existent@test.com');
        if (balanceErr) throw balanceErr;
        console.log("✅ All user balances reset to ₹1,00,000!");

        // 4. Force invalidate backend memory cache for all users
        console.log("🔄 Invalidating backend cache for Siddharth, Harsh, and Akshat...");
        const userIds = [
            'be95e0cf-74c9-49e5-b128-6617a0a22ed3', // Siddharth
            '5fc17ce6-2432-4b73-9f5b-64c837c6577c', // Harsh
            '9ae19ceb-bf80-4719-b797-09b4f9751078'  // Akshat
        ];

        for (const uid of userIds) {
            try {
                await axios.post('https://securetrade-n3qh.onrender.com/api/admin/clear-trades-cache', {
                    userId: uid
                }, {
                    headers: { 'x-admin-secret': process.env.ANGEL_API_KEY }
                });
                console.log(`✅ Cleared cache for userId: ${uid}`);
            } catch (cacheErr) {
                console.warn(`⚠️ Cache clear warning for userId: ${uid} (Server might be sleeping):`, cacheErr.message);
            }
        }

        console.log("\n🎉 DATABASE RESET & CLEANUP COMPLETED PERFECTLY! KYC preserved, balances reset, and trade history cleared.");
    } catch (err) {
        console.error("❌ Reset error:", err.message);
    }
}

resetDatabase();