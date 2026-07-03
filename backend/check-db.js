const supabase = require('./db');

async function checkDatabase() {
    const { data: portfolio, error: pError } = await supabase.from('portfolio').select('*');
    if (pError) console.error("Error fetching portfolio:", pError);
    else console.log("Current Portfolio Records:", portfolio);

    const { data: users, error: uError } = await supabase.from('users').select('id, email, balance');
    if (uError) console.error("Error fetching users:", uError);
    else console.log("Users and Balances:", users);
}

checkDatabase();
