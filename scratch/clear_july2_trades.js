const fs = require('fs');
const path = require('path');
const supabase = require('../backend/db');

const userId = '9ae19ceb-bf80-4719-b797-09b4f9751078';
const localDbPath = path.join(__dirname, '../backend/local_db.json');

async function run() {
    try {
        console.log("=== STEP 1: DELETE TODAY'S TRADES FROM SUPABASE ===");
        // Delete all trades created on July 2, 2026
        const { data: delData, error: delErr } = await supabase
            .from('portfolio')
            .delete()
            .eq('user_id', userId)
            .gte('created_at', '2026-07-02T00:00:00.000Z')
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
            return !t.created_at.startsWith('2026-07-02');
        });
        
        console.log(`Deleted ${originalLength - localDb.portfolio.length} trades from local DB.`);

        console.log("\n=== STEP 3: RECALCULATE AND SET BALANCE ===");
        // Sort trades by created_at
        localDb.portfolio.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        let finalBalance = 100000; // Starting balance
        localDb.portfolio.forEach(t => {
            const qty = Number(t.quantity);
            const price = Number(t.average_price);
            finalBalance -= (qty * price);
        });

        console.log(`Recalculated final balance (restored): ₹${finalBalance.toFixed(2)}`);

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

        console.log("\n=== TODAY'S CLEANUP AND RESTORATION COMPLETE ===");
    } catch (err) {
        console.error("Error during execution:", err);
    }
}

run();
