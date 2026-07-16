require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const supabase = require('../db');

async function main() {
    try {
        console.log("Checking active positions and trades for today...");
        
        // Fetch active positions (status = 'open' or created today)
        const { data: positions, error: posErr } = await supabase
            .from('portfolio')
            .select('*')
            .eq('user_id', '9ae19ceb-bf80-4719-b797-09b4f9751078')
            .gte('created_at', '2026-07-15T00:00:00Z');
            
        if (posErr) {
            console.error("Error:", posErr);
        } else {
            console.log(`Found ${positions.length} entries for today:`);
            console.log(JSON.stringify(positions, null, 2));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
