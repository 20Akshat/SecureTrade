const supabase = require('../backend/db');

async function main() {
    try {
        const email = "akshatmarwadi5@gmail.com";
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (userError) throw userError;

        console.log(`Current user balance in DB: ${user.balance}`);

        // Set the balance to exactly 105902.00 to match the portfolio transaction cash flows
        const newBalance = 105902.00;
        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('email', email);
        if (updateError) throw updateError;

        console.log(`✅ Successfully updated balance for ${email} to ${newBalance}`);

    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();
