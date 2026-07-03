const supabase = require('./db');


async function checkDatabase() {
    const start = Date.now();
    console.log("⏳ Querying users without realtime transport...");
    
    const { data: users, error: userError } = await supabase.from('users').select('id, email, balance');
    if (userError) console.error("Error reading users:", userError);
    else console.log(`✅ Users (took ${Date.now() - start}ms):`, users);

    const startPort = Date.now();
    const { data: portfolio, error: portfolioError } = await supabase.from('portfolio').select('*').limit(2);
    if (portfolioError) console.error("Error reading portfolio:", portfolioError);
    else console.log(`✅ Portfolio (took ${Date.now() - startPort}ms):`, portfolio);

    process.exit(0);
}

checkDatabase();
