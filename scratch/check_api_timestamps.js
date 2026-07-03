const axios = require('c:/SecureTrade/backend/node_modules/axios');
require('c:/SecureTrade/backend/node_modules/dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const supabase = require('../backend/db');

async function run() {
    try {
        const res = await axios.get('http://localhost:5001/api/historical-candles?symbol=NIFTY50&timeframe=5&range=Y');
        console.log("Total candles returned:", res.data.length);
        if (res.data.length > 0) {
            console.log("First 3 candles:");
            console.log(res.data.slice(0, 3));
            console.log("Last 3 candles:");
            console.log(res.data.slice(res.data.length - 3));
        }
    } catch (err) {
        console.error("API Call failed:", err.message);
    }
}

run();
