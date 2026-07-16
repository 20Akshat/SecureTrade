const fs = require('fs');
const path = require('path');

const targetDir = 'c:/SecureTrade/scratch';
const filePath = path.join(targetDir, 'nifty50_candles.json');

// Helper math
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

async function main() {
    if (!fs.existsSync(filePath)) {
        console.log("❌ Nifty50 candles JSON not found!");
        return;
    }

    console.log("⏳ Loading Nifty50 1-Minute Candle Data...");
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    const sorted1Min = raw.map(c => ({
        time: new Date(c[0]),
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5])
    })).sort((a, b) => a.time - b.time);

    console.log("Aggregating to 5-Minute Candles...");
    const candles5Min = [];
    let temp = null;
    for (let i = 0; i < sorted1Min.length; i++) {
        const c = sorted1Min[i];
        const min = c.time.getMinutes();
        const blockStart = Math.floor(min / 5) * 5;
        const dateKey = new Date(c.time.getFullYear(), c.time.getMonth(), c.time.getDate(), c.time.getHours(), blockStart, 0);
        
        if (!temp || temp.time.getTime() !== dateKey.getTime()) {
            if (temp) candles5Min.push(temp);
            temp = {
                time: dateKey,
                open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume
            };
        } else {
            temp.high = Math.max(temp.high, c.high);
            temp.low = Math.min(temp.low, c.low);
            temp.close = c.close;
            temp.volume += c.volume;
        }
    }
    if (temp) candles5Min.push(temp);

    // Compute indicators
    const closes1m = sorted1Min.map(c => c.close);
    const ema3_1m = calculateEMA(closes1m, 3);
    const ema9_1m = calculateEMA(closes1m, 9);
    const atr1m = calculateATR(sorted1Min, 14);

    const closes5m = candles5Min.map(c => c.close);
    const ema5_5m = calculateEMA(closes5m, 5);
    const atr5m = calculateATR(candles5Min, 14);

    const testStartDate = new Date("2022-07-07T00:00:00");

    // =================================---------------------------
    // TEST 1: 1-MIN MORNING SCALPER (FIRST 1-MIN CANDLE ORB)
    // =================================---------------------------
    let bal1 = 100000;
    let trades1 = 0, win1 = 0, loss1 = 0;
    let active1 = null;
    let lastDate1 = "";
    let first1mHigh = null, first1mLow = null;
    let triggered1 = false;

    for (let i = 0; i < sorted1Min.length; i++) {
        const c = sorted1Min[i];
        if (c.time < testStartDate) continue;
        
        const dateStr = c.time.toDateString();
        if (dateStr !== lastDate1) {
            lastDate1 = dateStr;
            first1mHigh = null;
            first1mLow = null;
            triggered1 = false;
        }

        const hrs = c.time.getHours();
        const mins = c.time.getMinutes();
        const timeVal = hrs * 100 + mins;

        if (active1) {
            let hitSL = false, hitTP = false;
            if (active1.type === "CE") {
                if (c.low <= active1.sl) hitSL = true;
                else if (c.high >= active1.tp) hitTP = true;
            } else {
                if (c.high >= active1.sl) hitSL = true;
                else if (c.low <= active1.tp) hitTP = true;
            }

            if (timeVal >= 1525 || hitSL || hitTP) {
                const isWin = hitTP || (timeVal >= 1525 && (active1.type === "CE" ? c.close > active1.entryPrice : c.close < active1.entryPrice));
                const risk = bal1 * 0.02;
                const distance = Math.abs(active1.entryPrice - active1.sl);
                const qty = distance > 0 ? risk / distance : 0;
                const pnl = isWin ? qty * Math.abs(active1.tp - active1.entryPrice) : -qty * Math.abs(active1.sl - active1.entryPrice);
                
                bal1 += pnl;
                trades1++;
                if (isWin) win1++; else loss1++;
                active1 = null;
            }
            continue;
        }

        if (timeVal === 915) {
            first1mHigh = c.high;
            first1mLow = c.low;
        }

        if (timeVal >= 916 && timeVal <= 1000 && first1mHigh !== null && !triggered1) {
            const e3 = ema3_1m[i];
            const e9 = ema9_1m[i];
            const curATR = atr1m[i];
            
            if (c.close > first1mHigh && e3 > e9) {
                active1 = { type: "CE", entryPrice: c.close, sl: c.close - (1.0 * curATR), tp: c.close + (1.5 * curATR), strategy: "1m_orb" };
                triggered1 = true;
            } else if (c.close < first1mLow && e3 < e9) {
                active1 = { type: "PE", entryPrice: c.close, sl: c.close + (1.0 * curATR), tp: c.close - (1.5 * curATR), strategy: "1m_orb" };
                triggered1 = true;
            }
        }
    }

    // =================================---------------------------
    // TEST 2: 9:20 AM MORNING SCALPER (FIRST 5-MIN CANDLE ORB)
    // =================================---------------------------
    let bal2 = 100000;
    let trades2 = 0, win2 = 0, loss2 = 0;
    let active2 = null;
    let lastDate2 = "";
    let first5mHigh = null, first5mLow = null;
    let triggered2 = false;
    let dayCandles5m = [];

    for (let i = 0; i < candles5Min.length; i++) {
        const c = candles5Min[i];
        if (c.time < testStartDate) continue;

        const dateStr = c.time.toDateString();
        if (dateStr !== lastDate2) {
            lastDate2 = dateStr;
            first5mHigh = null;
            first5mLow = null;
            triggered2 = false;
            dayCandles5m = [];
        }

        const hrs = c.time.getHours();
        const mins = c.time.getMinutes();
        const timeVal = hrs * 100 + mins;

        if (active2) {
            let hitSL = false, hitTP = false;
            if (active2.type === "CE") {
                if (c.low <= active2.sl) hitSL = true;
                else if (c.high >= active2.tp) hitTP = true;
            } else {
                if (c.high >= active2.sl) hitSL = true;
                else if (c.low <= active2.tp) hitTP = true;
            }

            if (timeVal >= 1525 || hitSL || hitTP) {
                const isWin = hitTP || (timeVal >= 1525 && (active2.type === "CE" ? c.close > active2.entryPrice : c.close < active2.entryPrice));
                const risk = bal2 * 0.02;
                const distance = Math.abs(active2.entryPrice - active2.sl);
                const qty = distance > 0 ? risk / distance : 0;
                const pnl = isWin ? qty * Math.abs(active2.tp - active2.entryPrice) : -qty * Math.abs(active2.sl - active2.entryPrice);
                
                bal2 += pnl;
                trades2++;
                if (isWin) win2++; else loss2++;
                active2 = null;
            }
            continue;
        }

        if (timeVal === 915) {
            first5mHigh = c.high;
            first5mLow = c.low;
        }

        if (timeVal >= 920 && timeVal <= 1000 && first5mHigh !== null && !triggered2) {
            const curATR = atr5m[i];
            if (c.close > first5mHigh) {
                active2 = { type: "CE", entryPrice: c.close, sl: c.close - (1.0 * curATR), tp: c.close + (1.5 * curATR) };
                triggered2 = true;
            } else if (c.close < first5mLow) {
                active2 = { type: "PE", entryPrice: c.close, sl: c.close + (1.0 * curATR), tp: c.close - (1.5 * curATR) };
                triggered2 = true;
            }
        }
    }

    // =================================---------------------------
    // TEST 3: 5-MIN 5EMA PULLBACK (9:20 - 10:00 AM ONLY)
    // =================================---------------------------
    let bal3 = 100000;
    let trades3 = 0, win3 = 0, loss3 = 0;
    let active3 = null;
    let lastDate3 = "";
    let triggered3 = false;
    let pullbackCeAlert = false;
    let pullbackPeAlert = false;
    let pullbackHigh = 0;
    let pullbackLow = 0;
    let pullbackSl = 0;

    for (let i = 0; i < candles5Min.length; i++) {
        const c = candles5Min[i];
        if (c.time < testStartDate) continue;

        const dateStr = c.time.toDateString();
        if (dateStr !== lastDate3) {
            lastDate3 = dateStr;
            triggered3 = false;
            pullbackCeAlert = false;
            pullbackPeAlert = false;
        }

        const hrs = c.time.getHours();
        const mins = c.time.getMinutes();
        const timeVal = hrs * 100 + mins;

        if (active3) {
            let hitSL = false, hitTP = false;
            if (active3.type === "CE") {
                if (c.low <= active3.sl) hitSL = true;
                else if (c.high >= active3.tp) hitTP = true;
            } else {
                if (c.high >= active3.sl) hitSL = true;
                else if (c.low <= active3.tp) hitTP = true;
            }

            if (timeVal >= 1525 || hitSL || hitTP) {
                const isWin = hitTP || (timeVal >= 1525 && (active3.type === "CE" ? c.close > active3.entryPrice : c.close < active3.entryPrice));
                const risk = bal3 * 0.02;
                const distance = Math.abs(active3.entryPrice - active3.sl);
                const qty = distance > 0 ? risk / distance : 0;
                const pnl = isWin ? qty * Math.abs(active3.tp - active3.entryPrice) : -qty * Math.abs(active3.sl - active3.entryPrice);
                
                bal3 += pnl;
                trades3++;
                if (isWin) win3++; else loss3++;
                active3 = null;
            }
            continue;
        }

        // Only scan between 09:20 and 10:00 AM
        if (timeVal >= 920 && timeVal <= 1000 && !triggered3) {
            const e5 = ema5_5m[i];
            const curATR = atr5m[i];

            // Check if alert triggers
            if (pullbackCeAlert) {
                if (c.close > pullbackHigh) {
                    active3 = { type: "CE", entryPrice: c.close, sl: pullbackSl, tp: c.close + (1.5 * Math.abs(c.close - pullbackSl)) };
                    triggered3 = true;
                    pullbackCeAlert = false;
                }
            } else if (pullbackPeAlert) {
                if (c.close < pullbackLow) {
                    active3 = { type: "PE", entryPrice: c.close, sl: pullbackSl, tp: c.close - (1.5 * Math.abs(pullbackSl - c.close)) };
                    triggered3 = true;
                    pullbackPeAlert = false;
                }
            } else {
                // Look for pullback candles
                if (c.low >= e5 && c.close > e5) {
                    pullbackCeAlert = true;
                    pullbackHigh = c.high;
                    pullbackSl = c.low;
                }
                else if (c.high <= e5 && c.close < e5) {
                    pullbackPeAlert = true;
                    pullbackLow = c.low;
                    pullbackSl = c.high;
                }
            }
        }
    }

    console.log(`\n=========================================================================`);
    console.log(`📈 NIFTY50 MORNING ONLY (9:15 - 10:00 AM) 4-YEAR BACKTEST`);
    console.log(`🗓️ Period: July 2022 - July 2026 | Initial Capital: ₹1,00,000`);
    console.log(`=========================================================================`);
    console.log(`👉 Strategy 1: 1-MIN MORNING SCALPER (Current Setup)`);
    console.log(`   ├─ Trades: ${trades1} | Win Rate: ${(win1/trades1*100).toFixed(1)}%`);
    console.log(`   └─ Final Balance: ₹${Math.round(bal1).toLocaleString("en-IN")} | Net: ₹${Math.round(bal1 - 100000).toLocaleString("en-IN")} (${((bal1-100000)/1000).toFixed(1)}%)`);
    console.log(`-------------------------------------------------------------------------`);
    console.log(`👉 Strategy 2: 9:20 AM MOMENTUM SCALPER (5-Min 1-Candle ORB)`);
    console.log(`   ├─ Trades: ${trades2} | Win Rate: ${(win2/trades2*100).toFixed(1)}%`);
    console.log(`   └─ Final Balance: ₹${Math.round(bal2).toLocaleString("en-IN")} | Net: ₹${Math.round(bal2 - 100000).toLocaleString("en-IN")} (${((bal2-100000)/1000).toFixed(1)}%)`);
    console.log(`-------------------------------------------------------------------------`);
    console.log(`👉 Strategy 3: 5-MIN 5EMA PULLBACK (Morning Only)`);
    console.log(`   ├─ Trades: ${trades3} | Win Rate: ${(win3/trades3*100).toFixed(1)}%`);
    console.log(`   └─ Final Balance: ₹${Math.round(bal3).toLocaleString("en-IN")} | Net: ₹${Math.round(bal3 - 100000).toLocaleString("en-IN")} (${((bal3-100000)/1000).toFixed(1)}%)`);
    console.log(`=========================================================================`);
}

main().catch(console.error);
