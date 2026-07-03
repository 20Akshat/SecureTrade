const supabase = require('../backend/db');

async function main() {
    const { data: users } = await supabase.from('users').select('*').eq('email', 'akshatmarwadi5@gmail.com');
    if (!users || users.length === 0) {
        console.log("User not found");
        return;
    }
    const user = users[0];
    console.log(`User: ${user.email} | ID: ${user.id} | Balance in DB: ${user.balance}`);
    
    const { data: portfolio } = await supabase.from('portfolio').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    
    let cashFlowSum = 0;
    portfolio.forEach(p => {
        const qty = Number(p.quantity);
        const price = Number(p.average_price);
        const cost = qty * price;
        cashFlowSum += cost;
    });
    
    const initialBalance = 100000;
    const expectedBalance = initialBalance - cashFlowSum;
    console.log(`\nInitial Balance: ₹${initialBalance}`);
    console.log(`Sum of all trades cost (debits - credits): ₹${cashFlowSum}`);
    console.log(`Expected Balance (Initial - Sum): ₹${expectedBalance}`);
    console.log(`Difference (DB - Expected): ₹${user.balance - expectedBalance}`);
    
    process.exit(0);
}

main();
