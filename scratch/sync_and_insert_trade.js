const fs = require('fs');
const path = require('path');
const supabase = require('../backend/db');
const crypto = require('crypto');

const userId = '9ae19ceb-bf80-4719-b797-09b4f9751078';
const localDbPath = path.join(__dirname, '../backend/local_db.json');

async function run() {
    try {
        console.log("=== STEP 1: READ LOCAL DB ===");
        if (!fs.existsSync(localDbPath)) {
            throw new Error("local_db.json not found");
        }
        const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        const localTrades = localDb.portfolio;
        console.log(`Read ${localTrades.length} trades from local DB.`);

        console.log("\n=== STEP 2: READ SUPABASE ===");
        const { data: supTrades, error: supErr } = await supabase.from('portfolio').select('*').order('created_at', { ascending: true });
        if (supErr) throw supErr;
        console.log(`Read ${supTrades.length} trades from Supabase.`);

        // Find missing trades in Supabase (trades in local DB that are not in Supabase)
        const missingInSupabase = localTrades.filter(lt => !supTrades.some(st => st.id === lt.id));
        console.log(`Found ${missingInSupabase.length} trades in local DB that are missing in Supabase.`);

        for (const mt of missingInSupabase) {
            console.log(`Inserting missing trade to Supabase: ${mt.id} (${mt.symbol}, Qty: ${mt.quantity})`);
            const { error: insErr } = await supabase.from('portfolio').insert([{
                id: mt.id,
                user_id: mt.user_id,
                symbol: mt.symbol,
                quantity: Number(mt.quantity),
                average_price: Number(mt.average_price),
                created_at: mt.created_at,
                status: mt.status,
                stop_loss: mt.stop_loss,
                take_profit: mt.take_profit,
                pnl: Number(mt.pnl || 0)
            }]);
            if (insErr) {
                console.error(`Failed to insert trade ${mt.id} into Supabase:`, insErr);
            } else {
                console.log(`Successfully synced trade ${mt.id} to Supabase.`);
            }
        }

        // Find missing trades in local DB (trades in Supabase that are not in local DB)
        const missingInLocal = supTrades.filter(st => !localTrades.some(lt => lt.id === st.id));
        console.log(`Found ${missingInLocal.length} trades in Supabase that are missing in local DB.`);
        for (const mt of missingInLocal) {
            console.log(`Inserting missing trade to local DB: ${mt.id}`);
            localTrades.push(mt);
        }

        console.log("\n=== STEP 3: INSERT MISSING SENSEX PE SELL TRADE ===");
        const sellSymbol = 'SENSEX 02 JUL 26 76900 PE';
        const hasSellAlready = localTrades.some(t => t.symbol === sellSymbol && Number(t.quantity) < 0 && t.created_at.startsWith('2026-06-29'));
        
        if (!hasSellAlready) {
            const sellTradeId = crypto.randomUUID();
            const sellTrade = {
                id: sellTradeId,
                user_id: userId,
                symbol: sellSymbol,
                quantity: -20,
                average_price: 516.95,
                created_at: '2026-06-29T07:15:00.000Z',
                status: 'open',
                stop_loss: null,
                take_profit: null,
                pnl: 0
            };
            console.log("Inserting new SENSEX PE SELL trade:", sellTrade);

            // Insert to Supabase
            const { error: insErr } = await supabase.from('portfolio').insert([sellTrade]);
            if (insErr) throw insErr;
            console.log("Successfully inserted SELL trade to Supabase.");

            // Insert to local DB array
            localTrades.push(sellTrade);
        } else {
            console.log("SENSEX PE SELL trade already exists, skipping insertion.");
        }

        console.log("\n=== STEP 4: RECALCULATE BALANCE AND SYNC ===");
        localTrades.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        let finalBalance = 100000;
        localTrades.forEach(t => {
            const qty = Number(t.quantity);
            const price = Number(t.average_price);
            finalBalance -= (qty * price);
        });

        console.log(`Recalculated final balance: ₹${finalBalance.toFixed(2)}`);

        // Update in Supabase
        const { error: balErr } = await supabase.from('users').update({ balance: finalBalance }).eq('id', userId);
        if (balErr) throw balErr;
        console.log("Successfully updated balance in Supabase.");

        // Update in local DB file
        localDb.portfolio = localTrades;
        if (localDb.users && localDb.users[userId]) {
            localDb.users[userId].balance = finalBalance;
        }
        fs.writeFileSync(localDbPath, JSON.stringify(localDb, null, 2), 'utf8');
        console.log("Successfully saved local_db.json.");

        console.log("\n=== BALANCE AUDIT SYNC COMPLETE ===");
    } catch (err) {
        console.error("Error during execution:", err);
    }
}

run();
