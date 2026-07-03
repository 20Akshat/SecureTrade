const axios = require('axios');

async function testBackend() {
    try {
        const res = await axios.post('http://localhost:5001/api/options-chain/quotes', {
            underlying: "NIFTY50",
            expiryLabel: "09 JUN 26",
            strikes: [22900]
        });
        console.log("Response from backend (spaces test):", JSON.stringify(res.data, null, 2));
    } catch(err) {
        console.error("Backend request failed:", err.message);
    }
}

testBackend();
