const fs = require('fs');
const path = require('path');

const targetDir = 'c:/SecureTrade/scratch';
const filePath = path.join(targetDir, 'nifty50_candles.json');

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

function calculateBollingerBands(closes, period = 20, stdDevMult = 2) {
    const middle = new Array(closes.length).fill(0);
    const upper = new Array(closes.length).fill(0);
    const lower = new Array(closes.length).fill(0);
    
    for (let i = period - 1; i < closes.length; i++) {
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
            sum += closes[j];
        }
        const mean = sum / period;
        middle[i] = mean;
        
        let sumSqDiff = 0;
        for (let j = i - period + 1; j <= i; j++) {
            sumSqDiff += Math.pow(closes[j] - mean, 2);
        }
        const stdDev = Math.sqrt(sumSqDiff / period);
        upper[i] = mean + (stdDevMult * stdDev);
        lower[i] = mean - (stdDevMult * stdDev);
    }
    return { middle, upper, lower };
}

function calculateVWAP(candles) {
    const vwap = new Array(candles.length).fill(0);
    let runningSum = 0;
    let runningVolume = 0;
    let lastDate = "";
    
    for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const dateStr = c.time.toDateString();
        if (dateStr !== lastDate) {
            runningSum = 0;
            runningVolume = 0;
            lastDate = dateStr;
        }
        const typicalPrice = (c.high + c.low + c.close) / 3;
        runningSum += typicalPrice * c.volume;
        runningVolume += c.volume;
        vwap[i] = runningVolume === 0 ? typicalPrice : runningSum / runningVolume;
    }
    return vwap;
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

    console.log(`Aggregating to 5-Minute Candles...`);
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
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
            };
        } else {
            temp.high = Math.max(temp.high, c.high);
            temp.low = Math.min(temp.low, c.low);
            temp.close = c.close;
            temp.volume += c.volume;
        }
    }
    if (temp) candles5Min.push(temp);

    const closes = candles5Min.map(c => c.close);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const ema50 = calculateEMA(closes, 50);
    const rsi = calculateRSI(closes, 14);
    const atr = calculateATR(candles5Min, 14);
    const adx = calculateADX(candles5Min, 14);
    const vwap = calculateVWAP(candles5Min);
    const { upper: bbUpper, lower: bbLower, middle: bbMiddle } = calculateBollingerBands(closes, 20, 2);

    const testStartDate = new Date("2022-07-07T00:00:00");
    const testStartIndex = candles5Min.findIndex(c => c.time >= testStartDate);

    let balance = 100000;
    let initialBalance = 100000;
    let peak = 100000;
    let maxDrawdown = 0;
    let winCount = 0;
    let lossCount = 0;
    let totalTrades = 0;
    let activePosition = null;
    
    let lastDate = "";
    let firstThreeCandles = [];
    let orbHigh = null;
    let orbLow = null;
    let orbTriggered = false;

    const stats = {
        orb: { trades: 0, win: 0, profit: 0 },
        vwap: { trades: 0, win: 0, profit: 0 },
        bollinger: { trades: 0, win: 0, profit: 0 }
    };

    console.log(`\n⏳ Running Backtest over 4 Years on NIFTY50 (Regime-Switching Mode)...`);

    for (let i = testStartIndex; i < candles5Min.length; i++) {
        const c = candles5Min[i];
        const dateStr = c.time.toDateString();
        
        if (dateStr !== lastDate) {
            lastDate = dateStr;
            firstThreeCandles = [];
            orbHigh = null;
            orbLow = null;
            orbTriggered = false;
        }

        const hrs = c.time.getHours();
        const mins = c.time.getMinutes();
        const timeVal = hrs * 100 + mins;

        if (timeVal >= 915 && timeVal <= 925) {
            firstThreeCandles.push(c);
            if (firstThreeCandles.length === 3) {
                orbHigh = Math.max(...firstThreeCandles.map(x => x.high));
                orbLow = Math.min(...firstThreeCandles.map(x => x.low));
            }
        }

        if (activePosition) {
            let hitSL = false, hitTP = false;
            
            if (activePosition.type === "CE") {
                if (c.low <= activePosition.sl) hitSL = true;
                else if (c.high >= activePosition.tp) hitTP = true;
            } else {
                if (c.high >= activePosition.sl) hitSL = true;
                else if (c.low <= activePosition.tp) hitTP = true;
            }

            if (timeVal >= 1525 && !hitSL && !hitTP) {
                hitSL = c.close < activePosition.entryPrice ? (activePosition.type === "CE") : (activePosition.type === "PE");
                hitTP = !hitSL;
            }

            if (hitSL || hitTP) {
                const riskAmount = balance * 0.02;
                const distanceToSL = Math.abs(activePosition.entryPrice - activePosition.sl);
                const quantity = distanceToSL > 0 ? riskAmount / distanceToSL : 0;
                
                let tradePnL = 0;
                if (hitTP) {
                    tradePnL = quantity * Math.abs(activePosition.tp - activePosition.entryPrice);
                    winCount++;
                    stats[activePosition.strategyUsed].win++;
                } else {
                    tradePnL = -quantity * Math.abs(activePosition.sl - activePosition.entryPrice);
                    lossCount++;
                }

                balance += tradePnL;
                stats[activePosition.strategyUsed].profit += tradePnL;
                stats[activePosition.strategyUsed].trades++;
                totalTrades++;

                if (balance > peak) peak = balance;
                const dd = ((peak - balance) / peak) * 100;
                if (dd > maxDrawdown) maxDrawdown = dd;

                activePosition = null;
            }
            continue;
        }

        if (timeVal < 930 || timeVal > 1515) continue;

        const currentADX = adx[i];
        const currentRSI = rsi[i];
        const currentClose = c.close;
        const currentATR = atr[i];

        if (timeVal >= 930 && timeVal < 1000 && orbHigh && orbLow && !orbTriggered) {
            if (c.close > orbHigh) {
                activePosition = { type: "CE", entryPrice: c.close, sl: c.close - (1.0 * currentATR), tp: c.close + (1.5 * currentATR), entryTime: c.time, strategyUsed: "orb" };
                orbTriggered = true;
            } else if (c.close < orbLow) {
                activePosition = { type: "PE", entryPrice: c.close, sl: c.close + (1.0 * currentATR), tp: c.close - (1.5 * currentATR), entryTime: c.time, strategyUsed: "orb" };
                orbTriggered = true;
            }
        }

        if (timeVal >= 1000) {
            const isTrending = currentADX >= 20;

            if (isTrending) {
                const currentVWAP = vwap[i];
                if (c.close > currentVWAP && ema9[i] > ema21[i]) {
                    const priceNearVWAP = Math.abs(c.close - currentVWAP) / c.close < 0.0015;
                    if (priceNearVWAP && c.close > ema9[i] && candles5Min[i-1].close <= ema9[i-1]) {
                        activePosition = { type: "CE", entryPrice: c.close, sl: c.close - (1.0 * currentATR), tp: c.close + (1.5 * currentATR), entryTime: c.time, strategyUsed: "vwap" };
                    }
                }
                else if (c.close < currentVWAP && ema9[i] < ema21[i]) {
                    const priceNearVWAP = Math.abs(c.close - currentVWAP) / c.close < 0.0015;
                    if (priceNearVWAP && c.close < ema9[i] && candles5Min[i-1].close >= ema9[i-1]) {
                        activePosition = { type: "PE", entryPrice: c.close, sl: c.close + (1.0 * currentATR), tp: c.close - (1.5 * currentATR), entryTime: c.time, strategyUsed: "vwap" };
                    }
                }
            } else {
                const upperBB = bbUpper[i];
                const lowerBB = bbLower[i];
                
                if (upperBB > 0 && lowerBB > 0) {
                    if (c.close >= upperBB && currentRSI >= 70) {
                        activePosition = { type: "PE", entryPrice: c.close, sl: c.close + (1.0 * currentATR), tp: c.close - (1.5 * currentATR), entryTime: c.time, strategyUsed: "bollinger" };
                    } else if (c.close <= lowerBB && currentRSI <= 30) {
                        activePosition = { type: "CE", entryPrice: c.close, sl: c.close - (1.0 * currentATR), tp: c.close + (1.5 * currentATR), entryTime: c.time, strategyUsed: "bollinger" };
                    }
                }
            }
        }
    }

    console.log(`\n=========================================================================`);
    console.log(`📈 NIFTY50 REGIME-SWITCHING MULTI-YEAR BACKTEST REPORT`);
    console.log(`🗓️ Period: July 2022 - July 2026 (4 Years)`);
    console.log(`=========================================================================`);
    console.log(`🟢 Initial Capital  : ₹${initialBalance.toLocaleString("en-IN")}`);
    console.log(`🟢 Ending Capital   : ₹${Math.round(balance).toLocaleString("en-IN")}`);
    console.log(`🔥 Net Profit       : ₹${Math.round(balance - initialBalance).toLocaleString("en-IN")} (${((balance - initialBalance)/initialBalance * 100).toFixed(1)}%)`);
    console.log(`📊 Max Drawdown     : ${maxDrawdown.toFixed(2)}%`);
    console.log(`📊 Total Trades     : ${totalTrades}`);
    console.log(`=========================================================================`);
}

main().catch(console.error);
