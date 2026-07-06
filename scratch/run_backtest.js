const fs = require('fs');
const path = require('path');

const targetDir = 'c:/SecureTrade/scratch';

// ----------------------------------------------------
// MATH & INDICATORS HELPERS
// ----------------------------------------------------
function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    const ema = new Array(prices.length).fill(0);
    if (prices.length === 0) return ema;
    ema[0] = prices[0];
    for (let i = 1; i < prices.length; i++) {
        ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
    }
    return ema;
}

function calculateRSI(prices, period = 14) {
    const rsi = new Array(prices.length).fill(0);
    if (prices.length <= period) return rsi;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
        rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }
    return rsi;
}

function calculateATR(candles, period = 14) {
    const trs = new Array(candles.length).fill(0);
    const atr = new Array(candles.length).fill(0);
    if (candles.length === 0) return atr;
    trs[0] = candles[0].high - candles[0].low;
    for (let i = 1; i < candles.length; i++) {
        trs[i] = Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i - 1].close),
            Math.abs(candles[i].low - candles[i - 1].close)
        );
    }
    let sum = 0;
    for (let i = 0; i < period; i++) sum += trs[i];
    atr[period - 1] = sum / period;
    for (let i = period; i < candles.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + trs[i]) / period;
    }
    return atr;
}

function calculateADX(candles, period = 14) {
    const adx = new Array(candles.length).fill(0);
    if (candles.length <= period * 2) return adx;
    const tr = new Array(candles.length).fill(0);
    const plusDM = new Array(candles.length).fill(0);
    const minusDM = new Array(candles.length).fill(0);
    
    for (let i = 1; i < candles.length; i++) {
        const hDiff = candles[i].high - candles[i - 1].high;
        const lDiff = candles[i - 1].low - candles[i].low;
        tr[i] = Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i - 1].close),
            Math.abs(candles[i].low - candles[i - 1].close)
        );
        plusDM[i] = (hDiff > lDiff && hDiff > 0) ? hDiff : 0;
        minusDM[i] = (lDiff > hDiff && lDiff > 0) ? lDiff : 0;
    }
    const smoothTR = new Array(candles.length).fill(0);
    const smoothPlusDM = new Array(candles.length).fill(0);
    const smoothMinusDM = new Array(candles.length).fill(0);
    let trSum = 0, pDmSum = 0, mDmSum = 0;
    for (let i = 1; i <= period; i++) {
        trSum += tr[i]; pDmSum += plusDM[i]; mDmSum += minusDM[i];
    }
    smoothTR[period] = trSum; smoothPlusDM[period] = pDmSum; smoothMinusDM[period] = mDmSum;
    for (let i = period + 1; i < candles.length; i++) {
        smoothTR[i] = smoothTR[i - 1] - (smoothTR[i - 1] / period) + tr[i];
        smoothPlusDM[i] = smoothPlusDM[i - 1] - (smoothPlusDM[i - 1] / period) + plusDM[i];
        smoothMinusDM[i] = smoothMinusDM[i - 1] - (smoothMinusDM[i - 1] / period) + minusDM[i];
    }
    const dx = new Array(candles.length).fill(0);
    for (let i = period; i < candles.length; i++) {
        const trVal = smoothTR[i];
        if (trVal === 0) continue;
        const plusDI = 100 * (smoothPlusDM[i] / trVal);
        const minusDI = 100 * (smoothMinusDM[i] / trVal);
        const diff = Math.abs(plusDI - minusDI);
        const sum = plusDI + minusDI;
        dx[i] = sum === 0 ? 0 : 100 * (diff / sum);
    }
    let dxSum = 0;
    for (let i = period; i < period * 2; i++) dxSum += dx[i];
    adx[period * 2 - 1] = dxSum / period;
    for (let i = period * 2; i < candles.length; i++) {
        adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
    }
    return adx;
}

