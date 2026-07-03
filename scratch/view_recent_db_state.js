const fs = require('fs');
const path = require('path');
const supabase = require('../backend/db');

async function run() {
    console.log("=== SUPABASE BALANCE ===");
    const { data: users, error: uErr } = await supabase.from('users').select('*').eq('id', '9ae19ceb-bf80-4719-b797-09b4f9751078').single();
    if (uErr) console.error(uErr);
    else console.log(users);

    console.log("\n=== LAST 10 TRADES IN SUPABASE ===");
    const { data: trades, error: tErr } = await supabase.from('portfolio').select('*').order('created_at', { ascending: false }).limit(10);
    if (tErr) console.error(tErr);
    else console.log(JSON.stringify(trades, null, 2));
}

run();
