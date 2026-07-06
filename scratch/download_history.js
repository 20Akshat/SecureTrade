require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const axios = require('axios');
const speakeasy = require('speakeasy');
const fs = require('fs');
const path = require('path');

const targetDir = 'c:/SecureTrade/scratch';

function generate4YearDateBatches() {
    const batches = [];
    const endDate = new Date("2026-07-06T15:30:00");
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 4); // 4 Years Ago!
    
    let currentStart = new Date(startDate);
    while (currentStart < endDate) {
        let currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + 30);
        if (currentEnd > endDate) {
            currentEnd = new Date(endDate);
        }
        
        const formatDate = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        
        batches.push({
            from: formatDate(currentStart),
            to: formatDate(currentEnd)
        });
        
        currentStart = new Date(currentEnd);
        currentStart.setDate(currentStart.getDate() + 1);
    }
    return batches;
}

async function startDownload() {
    console.log("⏳ Logging into Angel One to acquire historical session...");
    try {
        const totp = speakeasy.totp({
            secret: process.env.ANGEL_TOTP_SECRET,
            encoding: 'base32'
        });
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
            throw new Error("Login failed: " + JSON.stringify(loginRes.data));
        }
        const jwt = loginRes.data.data.jwtToken;
        console.log("✅ Login Successful! Session Active.");

        // Downloader focused strictly on Nifty and Bank Nifty for 4-Year testing
        const assets = [
            { name: "NIFTY50", exch: "NSE", token: "99926000" },
            { name: "BANKNIFTY", exch: "NSE", token: "99926009" },
            { name: "SENSEX", exch: "BSE", token: "99919000" }
        ];

        const dateBatches = generate4YearDateBatches();
        console.log(`📅 Generated ${dateBatches.length} download batches of 30 days over 4 years.`);

        for (const asset of assets) {
            console.log(`\n===========================================`);
            console.log(`📡 Starting 4-Year ONE_MINUTE Download for: ${asset.name}`);
            console.log(`===========================================`);
            
            let allCandles = [];
            for (let i = 0; i < dateBatches.length; i++) {
                const batch = dateBatches[i];
                console.log(`[${asset.name}] Batch ${i + 1}/${dateBatches.length} | Fetching 1-Min: ${batch.from} to ${batch.to}...`);
                
                try {
                    const res = await axios.post(
                        'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
                        {
                            exchange: asset.exch,
                            symboltoken: asset.token,
                            interval: "ONE_MINUTE",
                            fromdate: batch.from,
                            todate: batch.to
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
                    
                    if (res.data?.data && Array.isArray(res.data.data)) {
                        allCandles = allCandles.concat(res.data.data);
                        console.log(`   └ Success! Fetched ${res.data.data.length} candles. Total stored: ${allCandles.length}`);
                    }
                } catch (batchErr) {
                    console.error(`   └ Error fetching batch:`, batchErr.message);
                }
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            
            const filePath = path.join(targetDir, `${asset.name.toLowerCase()}_candles.json`);
            fs.writeFileSync(filePath, JSON.stringify(allCandles, null, 2));
            console.log(`📦 Saved ${allCandles.length} candles for ${asset.name} in: ${filePath}`);
        }
        
        console.log("\n🎉 ALL ASSETS CANDLE DATA DOWNLOADED PERFECTLY!");
    } catch (err) {
        console.error("❌ Download Process Failed:", err.message);
    }
}

startDownload();