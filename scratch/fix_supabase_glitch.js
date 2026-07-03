require('dotenv').config({ path: '../backend/.env' });
const supabase = require('../backend/db');

async function fixSupabase() {
  const userId = "9ae19ceb-bf80-4719-b797-09b4f9751078";
  
  console.log("--- Supabase User Check ---");
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('balance, email')
    .eq('id', userId)
    .single();

  if (userErr) {
    console.error("Failed to read user from Supabase:", userErr.message);
  } else {
    console.log(`Current Supabase Balance: ₹${user.balance} for ${user.email}`);
    const newBalance = Number(user.balance) + 7750;
    
    // Update user balance in Supabase
    const { error: updateErr } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);
      
    if (updateErr) {
      console.error("Failed to update balance in Supabase:", updateErr.message);
    } else {
      console.log(`Successfully updated balance in Supabase: ₹${user.balance} -> ₹${newBalance}`);
    }
  }

  console.log("--- Supabase Portfolio Check ---");
  // Delete the two glitched transactions
  const idsToDelete = [
    "0cdf2d50-6fa1-4bca-a3eb-595ddb21138f",
    "0892b969-0fb2-4c36-a299-a2fe69bb910e"
  ];
  
  const { data: deleted, error: deleteErr } = await supabase
    .from('portfolio')
    .delete()
    .in('id', idsToDelete)
    .select();
    
  if (deleteErr) {
    console.error("Failed to delete glitched portfolio rows from Supabase:", deleteErr.message);
  } else {
    console.log("Successfully deleted glitched rows from Supabase:", deleted);
  }
}

fixSupabase();
