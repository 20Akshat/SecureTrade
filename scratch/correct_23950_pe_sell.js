const fs = require('fs');
const path = require('path');
const supabase = require('../backend/db');

const userId = '9ae19ceb-bf80-4719-b797-09b4f9751078';
const tradeId = '22a1e610-3f47-4520-a74e-64fff04a5d11';
const correctedPrice = 81.50; // Corrected sell price to represent actual market price
const localDbPath = path.join(__dirname, '../backend/local_db.json');

async function run() {
    try {
        console.log("=== STEP 1: UPDATE IN SUPABASE ===");
        const { data: updateRes, error: updateErr } = await supabase
            .from('portfolio')
            .update({ average_price: correctedPrice })
            .eq('id', tradeId)
            .select();
        if (updateErr) throw updateErr;
        console.log("Supabase update response:", updateRes);

        console.log("\n=== STEP 2: UPDATE IN LOCAL DB ===");
        if (!fs.existsSync(localDbPath)) {
            throw new Error("local_db.json not found");
        }
        const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        const tradeIndex = localDb.portfolio.findIndex(t => t.id === tradeId);
        if (tradeIndex !== -1) {
            localDb.portfolio[tradeIndex].average_price = correctedPrice;
            console.log("Updated trade in local DB array.");
        } else {
            console.warn("Trade not found in local DB portfolio array.");
        }

        console.log("\n=== STEP 3: RECALCULATE BALANCE ===");
        // Sort trades by created_at
        localDb.portfolio.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        let finalBalance = 100000;
        localDb.portfolio.forEach((t, idx) => {
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

        console.log("\n=== CORRECTION COMPLETE ===");
    } catch (err) {
        console.error("Error during execution:", err);
    }
}

run();
