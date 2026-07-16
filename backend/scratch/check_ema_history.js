require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const axios = require('axios');
const speakeasy = require('speakeasy');

function calculateEMA(prices, period) {
    if (prices.length === 0) return [];
    const ema = [];
    const k = 2 / (period + 1);
    
    let sum = 0;
    const limit = Math.min(period, prices.length);
    for (let i = 0; i < limit; i++) {
        sum += prices[i];
    }
    let prevEma = sum / limit;
    
    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            ema.push(prices[i]);
        } else if (i === period - 1) {
            ema.push(prevEma);
        } else {
            const curEma = (prices[i] * k) + (prevEma * (1 - k));
            ema.push(curEma);
            prevEma = curEma;
        }
    }
    return ema;
}

async function main() {
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
        const jwt = loginRes.data.data.jwtToken;
        
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (3600000 * 5.5));
        const todayStr = ist.toISOString().split('T')[0];
        
        const res = await axios.post(
            'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
            {
                exchange: "NSE",
                symboltoken: "99926000",
                interval: "ONE_MINUTE",
                fromdate: `${todayStr} 09:15`,
                todate: `${todayStr} 09:47`
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

        if (res && res.data?.data && res.data.data.length > 0) {
            const candles = res.data.data.map(c => ({
                time: c[0],
                open: c[1],
                high: c[2],
                low: c[3],
                close: c[4]
            }));
            
            const firstCandle = candles[0];
            const closes = candles.map(c => c.close);
            const ema3Arr = calculateEMA(closes, 3);
            const ema9Arr = calculateEMA(closes, 9);
            
            console.log("\nTime     | Close    | EMA 3   | EMA 9   | Close > High | EMA3 > EMA9 | Trigger?");
            console.log("---------------------------------------------------------------------------------");
            for (let i = 0; i < candles.length; i++) {
                const c = candles[i];
                const ema3 = ema3Arr[i];
                const ema9 = ema9Arr[i];
                const timeStr = c.time.split('T')[1].slice(0, 5);
                const isPriceAboveRange = c.close > firstCandle.high;
                const isEmaBullish = ema3 > ema9;
                const isTrigger = isPriceAboveRange && isEmaBullish;
                
                console.log(
                    `${timeStr.padEnd(8)} | ` +
                    `${c.close.toFixed(2).padEnd(8)} | ` +
                    `${ema3.toFixed(2).padEnd(7)} | ` +
                    `${ema9.toFixed(2).padEnd(7)} | ` +
                    `${String(isPriceAboveRange).padEnd(12)} | ` +
                    `${String(isEmaBullish).padEnd(11)} | ` +
                    `${isTrigger ? "🔥 BUY" : "❌"}`
                );
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
