const { createClient } = require('@supabase/supabase-js');
const ws = require('ws'); // <-- Naya tool import kiya (Fix 1)
require('dotenv').config();

let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_ANON_KEY;

const defaultUrl = 'https://zrjbalarugeplzfzakyf.supabase.co';
const defaultKey = 'sb_publishable_r6_0mZMlEtFsNtUWv8pwWQ_mTOWpDi5';

// If env is missing or points to the old dead Supabase URL, fallback to new project
if (!supabaseUrl || supabaseUrl.includes('jyohsmcpavqxkpoydtey')) {
    supabaseUrl = defaultUrl;
}
if (!supabaseKey || supabaseKey.includes('Pm3PWHSRwF2EelP4HDORPg')) {
    supabaseKey = defaultKey;
}

// Yahan humne Supabase ko alag se bata diya ki "ws" library kahan hai (Fix 2)
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false // Server mein cookies/localstorage nahi hota isliye false
    },
    realtime: {
        transport: ws 
    }
});

console.log("🟢 Database Connection Wire is Ready!");

module.exports = supabase;