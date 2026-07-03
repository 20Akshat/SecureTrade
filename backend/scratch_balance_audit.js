const supabase = require('./db');

async function run() {
    try {
        const userId = '9ae19ceb-bf80-4719-b797-09b4f9751078';
        const { data: user, error: ue } = await supabase.from('users').select('*').eq('id', userId).single();
        if (ue) throw ue;
        console.log(`Current DB Balance: ₹${user.balance}`);

        const { data: executions, error: pe } = await supabase.from('portfolio').select('*').eq('user_id', userId).order('created_at', { ascending: true });
        if (pe) throw pe;

        let calculatedBalance = 199340; // Let's start with 199340 (which was the restored balance)
        console.log(`\nStarting calculation from ₹199,340...`);

        executions.forEach(exec => {
            const qty = exec.quantity;
            const price = exec.average_price;
            const cost = qty * price;
            // When buying (qty > 0), balance decreases by cost
            // When selling (qty < 0), balance increases by cost (which is negative, so we subtract cost)
            calculatedBalance -= cost;
            console.log(`${exec.created_at} | ${exec.symbol} | Qty: ${qty} | Price: ₹${price} | Exec Cost: ₹${cost.toFixed(2)} | Calculated Bal: ₹${calculatedBalance.toFixed(2)}`);
        });

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
