require('dotenv').config();
const supabase = require('./db');

async function resetDatabase() {
    console.log("🧹 Cleaning up old corrupted portfolio data...");
    
    // Portfolio table ka saara kachra saaf kar dega
    const { error } = await supabase
        .from('portfolio')
        .delete()
        .neq('symbol', 'FAKE_SYMBOL_JUST_TO_DELETE_ALL'); // Supabase ko delete ke liye ek condition chahiye hoti hai

    if (error) {
        console.error("❌ Error resetting portfolio:", error);
    } else {
        console.log("✅ Portfolio Trade History Cleared!");
    }

    console.log("💰 Resetting user balances to ₹1,00,000...");
    const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: 100000 })
        .neq('email', 'non_existent_placeholder@test.com');

    if (balanceError) {
        console.error("❌ Error resetting balances:", balanceError);
    } else {
        console.log("✅ All user balances successfully reset to ₹1,00,000! 🚀");
    }
}

resetDatabase();