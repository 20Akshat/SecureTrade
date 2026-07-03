const supabase = require('../backend/db');

async function run() {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log("Columns in users table:", Object.keys(data[0] || {}));
    }
}

run();
