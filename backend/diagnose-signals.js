const fs = require('fs');
const axios = require('axios');
const speakeasy = require('speakeasy');
require('dotenv').config();

function calculateRSI(prices) {
    const period = 14;
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = Math.abs(losses / period);
    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateEMA(prices, period) {
    if (prices.length === 0) return 0;
    if (prices.length < period) return prices[prices.length - 1];
    const sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let ema = sma;
    const multiplier = 2 / (period + 1);
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
}

function generateSignal(rsi, prices, symbol) {
    if (prices.length < 50) return "WAIT";
    const ema9 = calculateEMA(prices, 9);
    const ema21 = calculateEMA(prices, 21);
    const ema50 = calculateEMA(prices, 50);

    const prevPrices = prices.slice(0, prices.length - 1);
    const prevEma9 = calculateEMA(prevPrices, 9);
    const prevEma21 = calculateEMA(prevPrices, 21);
    const prevEma50 = calculateEMA(prevPrices, 50);
    
    // Flat Market Filter (Option B)
    const ema50Slope = Math.abs(ema50 - prevEma50);
    let slopeLimit = 1.0; // NIFTY50
    let distanceLimit = 12; // NIFTY50
    
    if (symbol === "BANKNIFTY") {
        slopeLimit = 3.0;
        distanceLimit = 30;
    } else if (symbol === "SENSEX") {
        slopeLimit = 4.0;
        distanceLimit = 40;
    }
    
    const isFlatMarket = (ema50Slope < slopeLimit) && (Math.abs(ema9 - ema50) < distanceLimit || Math.abs(ema21 - ema50) < distanceLimit);
    
    const isBullishTrend = ema9 > ema50 && ema21 > ema50;
    const isBearishTrend = ema9 < ema50 && ema21 < ema50;

    const isFreshBullishCross = (prevEma9 <= prevEma21) && (ema9 > ema21);
    const isFreshBearishCross = (prevEma9 >= prevEma21) && (ema9 < ema21);
    
    if (rsi < 32 && isFreshBullishCross) {
        return "STRONG BUY (Oversold Reversal)";
    }
    if (rsi > 68 && isFreshBearishCross) {
        return "STRONG SELL (Overbought Reversal)";
    }
    
    if (!isFlatMarket) {
        if (isBullishTrend && rsi >= 48 && isFreshBullishCross) {
            return "BUY (Bullish Trend Cross)";
        }
        if (isBearishTrend && rsi <= 52 && isFreshBearishCross) {
            return "SELL (Bearish Trend Cross)";
        }
    }
    return "WAIT";
}

async function diagnose() {
    try {
        const totp = speakeasy.totp({ secret: process.env.ANGEL_TOTP_SECRET, encoding: 'base32' });
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
        
        const indices = [
            { name: "NIFTY50", token: "99926000", exch: "NSE" },
            { name: "BANKNIFTY", token: "99926009", exch: "NSE" },
            { name: "SENSEX", token: "99919000", exch: "BSE" }
        ];

        for (const idx of indices) {
            console.log(`\n🔍 Analyzing historical signals for ${idx.name}...`);
            const res = await axios.post(
                'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
                {
                    exchange: idx.exch,
                    symboltoken: idx.token,
                    interval: "FIVE_MINUTE",
                    fromdate: "2026-06-16 09:15",
                    todate: "2026-06-16 15:30"
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

            if (res.data?.data) {
                const candles = res.data.data;
                console.log(`Fetched ${candles.length} candles for ${idx.name}.`);
                const closePrices = candles.map(c => c[4]);
                
                // We slide through the closePrices to find signals at each 5-minute candle
                let signalCount = 0;
                for (let i = 50; i <= closePrices.length; i++) {
                    const subset = closePrices.slice(0, i);
                    const time = candles[i - 1][0];
                    const close = closePrices[i - 1];
                    const rsi = calculateRSI(subset);
                    const signal = generateSignal(rsi, subset, idx.name);
                    
                    const ema9 = calculateEMA(subset, 9);
                    const ema21 = calculateEMA(subset, 21);
                    const ema50 = calculateEMA(subset, 50);
                    
                    const prevPrices = subset.slice(0, subset.length - 1);
                    const prevEma9 = calculateEMA(prevPrices, 9);
                    const prevEma21 = calculateEMA(prevPrices, 21);
                    const prevEma50 = calculateEMA(prevPrices, 50);
                    
                    const ema50Slope = Math.abs(ema50 - prevEma50);
                    let slopeLimit = 1.0;
                    let distanceLimit = 12;
                    if (idx.name === "BANKNIFTY") { slopeLimit = 3.0; distanceLimit = 30; }
                    else if (idx.name === "SENSEX") { slopeLimit = 4.0; distanceLimit = 40; }
                    
                    const isFlat = (ema50Slope < slopeLimit) && (Math.abs(ema9 - ema50) < distanceLimit || Math.abs(ema21 - ema50) < distanceLimit);
                    
                    const isBullishCross = (prevEma9 <= prevEma21) && (ema9 > ema21);
                    const isBearishCross = (prevEma9 >= prevEma21) && (ema9 < ema21);
                    
                    if (isBullishCross) {
                        console.log(`📈 [Bullish Cross] Time: ${time} | Close: ${close} | RSI: ${rsi.toFixed(2)} | Trend Bullish?: ${ema9 > ema50 && ema21 > ema50} | Flat Market?: ${isFlat} (Slope: ${ema50Slope.toFixed(3)} vs ${slopeLimit}, Dist9: ${Math.abs(ema9-ema50).toFixed(1)}, Dist21: ${Math.abs(ema21-ema50).toFixed(1)}) | Signal: ${signal}`);
                    }
                    if (isBearishCross) {
                        console.log(`📉 [Bearish Cross] Time: ${time} | Close: ${close} | RSI: ${rsi.toFixed(2)} | Trend Bearish?: ${ema9 < ema50 && ema21 < ema50} | Flat Market?: ${isFlat} (Slope: ${ema50Slope.toFixed(3)} vs ${slopeLimit}, Dist9: ${Math.abs(ema9-ema50).toFixed(1)}, Dist21: ${Math.abs(ema21-ema50).toFixed(1)}) | Signal: ${signal}`);
                    }
                    
                    if (signal !== "WAIT") {
                        signalCount++;
                    }
                }
                if (signalCount === 0) {
                    console.log(`✅ No signals generated for ${idx.name} today.`);
                }
            } else {
                console.log(`❌ Failed to fetch candles for ${idx.name}:`, res.data);
            }
            // Cooldown between broker requests
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (err) {
        console.error("❌ Diagnostic error:", err.message);
    }
}

diagnose();
