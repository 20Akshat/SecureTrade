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

async function runTodayDetails() {
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
            { name: "NIFTY50", exch: "NSE", token: "99926000", lotSize: 65, step: 50, standardPremium: 110 },
            { name: "BANKNIFTY", exch: "NSE", token: "99926009", lotSize: 30, step: 100, standardPremium: 280 },
            { name: "SENSEX", exch: "BSE", token: "99919000", lotSize: 20, step: 100, standardPremium: 140 }
        ];

        const todayStr = "2026-07-10";

        for (const idx of indices) {
            console.log(`\n==========================================================================`);
            console.log(`🔍 TODAY'S DETAILED TRADES FOR: ${idx.name} (10 JULY 2026)`);
            console.log(`==========================================================================`);

            // Fetch today's candles
            const res = await axios.post(
                'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
                {
                    exchange: idx.exch,
                    symboltoken: idx.token,
                    interval: "ONE_MINUTE",
                    fromdate: `${todayStr} 09:15`,
                    todate: `${todayStr} 15:30`
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

            if (!res.data?.data || res.data.data.length === 0) {
                console.log(`❌ Failed to fetch data for ${idx.name}`);
                continue;
            }

            const candles = res.data.data.sort((a,b) => a[0].localeCompare(b[0]));
            const firstCandle = candles[0];
            const firstHigh = firstCandle[2];
            const firstLow = firstCandle[3];

            console.log(`📍 Open Price: ${firstCandle[1]} | First 1-min High: ${firstHigh} | First 1-min Low: ${firstLow}`);

            // Setup Target and SL configs: 
            // 1. Original Config (+15% / -7% option)
            // 2. Safe Config (+15% / -15% option)
            let configOriginal, configSafe;
            if (idx.name === "NIFTY50") {
                configOriginal = { target: 30, sl: 14, label: "Original (+15%/-7%)" };
                configSafe = { target: 30, sl: 30, label: "Safe (+15%/-15%)" };
            } else if (idx.name === "BANKNIFTY") {
                configOriginal = { target: 84, sl: 39, label: "Original (+15%/-7%)" };
                configSafe = { target: 84, sl: 84, label: "Safe (+15%/-15%)" };
            } else { // SENSEX
                configOriginal = { target: 42, sl: 20, label: "Original (+15%/-7%)" };
                configSafe = { target: 42, sl: 42, label: "Safe (+15%/-15%)" };
            }

            const configsToRun = [configOriginal, configSafe];

            for (const conf of configsToRun) {
                console.log(`\n🤖 Running simulation: ${conf.label}`);
                let activeTrade = null;
                let tradesToday = 0;
                const history1m = [];

                for (const c of candles) {
                    const timeStr = c[0].split('T')[1].slice(0, 5); // "09:15"
                    const hour = parseInt(timeStr.slice(0, 2));
                    const min = parseInt(timeStr.slice(3, 5));
                    const timeVal = hour * 100 + min;

                    const openPrice = c[1];
                    const highPrice = c[2];
                    const lowPrice = c[3];
                    const closePrice = c[4];

                    history1m.push(closePrice);

                    // Entry Logic
                    if (timeVal >= 916 && timeVal <= 1000 && !activeTrade && tradesToday < 3) {
                        if (history1m.length >= 9) {
                            const ema3Arr = calculateEMA(history1m, 3);
                            const ema9Arr = calculateEMA(history1m, 9);
                            const ema3 = ema3Arr[ema3Arr.length - 1];
                            const ema9 = ema9Arr[ema9Arr.length - 1];

                            if (closePrice > firstHigh && ema3 > ema9) {
                                const atmStrike = Math.round(closePrice / idx.step) * idx.step;
                                activeTrade = {
                                    type: 'CE',
                                    strike: atmStrike,
                                    entryPrice: closePrice,
                                    target: closePrice + conf.target,
                                    sl: closePrice - conf.sl,
                                    entryTime: timeStr
                                };
                                tradesToday++;
                                console.log(`  🚀 [ENTRY] Time: ${timeStr} | Type: ${idx.name} ${atmStrike} CE | Spot Entry: ${closePrice} | Target Spot: ${(closePrice + conf.target).toFixed(1)} | SL Spot: ${(closePrice - conf.sl).toFixed(1)}`);
                            } else if (closePrice < firstLow && ema3 < ema9) {
                                const atmStrike = Math.round(closePrice / idx.step) * idx.step;
                                activeTrade = {
                                    type: 'PE',
                                    strike: atmStrike,
                                    entryPrice: closePrice,
                                    target: closePrice - conf.target,
                                    sl: closePrice + conf.sl,
                                    entryTime: timeStr
                                };
                                tradesToday++;
                                console.log(`  🚀 [ENTRY] Time: ${timeStr} | Type: ${idx.name} ${atmStrike} PE | Spot Entry: ${closePrice} | Target Spot: ${(closePrice - conf.target).toFixed(1)} | SL Spot: ${(closePrice + conf.sl).toFixed(1)}`);
                            }
                        }
                    }

                    // Exit check
                    if (activeTrade) {
                        if (activeTrade.type === 'CE') {
                            if (highPrice >= activeTrade.target) {
                                const profitPercent = 15;
                                const premiumProfit = idx.standardPremium * 0.15;
                                console.log(`    ✅ [EXIT WIN] Time: ${timeStr} | Target Hit! Spot High: ${highPrice} | P&L: +${profitPercent}% (+₹${(premiumProfit * idx.lotSize * 4).toFixed(0)} for 4 Lots)`);
                                activeTrade = null;
                            } else if (lowPrice <= activeTrade.sl) {
                                const lossPercent = conf.sl === conf.target ? 15 : 7;
                                const premiumLoss = idx.standardPremium * (lossPercent / 100);
                                console.log(`    ❌ [EXIT LOSS] Time: ${timeStr} | SL Hit! Spot Low: ${lowPrice} | P&L: -${lossPercent}% (-₹${(premiumLoss * idx.lotSize * 4).toFixed(0)} for 4 Lots)`);
                                activeTrade = null;
                            }
                        } else if (activeTrade.type === 'PE') {
                            if (lowPrice <= activeTrade.target) {
                                const profitPercent = 15;
                                const premiumProfit = idx.standardPremium * 0.15;
                                console.log(`    ✅ [EXIT WIN] Time: ${timeStr} | Target Hit! Spot Low: ${lowPrice} | P&L: +${profitPercent}% (+₹${(premiumProfit * idx.lotSize * 4).toFixed(0)} for 4 Lots)`);
                                activeTrade = null;
                            } else if (highPrice >= activeTrade.sl) {
                                const lossPercent = conf.sl === conf.target ? 15 : 7;
                                const premiumLoss = idx.standardPremium * (lossPercent / 100);
                                console.log(`    ❌ [EXIT LOSS] Time: ${timeStr} | SL Hit! Spot High: ${highPrice} | P&L: -${lossPercent}% (-₹${(premiumLoss * idx.lotSize * 4).toFixed(0)} for 4 Lots)`);
                                activeTrade = null;
                            }
                        }
                    }
                }
            }
            await new Promise(r => setTimeout(r, 2000));
        }

    } catch (err) {
        console.error("❌ Today Details Error:", err.message);
    }
}

runTodayDetails();
