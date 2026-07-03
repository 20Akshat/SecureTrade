const fs = require('fs');
const path = require('path');
const supabase = require('../backend/db');

async function run() {
    const localDbPath = path.join(__dirname, '../backend/local_db.json');
    const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    const localToday = localDb.portfolio.filter(p => p.created_at.startsWith('2026-06-29'));

    const { data: supabaseToday, error } = await supabase.from('portfolio').select('*');
    if (error) {
        console.error(error);
        return;
    }
    const supToday = supabaseToday.filter(p => p.created_at.startsWith('2026-06-29'));

    console.log("=== LOCAL DB ONLY ===");
    const localOnly = localToday.filter(l => !supToday.some(s => s.id === l.id));
    console.log(JSON.stringify(localOnly, null, 2));

    console.log("\n=== SUPABASE ONLY ===");
    const supOnly = supToday.filter(s => !localToday.some(l => l.id === s.id));
    console.log(JSON.stringify(supOnly, null, 2));
}

run();
