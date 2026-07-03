const supabase = require('./db');

async function resetDatabase() {
    console.log("⏳ Connecting to database and resetting data...");

    // 1. Delete all portfolio entries
    const { error: portfolioError } = await supabase
        .from('portfolio')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (portfolioError) {
        console.error("❌ Error clearing portfolio:", portfolioError);
    } else {
        console.log("✅ Portfolio table cleared successfully!");
    }

    // 2. Reset balance for all users to 100000
    const { error: userError } = await supabase
        .from('users')
        .update({ balance: 100000 })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    if (userError) {
        console.error("❌ Error resetting user balances:", userError);
    } else {
        console.log("✅ User balances reset to 100,000 successfully!");
    }

    process.exit(0);
}

resetDatabase();
