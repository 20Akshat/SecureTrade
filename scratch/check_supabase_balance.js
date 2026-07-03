const supabase = require('../backend/db');

async function run() {
    const { data: users, error } = await supabase.from('users').select('*').eq('id', '9ae19ceb-bf80-4719-b797-09b4f9751078').single();
    if (error) {
        console.error(error);
    } else {
        console.log("Supabase User balance:", users.balance);
        console.log("Full User record:", users);
    }
}

run();
