require('dotenv').config();
const axios = require('axios');
const speakeasy = require('speakeasy');
const fs = require('fs');

let angelJwtToken = null;

async function angelLogin() {
    try {
        const totp = speakeasy.totp({
            secret: process.env.ANGEL_TOTP_SECRET,
            encoding: 'base32'
        });
        console.log(`🔐 Logging into Angel One... TOTP: ${totp}`);
        const res = await axios.post(
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
        if (res.data?.status && res.data?.data?.jwtToken) {
            angelJwtToken = res.data.data.jwtToken;
            console.log('✅ Angel One Login Successful!');
            return true;
        }
        console.log('⚠️ Login Failed:', res.data?.message);
        return false;
    } catch (err) {
        console.log('⚠️ Angel One Login Error:', err.message);
        return false;
    }
}

async function testOptionsFetch() {
    await angelLogin();
    if (!angelJwtToken) return;

    console.log("Loading scrip master...");
    const scrips = JSON.parse(fs.readFileSync('OpenAPIScripMaster.json', 'utf8'));
    console.log("Indexing...");
    const scripMap = {};
    scrips.forEach(s => {
        if (s.instrumenttype === 'OPTIDX' && (s.name === 'NIFTY' || s.name === 'BANKNIFTY' || s.name === 'SENSEX')) {
            const strikeVal = Math.round(parseFloat(s.strike) / 100);
            const optionType = s.symbol.endsWith('CE') ? 'CE' : 'PE';
            const key = `${s.name}_${s.expiry}_${strikeVal}_${optionType}`;
            scripMap[key] = {
                token: s.token,
                symbol: s.symbol,
                exch_seg: s.exch_seg
            };
        }
    });

    // Let's pick some NIFTY options for 09JUN2026 around strike 21200, 21300, 21400
    const keysToFetch = [
        "NIFTY_09JUN2026_21200_CE",
        "NIFTY_09JUN2026_21200_PE",
        "NIFTY_09JUN2026_21300_CE",
        "NIFTY_09JUN2026_21300_PE"
    ];

    const tokensNFO = [];
    keysToFetch.forEach(k => {
        const item = scripMap[k];
        if (item) tokensNFO.push(item.token);
    });

    console.log(`Tokens to fetch:`, tokensNFO);

    if (tokensNFO.length === 0) {
        console.log("No tokens found for lookup keys!");
        return;
    }

    try {
        const res = await axios.post(
            'https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/',
            { mode: "LTP", exchangeTokens: { "NFO": tokensNFO } },
            {
                headers: {
                    'Authorization': `Bearer ${angelJwtToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-PrivateKey': process.env.ANGEL_API_KEY
                }
            }
        );
        console.log("Angel API Response Status:", res.data?.status);
        console.log("Angel API Data:", JSON.stringify(res.data?.data, null, 2));
    } catch (err) {
        console.log("Error during options quote fetch:", err.message);
        if (err.response) {
            console.log("Response data:", err.response.data);
        }
    }
}

testOptionsFetch();
