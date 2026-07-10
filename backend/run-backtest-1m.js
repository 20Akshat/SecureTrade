require('dotenv').config({ path: 'c:/SecureTrade/backend/.env' });
const axios = require('axios');
const speakeasy = require('speakeasy');

// Helper to calculate EMA
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
            ema.push(prices[i]); // fill early values
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

async function runBacktest() {
    try {
        const totp = speakeasy.totp({
            secret: process.env.ANGEL_TOTP_SECRET,
            encoding: 'base32'
        });
        console.log(`🔐 Logging in to Angel One...`);
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
            { name: "NIFTY50", exch: "NSE", token: "99926000", lotSize: 65 },
            { name: "BANKNIFTY", exch: "NSE", token: "99926009", lotSize: 30 },
            { name: "SENSEX", exch: "BSE", token: "99919000", lotSize: 20 }
        ];

        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (3600000 * 5.5));
        const todayStr = ist.toISOString().split('T')[0];
        const hourStr = String(ist.getHours()).padStart(2, '0');
        const minStr = String(ist.getMinutes()).padStart(2, '0');
        const currentistTime = `${todayStr} ${hourStr}:${minStr}`;

        const chunks = [
            { from: "2026-04-10 09:15", to: "2026-05-09 15:30" },
            { from: "2026-05-10 09:15", to: "2026-06-09 15:30" },
            { from: "2026-06-10 09:15", to: currentistTime }
        ];

        for (const idx of indices) {
            console.log(`\n======================================================`);
            console.log(`📥 STARTING DATA FETCH & BACKTEST FOR: ${idx.name}`);
            console.log(`======================================================`);
            
            let allCandles = [];
            for (const chunk of chunks) {
                console.log(`📥 Fetching ${idx.name} from ${chunk.from} to ${chunk.to}...`);
                let res;
                let retries = 4;
                while (retries > 0) {
                    try {
                        res = await axios.post(
                            'https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData',
                            {
                                exchange: idx.exch,
                                symboltoken: idx.token,
                                interval: "ONE_MINUTE",
                                fromdate: chunk.from,
                                todate: chunk.to
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
                        if (res && res.data) break;
                    } catch (apiErr) {
                        retries--;
                        console.log(`⚠️ Fetch failed. Retrying in 4.5 seconds... (${retries} attempts left)`);
                        await new Promise(resolve => setTimeout(resolve, 4500));
                    }
                }
                if (res && res.data?.data) {
                    console.log(`✅ Chunk fetched: ${res.data.data.length} candles.`);
                    allCandles = allCandles.concat(res.data.data);
                } else {
                    console.log(`⚠️ Failed to fetch chunk:`, res ? res.data : "No response");
                }
                
                // Avoid rate limit 403 blocks
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            if (allCandles.length === 0) {
                console.log(`❌ No data loaded for ${idx.name}`);
                continue;
            }

            // Group candles by date string
            const days = {};
            for (const c of allCandles) {
                const timeStr = c[0];
                const dateStr = timeStr.split('T')[0];
                if (!days[dateStr]) days[dateStr] = [];
                days[dateStr].push({
                    time: timeStr,
                    open: c[1],
                    high: c[2],
                    low: c[3],
                    close: c[4]
                });
            }

            function runSimulation(targetPts, slPts) {
                let totalTrades = 0;
                let wins = 0;
                let losses = 0;
                let squareoffs = 0;
                let totalNetPoints = 0;

                const sortedDates = Object.keys(days).sort();

                for (const date of sortedDates) {
                    const candles = days[date].sort((a,b) => a.time.localeCompare(b.time));
                    if (candles.length < 15) continue;

                    const firstCandle = candles.find(c => c.time.includes("T09:15:00"));
                    if (!firstCandle) continue;

                    const firstHigh = firstCandle.high;
                    const firstLow = firstCandle.low;

                    let activeTrade = null;
                    let tradesToday = 0;
                    const history1m = [];

                    for (const candle of candles) {
                        const timeStr = candle.time.split('T')[1].slice(0, 5);
                        const hour = parseInt(timeStr.slice(0, 2));
                        const min = parseInt(timeStr.slice(3, 5));
                        const timeVal = hour * 100 + min;

                        history1m.push(candle.close);

                        if (timeVal >= 916 && timeVal <= 1000 && !activeTrade && tradesToday < 3) {
                            if (history1m.length >= 9) {
                                const ema3Arr = calculateEMA(history1m, 3);
                                const ema9Arr = calculateEMA(history1m, 9);
                                const ema3 = ema3Arr[ema3Arr.length - 1];
                                const ema9 = ema9Arr[ema9Arr.length - 1];

                                if (candle.close > firstHigh && ema3 > ema9) {
                                    activeTrade = {
                                        type: 'CE',
                                        entryPrice: candle.close,
                                        target: candle.close + targetPts,
                                        sl: candle.close - slPts,
                                        entryTime: timeStr
                                    };
                                    tradesToday++;
                                } else if (candle.close < firstLow && ema3 < ema9) {
                                    activeTrade = {
                                        type: 'PE',
                                        entryPrice: candle.close,
                                        target: candle.close - targetPts,
                                        sl: candle.close + slPts,
                                        entryTime: timeStr
                                    };
                                    tradesToday++;
                                }
                            }
                        }

                        if (activeTrade) {
                            if (activeTrade.type === 'CE') {
                                if (candle.high >= activeTrade.target) {
                                    wins++;
                                    totalTrades++;
                                    totalNetPoints += (activeTrade.target - activeTrade.entryPrice);
                                    activeTrade = null;
                                } else if (candle.low <= activeTrade.sl) {
                                    losses++;
                                    totalTrades++;
                                    totalNetPoints += (activeTrade.sl - activeTrade.entryPrice);
                                    activeTrade = null;
                                }
                            } else if (activeTrade.type === 'PE') {
                                if (candle.low <= activeTrade.target) {
                                    wins++;
                                    totalTrades++;
                                    totalNetPoints += (activeTrade.entryPrice - activeTrade.target);
                                    activeTrade = null;
                                } else if (candle.high >= activeTrade.sl) {
                                    losses++;
                                    totalTrades++;
                                    totalNetPoints += (activeTrade.entryPrice - activeTrade.sl);
                                    activeTrade = null;
                                }
                            }
                        }

                        if (timeVal === 1529 && activeTrade) {
                            squareoffs++;
                            totalTrades++;
                            const diff = activeTrade.type === 'CE' 
                                ? candle.close - activeTrade.entryPrice
                                : activeTrade.entryPrice - candle.close;
                            totalNetPoints += diff;
                            activeTrade = null;
                        }
                    }
                }

                return {
                    totalTrades,
                    wins,
                    losses,
                    netPoints: totalNetPoints
                };
            }

            // Define target and stop losses configurations for sweep based on index characteristics
            let testSuites = [];
            if (idx.name === "NIFTY50") {
                testSuites = [
                    { target: 30, sl: 14, optTgt: 15, optSL: 7, label: "Original (+15% / -7%)" },
                    { target: 30, sl: 20, optTgt: 15, optSL: 10, label: "Medium (+15% / -10%)" },
                    { target: 30, sl: 30, optTgt: 15, optSL: 15, label: "Safe (+15% / -15%)" },
                    { target: 40, sl: 20, optTgt: 20, optSL: 10, label: "R-R 1:2 (+20% / -10%)" }
                ];
            } else if (idx.name === "BANKNIFTY") {
                // Bank Nifty moves approx 2.5x Nifty, premium standard ~₹280
                testSuites = [
                    { target: 84, sl: 39, optTgt: 15, optSL: 7, label: "Original (+15% / -7%)" },
                    { target: 84, sl: 56, optTgt: 15, optSL: 10, label: "Medium (+15% / -10%)" },
                    { target: 84, sl: 84, optTgt: 15, optSL: 15, label: "Safe (+15% / -15%)" },
                    { target: 112, sl: 56, optTgt: 20, optSL: 10, label: "R-R 1:2 (+20% / -10%)" }
                ];
            } else if (idx.name === "SENSEX") {
                // Sensex moves approx 2.5x Nifty, premium standard ~₹140
                testSuites = [
                    { target: 42, sl: 20, optTgt: 15, optSL: 7, label: "Original (+15% / -7%)" },
                    { target: 42, sl: 28, optTgt: 15, optSL: 10, label: "Medium (+15% / -10%)" },
                    { target: 42, sl: 42, optTgt: 15, optSL: 15, label: "Safe (+15% / -15%)" },
                    { target: 56, sl: 28, optTgt: 20, optSL: 10, label: "R-R 1:2 (+20% / -10%)" }
                ];
            }

            console.log("\n--------------------------------------------------------------------------------------------------");
            console.log(`📊 ${idx.name} REPORT CARD (LAST 90 DAYS)`);
            console.log("--------------------------------------------------------------------------------------------------");
            console.log("Option Config       | Index Tgt/SL | Total Trades | Win Rate % | Net Index Pts | Net Profit (4 Lots)");
            console.log("--------------------------------------------------------------------------------------------------");

            for (const suite of testSuites) {
                const result = runSimulation(suite.target, suite.sl);
                const winRate = result.totalTrades > 0 ? ((result.wins / result.totalTrades) * 100).toFixed(1) : "0.0";
                
                const moneyPerPoint = idx.lotSize * 4; // 4 lots
                const netProfit = result.netPoints * moneyPerPoint;
                const formatProfit = netProfit >= 0 
                    ? `+₹${netProfit.toLocaleString('en-IN', {maximumFractionDigits: 0})}`
                    : `-₹${Math.abs(netProfit).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

                console.log(
                    ` ${suite.label.padEnd(19)} |` +
                    ` ${String(suite.target + "/" + suite.sl).padEnd(12)} |` +
                    ` ${String(result.totalTrades).padEnd(12)} |` +
                    ` ${String(winRate + "%").padEnd(10)} |` +
                    ` ${String(result.netPoints.toFixed(1)).padEnd(13)} |` +
                    ` ${formatProfit}`
                );
            }
            console.log("==================================================================================================\n");

            // Wait a little before the next index query to avoid hitting API rate blocks
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

    } catch (err) {
        console.error("❌ Backtest Main Loop Error:", err.message);
    }
}

runBacktest();