// ----------------------------------------------------
// DYNAMIC COMPONENT BACKTESTER WITH DATE RANGE
// ----------------------------------------------------
function runBacktest(indexName, oneMinCandlesData, strategyName = "5ema_reversion", startDateStr = "2024-07-06") {
    const startDate = new Date(startDateStr + "T00:00:00");
    
    // Sort all candle data first to make indicators clean
    const sorted1Min = oneMinCandlesData.map(c => {
        return {
            time: new Date(c[0]),
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5])
        };
    }).sort((a, b) => a.time - b.time);

    // Aggregate to 5-Minute Candles
    const candles5Min = [];
    let temp5Min = null;
    for (let i = 0; i < sorted1Min.length; i++) {
        const c = sorted1Min[i];
        const min = c.time.getMinutes();
        const blockStart = Math.floor(min / 5) * 5;
        if (!temp5Min) {
            temp5Min = {
                time: new Date(c.time.getFullYear(), c.time.getMonth(), c.time.getDate(), c.time.getHours(), blockStart, 0),
                open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume
            };
        } else {
            temp5Min.high = Math.max(temp5Min.high, c.high);
            temp5Min.low = Math.min(temp5Min.low, c.low);
            temp5Min.close = c.close;
            temp5Min.volume += c.volume;
        }
        const nextC = sorted1Min[i + 1];
        const isLast = (i === sorted1Min.length - 1);
        const isNextBlock = nextC && (Math.floor(nextC.time.getMinutes() / 5) * 5 !== blockStart || nextC.time.getHours() !== c.time.getHours() || nextC.time.getDate() !== c.time.getDate());
        if (isLast || isNextBlock) {
            candles5Min.push(temp5Min);
            temp5Min = null;
        }
    }

    const closes5Min = candles5Min.map(c => c.close);
    const volumes5Min = candles5Min.map(c => c.volume);
    
    const ema5 = calculateEMA(closes5Min, 5);
    const ema9 = calculateEMA(closes5Min, 9);
    const ema21 = calculateEMA(closes5Min, 21);
    const ema50 = calculateEMA(closes5Min, 50);
    const rsi = calculateRSI(closes5Min, 14);
    const atr = calculateATR(candles5Min, 14);
    const adx = calculateADX(candles5Min, 14);

    const volSma20 = new Array(candles5Min.length).fill(0);
    let volSum = 0;
    for (let i = 0; i < 20; i++) volSum += volumes5Min[i] || 0;
    volSma20[19] = volSum / 20;
    for (let i = 20; i < candles5Min.length; i++) {
        volSum = volSum - volumes5Min[i - 20] + volumes5Min[i];
        volSma20[i] = volSum / 20;
    }

    function get5MinIndicatorIndex(time) {
        const d = new Date(time.getFullYear(), time.getMonth(), time.getDate(), time.getHours(), Math.floor(time.getMinutes() / 5) * 5, 0);
        return candles5Min.findIndex(c => c.time.getTime() === d.getTime());
    }

    let trades = [];
    let currentPosition = null;
    let currentDayStr = "";
    
    // 5EMA Alert variables
    let ceAlertHigh = null, ceAlertLow = null, peAlertLow = null, peAlertHigh = null;

    for (let i = 30; i < sorted1Min.length; i++) {
        const c = sorted1Min[i];
        const hour = c.time.getHours();
        const min = c.time.getMinutes();
        const totalMinutes = hour * 60 + min;
        const dateStr = c.time.toDateString();

        // Limit simulation strictly starting from selected date
        if (c.time < startDate) {
            continue;
        }

        if (totalMinutes < 9 * 60 + 15 || totalMinutes > 15 * 60 + 30) {
            continue;
        }

        if (dateStr !== currentDayStr) {
            currentDayStr = dateStr;
        }

        // 1. MONITOR POSITION
        if (currentPosition) {
            const pos = currentPosition;
            let exitPrice = null;
            let exitReason = "";

            if (pos.type === "CE") {
                if (c.low <= pos.sl) {
                    exitPrice = pos.sl; exitReason = "SL Hit";
                } else if (c.high >= pos.tp) {
                    exitPrice = pos.tp; exitReason = "Target Hit";
                } else if (pos.isReversionExit && c.close >= pos.reversionTarget) {
                    exitPrice = c.close; exitReason = "EMA 5 Reversion Target";
                } else if (totalMinutes >= 15 * 60 + 20) {
                    exitPrice = c.close; exitReason = "Auto Square-Off (3:20 PM)";
                }
            } else if (pos.type === "PE") {
                if (c.high >= pos.sl) {
                    exitPrice = pos.sl; exitReason = "SL Hit";
                } else if (c.low <= pos.tp) {
                    exitPrice = pos.tp; exitReason = "Target Hit";
                } else if (pos.isReversionExit && c.close <= pos.reversionTarget) {
                    exitPrice = c.close; exitReason = "EMA 5 Reversion Target";
                } else if (totalMinutes >= 15 * 60 + 20) {
                    exitPrice = c.close; exitReason = "Auto Square-Off (3:20 PM)";
                }
            }

            if (exitPrice !== null) {
                let pnlPoints = pos.type === "CE" ? (exitPrice - pos.entryPrice) : (pos.entryPrice - exitPrice);
                const slippage = 1.2; 
                pnlPoints = pnlPoints - slippage;

                trades.push({
                    type: pos.type, entryTime: pos.entryTime, exitTime: c.time,
                    entryPrice: pos.entryPrice, exitPrice: exitPrice, pnl: pnlPoints, sl: pos.sl, reason: exitReason
                });
                currentPosition = null;
            }
            continue;
        }

        // 2. ENTRY SIGNALS (evaluated at candle close boundaries)
        if (min % 5 === 0) {
            const idx5 = get5MinIndicatorIndex(c.time);
            if (idx5 < 2) continue;
            
            const c5 = candles5Min[idx5];
            const prevC5 = candles5Min[idx5 - 1];

            // --- STRATEGY 1: 5EMA BREAKOUT (Standard) ---
            if (strategyName === "5ema") {
                if (prevC5.low > ema5[idx5 - 1]) {
                    peAlertLow = prevC5.low; peAlertHigh = prevC5.high; ceAlertHigh = null;
                } else if (prevC5.high < ema5[idx5 - 1]) {
                    ceAlertHigh = prevC5.high; ceAlertLow = prevC5.low; peAlertLow = null;
                }

                if (ceAlertHigh && c5.high > ceAlertHigh) {
                    const risk = c5.close - ceAlertLow;
                    if (risk > 0) {
                        currentPosition = {
                            type: "CE", entryTime: c.time, entryPrice: c5.close,
                            sl: ceAlertLow, tp: c5.close + (risk * 3.0)
                        };
                        ceAlertHigh = null;
                    }
                } else if (peAlertLow && c5.low < peAlertLow) {
                    const risk = peAlertHigh - c5.close;
                    if (risk > 0) {
                        currentPosition = {
                            type: "PE", entryTime: c.time, entryPrice: c5.close,
                            sl: peAlertHigh, tp: c5.close - (risk * 3.0)
                        };
                        peAlertLow = null;
                    }
                }
            }
            
            // --- STRATEGY 2: 5EMA TREND PULLBACK ---
            else if (strategyName === "5ema_pullback") {
                const trendBullish = ema9[idx5] > ema21[idx5] && ema21[idx5] > ema50[idx5];
                const trendBearish = ema9[idx5] < ema21[idx5] && ema21[idx5] < ema50[idx5];

                if (trendBullish) {
                    const touchedEma5 = prevC5.low <= ema5[idx5 - 1] && prevC5.close > ema5[idx5 - 1];
                    if (touchedEma5) {
                        const slPrice = prevC5.low - 5;
                        currentPosition = {
                            type: "CE", entryTime: c.time, entryPrice: c5.close,
                            sl: slPrice, tp: c5.close + (c5.close - slPrice) * 2.0
                        };
                    }
                } else if (trendBearish) {
                    const touchedEma5 = prevC5.high >= ema5[idx5 - 1] && prevC5.close < ema5[idx5 - 1];
                    if (touchedEma5) {
                        const slPrice = prevC5.high + 5;
                        currentPosition = {
                            type: "PE", entryTime: c.time, entryPrice: c5.close,
                            sl: slPrice, tp: c5.close - (slPrice - c5.close) * 2.0
                        };
                    }
                }
            }

            // --- STRATEGY 3: 5EMA MEAN REVERSION ---
            else if (strategyName === "5ema_reversion") {
                const extensionThreshold = 1.2 * atr[idx5 - 1];
                const overextendedBelow = prevC5.close < ema5[idx5 - 1] - extensionThreshold;
                const overextendedAbove = prevC5.close > ema5[idx5 - 1] + extensionThreshold;

                if (overextendedBelow && rsi[idx5 - 1] < 30) {
                    currentPosition = {
                        type: "CE", entryTime: c.time, entryPrice: c5.close,
                        sl: prevC5.low - 5,
                        tp: ema5[idx5],
                        isReversionExit: true,
                        reversionTarget: ema5[idx5]
                    };
                } else if (overextendedAbove && rsi[idx5 - 1] > 70) {
                    currentPosition = {
                        type: "PE", entryTime: c.time, entryPrice: c5.close,
                        sl: prevC5.high + 5,
                        tp: ema5[idx5],
                        isReversionExit: true,
                        reversionTarget: ema5[idx5]
                    };
                }
            }

            // --- STRATEGY 4: GAINZ MOMENTUM ---
            else if (strategyName === "gainz") {
                const prevClose = closes5Min[idx5 - 1];
                const prevEma9 = ema9[idx5 - 1];
                
                const isBullishTrend = ema9[idx5] > ema50[idx5] && ema21[idx5] > ema50[idx5];
                const isBearishTrend = ema9[idx5] < ema50[idx5] && ema21[idx5] < ema50[idx5];
                
                const isBullishBreakout = (prevClose <= prevEma9) && (c5.close > ema9[idx5]) && isBullishTrend;
                const isBearishBreakout = (prevClose >= prevEma9) && (c5.close < ema9[idx5]) && isBearishTrend;

                if (isBullishBreakout && rsi[idx5] > 49) {
                    currentPosition = {
                        type: "CE", entryTime: c.time, entryPrice: c5.close,
                        sl: c5.close - (1.5 * atr[idx5]), tp: c5.close + (3.0 * atr[idx5])
                    };
                } else if (isBearishBreakout && rsi[idx5] < 51) {
                    currentPosition = {
                        type: "PE", entryTime: c.time, entryPrice: c5.close,
                        sl: c5.close + (1.5 * atr[idx5]), tp: c5.close - (3.0 * atr[idx5])
                    };
                }
            }

            // --- STRATEGY 5: EMA CROSSOVER (9, 21, 50 Crossover WITH ADX & Volume Breakout Filters) ---
            else if (strategyName === "crossover") {
                const emaCrossAbove = (ema9[idx5 - 1] <= ema21[idx5 - 1]) && (ema9[idx5] > ema21[idx5]);
                const emaCrossBelow = (ema9[idx5 - 1] >= ema21[idx5 - 1]) && (ema9[idx5] < ema21[idx5]);
                const isTrendStrong = adx[idx5] >= 20;
                const hasVolBreakout = volumes5Min[idx5] === 0 || volumes5Min[idx5] > volSma20[idx5];

                if (isTrendStrong && hasVolBreakout) {
                    if (emaCrossAbove && rsi[idx5] > 50) {
                        currentPosition = {
                            type: "CE", entryTime: c.time, entryPrice: c5.close,
                            sl: c5.close - (1.5 * atr[idx5]), tp: c5.close + (3.0 * atr[idx5])
                        };
                    } else if (emaCrossBelow && rsi[idx5] < 50) {
                        currentPosition = {
                            type: "PE", entryTime: c.time, entryPrice: c5.close,
                            sl: c5.close + (1.5 * atr[idx5]), tp: c5.close - (3.0 * atr[idx5])
                        };
                    }
                }
            }
        }
    }

    if (trades.length === 0) {
        console.log(`❌ No trades generated for ${indexName} | ${strategyName} starting from ${startDateStr}.`);
        return;
    }

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const winRate = (wins.length / trades.length) * 100;
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : (grossProfit / grossLoss);
    
    const riskLevels = [0.005, 0.01, 0.015]; // 0.5%, 1.0%, 1.5% Risk per trade
    
    console.log(`\n👉 RESULT: ${indexName} | STRATEGY: ${strategyName.toUpperCase()}`);
    console.log(`   Signals: ${trades.length} | Win Rate: ${winRate.toFixed(2)}% | PF: ${profitFactor.toFixed(2)}`);
    
    riskLevels.forEach(riskPct => {
        let balance = 100000;
        let peak = balance;
        let maxDrawdown = 0;

        trades.forEach(t => {
            const riskAmount = balance * riskPct;
            const riskPoints = Math.abs(t.entryPrice - t.sl);
            let tradePnlValue = 0;
            if (riskPoints > 0) {
                const positionSize = riskAmount / riskPoints;
                tradePnlValue = positionSize * t.pnl;
            }
            balance += tradePnlValue;
            if (balance > peak) peak = balance;
            const dd = ((peak - balance) / peak) * 100;
            if (dd > maxDrawdown) maxDrawdown = dd;
        });
        
        console.log(`   └─ Risk: ${(riskPct * 100).toFixed(1)}% | Est. Cap: ₹${Math.round(balance).toLocaleString("en-IN")} | Max DD: ${maxDrawdown.toFixed(2)}%`);
    });
}

