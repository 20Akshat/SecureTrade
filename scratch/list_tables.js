const supabase = require('../backend/db');

async function listTables() {
    try {
        console.log("🔍 Checking all tables in Supabase public schema...");
        
        // Query to check existing tables
        const { data, error } = await supabase.rpc('get_tables'); // Or try standard query if rpc doesn't exist
        if (error) {
            // Fallback: try fetching from typical tables to see if they exist
            const tables = ['users', 'portfolio', 'trades', 'logs', 'system_status', 'bot_state'];
            for (const table of tables) {
                const { data: checkData, error: checkError } = await supabase
                    .from(table)
                    .select('*')
                    .limit(1);
                if (checkError) {
                    console.log(`❌ Table '${table}' does not exist or has error: ${checkError.message}`);
                } else {
                    console.log(`✅ Table '${table}' exists and is accessible.`);
                }
            }
        } else {
            console.log("Tables list:", data);
        }

    } catch (err) {
        console.error("Error listing tables:", err.message);
    }
}

listTables();
