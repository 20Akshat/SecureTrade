const fs = require('fs');
const path = require('path');
const supabase = require('../backend/db');

async function run() {
    console.log("=== LOCAL DB TODAY'S TRADES ===");
    const localDbPath = path.join(__dirname, '../backend/local_db.json');
    if (fs.existsSync(localDbPath)) {
        const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        const matches = localDb.portfolio.filter(p => p.created_at.startsWith('2026-07-01'));
        console.log(JSON.stringify(matches, null, 2));
    }

    console.log("\n=== SUPABASE TODAY'S TRADES ===");
    const { data, error } = await supabase.from('portfolio').select('*');
    if (error) {
        console.error(error);
    } else {
        const matches = data.filter(p => p.created_at.startsWith('2026-07-01'));
        console.log(JSON.stringify(matches, null, 2));
    }
}

run();