function runAllTests() {
    const indices = ["nifty50", "banknifty", "sensex"];
    
    console.log(`\n=========================================================================`);
    console.log(`🚀 TEST PHASE 1: 2-YEAR BACKTEST (JULY 2024 - JULY 2026)`);
    console.log(`=========================================================================`);
    indices.forEach(idx => {
        const filePath = path.join(targetDir, `${idx}_candles.json`);
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            runBacktest(idx.toUpperCase(), data, "5ema", "2024-07-06"); 
            runBacktest(idx.toUpperCase(), data, "5ema_pullback", "2024-07-06"); 
            runBacktest(idx.toUpperCase(), data, "5ema_reversion", "2024-07-06"); 
        }
    });

    console.log(`\n=========================================================================`);
    console.log(`🚀 TEST PHASE 2: 2026 YEAR-TO-DATE BACKTEST (JAN 2026 - JULY 2026)`);
    console.log(`=========================================================================`);
    indices.forEach(idx => {
        const filePath = path.join(targetDir, `${idx}_candles.json`);
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            runBacktest(idx.toUpperCase(), data, "5ema", "2026-01-01"); 
            runBacktest(idx.toUpperCase(), data, "5ema_pullback", "2026-01-01"); 
            runBacktest(idx.toUpperCase(), data, "5ema_reversion", "2026-01-01"); 
            runBacktest(idx.toUpperCase(), data, "gainz", "2026-01-01"); 
            runBacktest(idx.toUpperCase(), data, "crossover", "2026-01-01"); 
        }
    });
}

runAllTests();