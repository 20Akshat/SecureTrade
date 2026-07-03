const { createClient } = require('@supabase/supabase-js');
const ws = require('ws'); // <-- Naya tool import kiya (Fix 1)
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

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