require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const axios = require('axios');
const speakeasy = require('speakeasy');

async function testHistorical() {
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

        const indices = [
            { name: "NIFTY50", exch: "NSE", token: "99926000" },
            { name: "BANKNIFTY", exch: "NSE", token: "99926009" },
            { name: "SENSEX", exch: "BSE", token: "99919000" }
        ];

        for (const idx of indices) {
            const res = await axios.post(
                'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
                {
                    exchange: idx.exch,
                    symboltoken: idx.token,
                    interval: "FIVE_MINUTE",
                    fromdate: "2026-06-15 09:15",
                    todate: "2026-06-16 09:40"
                },
                {
                    headers: {
                        'Authorization': `Bearer ${jwt}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-UserType': 'USER',
                        'X-SourceID': 'WEB',
                        'X-PrivateKey': process.env.ANGEL_API_KEY,
                        'X-ClientLocalIP': '192.168.1.1',
                        'X-ClientPublicIP': '106.202.70.114',
                        'X-MACAddress': '00:00:00:00:00:00'
                    }
                }
            );
            console.log(`\n📈 [${idx.name}] Historical response status:`, res.data?.status);
            if (res.data?.data) {
                console.log(`📈 [${idx.name}] Candles fetched count:`, res.data.data.length);
                if (res.data.data.length > 0) {
                    console.log(`📈 [${idx.name}] First candle:`, res.data.data[0]);
                    console.log(`📈 [${idx.name}] Last candle:`, res.data.data[res.data.data.length - 1]);
                }
            } else {
                console.log(`⚠️ [${idx.name}] No data returned:`, res.data);
            }
        }
    } catch (err) {
        console.error("❌ Error:", err.message);
        if (err.response) {
            console.error("Response data:", err.response.data);
        }
    }
}

testHistorical();
