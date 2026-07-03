const supabase = require('./db');

async function run() {
    try {
        const { data: users, error: ue } = await supabase.from('users').select('*');
        if (ue) throw ue;
        console.log("=== USERS ===");
        users.forEach(u => console.log(`${u.id} | ${u.email} | Balance: ₹${u.balance}`));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
