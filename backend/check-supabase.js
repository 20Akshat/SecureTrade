require('dotenv').config();
const supabase = require('./db');

async function checkUser() {
    const { data, error } = await supabase.from('users').select('*').eq('id', '9ae19ceb-bf80-4719-b797-09b4f9751078').single();
    if (error) {
        console.error("Error reading Supabase:", error);
    } else {
        console.log("User details:");
        console.log(data);
    }
}

checkUser();
