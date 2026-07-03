require('dotenv').config();
const axios = require('axios');
const speakeasy = require('speakeasy');

async function testLivePrices() {
    try {
        const totp = speakeasy.totp({
            secret: process.env.ANGEL_TOTP_SECRET,
            encoding: 'base32'
        });
        console.log(`🔐 TOTP: ${totp}`);
        const loginRes = await axios.post(
            'https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword',
            { clientcode: process.env.ANGEL_CLIENT_ID, password: process.env.ANGEL_PASSWORD, totp },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-ClientLocalIP': '192.168.1.1',
                    'X-ClientPublicIP': '106.202.70.114',
                    'X-MACAddress': '00:00:00:00:00:00',
                    'X-PrivateKey': process.env.ANGEL_API_KEY
                }
            }
        );
        if (!loginRes.data?.status || !loginRes.data?.data?.jwtToken) {
            console.log("❌ Login Failed:", loginRes.data);
            return;
        }
        const jwt = loginRes.data.data.jwtToken;
        console.log("✅ Login Successful!");

        const quoteRes = await axios.post(
            'https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/',
            { mode: "LTP", exchangeTokens: { "NSE": ["26000", "26009"], "BSE": ["1"] } },
            {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-PrivateKey': process.env.ANGEL_API_KEY
                }
            }
        );
        console.log("✅ Quotes response:", JSON.stringify(quoteRes.data, null, 2));
    } catch (err) {
        console.error("❌ Error:", err.message);
        if (err.response) {
            console.error("Response data:", err.response.data);
        }
    }
}

testLivePrices();
