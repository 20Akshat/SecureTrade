const fs = require('fs');
const path = require('path');
const supabase = require('../backend/db');

async function run() {
    const localDbPath = path.join(__dirname, '../backend/local_db.json');
    const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    const localTrades = localDb.portfolio;

    const { data: supTrades, error } = await supabase.from('portfolio').select('*').order('created_at', { ascending: true });
    if (error) {
        console.error(error);
        return;
    }

    console.log("Local Trades Count:", localTrades.length);
    console.log("Supabase Trades Count:", supTrades.length);

    // Let's check if all IDs match
    const localIds = localTrades.map(t => t.id).sort();
    const supIds = supTrades.map(t => t.id).sort();
    
    let allMatch = true;
    for (let i = 0; i < Math.max(localIds.length, supIds.length); i++) {
        if (localIds[i] !== supIds[i]) {
            console.log(`Mismatch at index ${i}: Local=${localIds[i]}, Supabase=${supIds[i]}`);
            allMatch = false;
        }
    }
    if (allMatch) {
        console.log("✅ All trade IDs match perfectly between Local DB and Supabase!");
    }

    // Let's calculate the balance step-by-step
    let balance = 100000;
    localTrades.forEach((t, idx) => {
        const qty = Number(t.quantity);
        const price = Number(t.average_price);
        balance -= (qty * price);
        console.log(`${idx + 1}. Symbol: ${t.symbol}, Qty: ${qty}, Price: ${price}, Cost: ${qty * price}, Running Balance: ${balance.toFixed(2)}`);
    });
}

run();
