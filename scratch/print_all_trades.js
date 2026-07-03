const fs = require('fs');
const path = require('path');
const supabase = require('../backend/db');

async function run() {
    console.log("=== LOCAL DB ===");
    const localDbPath = path.join(__dirname, '../backend/local_db.json');
    if (fs.existsSync(localDbPath)) {
        const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        console.log("Total trades in Local DB:", localDb.portfolio.length);
        localDb.portfolio.forEach((p, idx) => {
            console.log(`${idx + 1}. ID: ${p.id}, Symbol: ${p.symbol}, Qty: ${p.quantity}, AvgPrice: ${p.average_price}, Created: ${p.created_at}, Status: ${p.status}`);
        });
    }

    console.log("\n=== SUPABASE ===");
    const { data, error } = await supabase.from('portfolio').select('*').order('created_at', { ascending: true });
    if (error) {
        console.error(error);
    } else {
        console.log("Total trades in Supabase:", data.length);
        data.forEach((p, idx) => {
            console.log(`${idx + 1}. ID: ${p.id}, Symbol: ${p.symbol}, Qty: ${p.quantity}, AvgPrice: ${p.average_price}, Created: ${p.created_at}, Status: ${p.status}`);
        });
    }
}

run();
