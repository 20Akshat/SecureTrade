const fs = require('fs');
const path = require('path');
const supabase = require('../backend/db');

const userId = '9ae19ceb-bf80-4719-b797-09b4f9751078';
const keepTradeId = '9d2f96f3-6a8e-4e38-942a-402e6e9dad19';
const localDbPath = path.join(__dirname, '../backend/local_db.json');

async function run() {
    try {
        console.log("=== STEP 1: DELETE FROM SUPABASE ===");
        // Delete all trades from today (July 1, 2026) except the keepTradeId
        const { data: delData, error: delErr } = await supabase
            .from('portfolio')
            .delete()
            .eq('user_id', userId)
            .gte('created_at', '2026-07-01T00:00:00.000Z')
            .neq('id', keepTradeId)
            .select();
            
        if (delErr) throw delErr;
        console.log("Deleted trades from Supabase:", delData ? delData.length : 0);

        console.log("\n=== STEP 2: DELETE FROM LOCAL DB ===");
        if (!fs.existsSync(localDbPath)) {
            throw new Error("local_db.json not found");
        }
        const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        const originalLength = localDb.portfolio.length;
        
        localDb.portfolio = localDb.portfolio.filter(t => {
            const isToday = t.created_at.startsWith('2026-07-01');
            const isKeep = t.id === keepTradeId;
            return !isToday || isKeep;
        });
        
        console.log(`Deleted ${originalLength - localDb.portfolio.length} trades from local DB.`);

        console.log("\n=== STEP 3: RECALCULATE BALANCE ===");
        // Sort trades by created_at
        localDb.portfolio.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        let finalBalance = 100000; // Starting balance
        localDb.portfolio.forEach(t => {
            const qty = Number(t.quantity);
            const price = Number(t.average_price);
            finalBalance -= (qty * price);
        });

        console.log(`Recalculated final balance: ₹${finalBalance.toFixed(2)}`);

        // Update balance in Supabase
        const { error: balErr } = await supabase.from('users').update({ balance: finalBalance }).eq('id', userId);
        if (balErr) throw balErr;
        console.log("Successfully updated balance in Supabase.");

        // Update balance in local DB file
        if (localDb.users && localDb.users[userId]) {
            localDb.users[userId].balance = finalBalance;
        }
        fs.writeFileSync(localDbPath, JSON.stringify(localDb, null, 2), 'utf8');
        console.log("Successfully saved local_db.json.");

        console.log("\n=== TODAY'S HISTORY CLEARED SUCCESSFULLY ===");
    } catch (err) {
        console.error("Error during execution:", err);
    }
}

run();
