require('dotenv').config();
const axios = require('axios');
const speakeasy = require('speakeasy');
const fs = require('fs');

const scripMap = {};
const scripMasterPath = 'OpenAPIScripMaster.json';

console.log("Loading scrip master...");
if (fs.existsSync(scripMasterPath)) {
    const scrips = JSON.parse(fs.readFileSync(scripMasterPath, 'utf8'));
    scrips.forEach(s => {
        if (s.instrumenttype === 'OPTIDX' && (s.name === 'NIFTY' || s.name === 'BANKNIFTY' || s.name === 'SENSEX')) {
            const strikeVal = Math.round(parseFloat(s.strike) / 100);
            const optionType = s.symbol.endsWith('CE') ? 'CE' : 'PE';
            const key = `${s.name}_${s.expiry}_${strikeVal}_${optionType}`;
            scripMap[key] = {
                token: s.token,
                symbol: s.symbol,
                exch_seg: s.exch_seg,
                lotsize: Number(s.lotsize)
            };
        }
    });
    console.log(`Indexed ${Object.keys(scripMap).length} option contracts.`);
} else {
    console.log("Scrip master not found!");
}

function parseOptionSymbol(symbol) {
    const match = symbol.trim().match(/^(NIFTY50|BANKNIFTY|SENSEX)\s+(.+)\s+(\d+)\s+(CE|PE)$/i);
    if (!match) return null;

    const underlying = match[1].toUpperCase();
    const rawExpiry = match[2];
    const strike = match[3];
    const type = match[4].toUpperCase();

    let scripName = underlying;
    if (underlying === 'NIFTY50') scripName = 'NIFTY';

    const cleanExpiry = rawExpiry.replace(/[\s-,\.]/g, '').toUpperCase();
    if (cleanExpiry.length !== 7) return null;

    const day = cleanExpiry.substring(0, 2);
    const month = cleanExpiry.substring(2, 5);
    const year = cleanExpiry.substring(5, 7);
    const scripExpiry = `${day}${month}20${year}`;

    return { scripName, scripExpiry, strike, type };
}

async function testFetch() {
    const symbol = "NIFTY50 09 JUN 26 23200 CE";
    const parsed = parseOptionSymbol(symbol);
    console.log("Parsed:", parsed);
    if (!parsed) return;

    const key = `${parsed.scripName}_${parsed.scripExpiry}_${parsed.strike}_${parsed.type}`;
    console.log("Lookup Key:", key);
    const item = scripMap[key];
    console.log("Scrip Map Item:", item);
    if (!item) return;

    const totp = speakeasy.totp({
        secret: process.env.ANGEL_TOTP_SECRET,
        encoding: 'base32'
    });
    console.log(`Logging into Angel One... TOTP: ${totp}`);
    let angelJwtToken = null;
    try {
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
        } else {
            console.log('⚠️ Login Failed:', res.data?.message);
            return;
        }
    } catch (err) {
        console.log('⚠️ Login Error:', err.message);
        return;
    }

    const exchangeTokens = { "NFO": [item.token] };
    console.log("Fetching quote from Angel One...");
    try {
        const quoteRes = await axios.post(
            'https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/',
            { mode: "LTP", exchangeTokens },
            {
                headers: {
                    'Authorization': `Bearer ${angelJwtToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserType': 'USER',
                    'X-SourceID': 'WEB',
                    'X-PrivateKey': process.env.ANGEL_API_KEY
                },
                timeout: 4000
            }
        );
        console.log("Quote Response Status:", quoteRes.data?.status);
        console.log("Quote Response:", JSON.stringify(quoteRes.data?.data, null, 2));
    } catch (err) {
        console.log("Quote Fetch Error:", err.message);
    }
}

testFetch();
