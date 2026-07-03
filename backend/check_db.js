const supabase = require('./db');

async function checkDatabase() {
    console.log("Checking Supabase tables...");
    
    const { data: users, error: userError } = await supabase.from('users').select('id, email, balance');
    if (userError) console.error("Error reading users:", userError);
    else console.log("Users:", users);

    const { data: portfolio, error: portfolioError } = await supabase.from('portfolio').select('*').order('created_at', { ascending: false }).limit(5);
    if (portfolioError) console.error("Error reading portfolio:", portfolioError);
    else console.log("Recent Portfolio Actions:", portfolio);

    process.exit(0);
}

checkDatabase();
