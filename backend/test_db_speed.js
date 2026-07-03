const supabase = require('./db');

async function testSpeed() {
    console.log("🚀 Starting DB speed test...");

    const start1 = Date.now();
    const { data: users, error: err1 } = await supabase.from('users').select('id').limit(1);
    console.log(`⏱️ Query 1 (Users limit 1): ${Date.now() - start1}ms`);
    if (err1) console.error(err1);

    const start2 = Date.now();
    const { data: port, error: err2 } = await supabase.from('portfolio').select('id').limit(1);
    console.log(`⏱️ Query 2 (Portfolio limit 1): ${Date.now() - start2}ms`);
    if (err2) console.error(err2);

    const start3 = Date.now();
    const { data: users2, error: err3 } = await supabase.from('users').select('id').limit(1);
    console.log(`⏱️ Query 3 (Users limit 1 - repeat): ${Date.now() - start3}ms`);

    process.exit(0);
}

testSpeed();
