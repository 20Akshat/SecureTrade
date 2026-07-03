# 🤖 SecureTrade Bot Advisor - Trading Rules & Logic Guide

This guide outlines the mathematical triggers, risk parameters, lot sizing, and system optimizations that the SecureTrade Bot uses to suggest trades.

---

## 📈 1. Regular Mode Trading Strategies (सामान्य ट्रेडिंग रणनीतियाँ)
Regular mode mein user ke paas bot settings panel mein do alag strategy modes select karne ka option hai:

---

### Strategy Mode A: RSI + EMA Crossover (ट्रेंड क्रॉसओवर मोड)
Bot dynamic crossovers aur momentum indicators ke convergence par entry leta hai:
- **Trend Filter (EMA):**
  - **Bullish Trend:** `EMA(9) > EMA(50)` AND `EMA(21) > EMA(50)`
  - **Bearish Trend:** `EMA(9) < EMA(50)` AND `EMA(21) < EMA(50)`
- **CE (Call) Entry:** Fresh Bullish Crossover (`EMA9` crosses above `EMA21`) AND major trend is bullish AND RSI is constructive (`RSI < 50` or recovering).
- **PE (Put) Entry:** Fresh Bearish Crossover (`EMA9` crosses below `EMA21`) AND major trend is bearish AND RSI is constructive (`RSI > 50` or declining).
- **Target & SL:** default limits check dynamic (`+20%` target, `-15%` SL, ya BANKNIFTY ke liye `+12%` target, `-10%` SL).

---

### Strategy Mode B: Power of Stocks 5EMA (5EMA ब्रेकआउट मोड)
Subasish Pani ki popular momentum scalping strategy par based breakout signals:
- **Alert Candle Identification:**
  - **CE Alert Candle:** A 5-minute candle whose entire body (specifically the High) is completely **below the 5EMA line** (`candle.high < ema5`).
  - **PE Alert Candle:** A 5-minute candle whose entire body (specifically the Low) is completely **above the 5EMA line** (`candle.low > ema5`).
- **Breakout Trade Triggers:**
  - **CE (Call) Entry:** Live tick price breaks **above** the high of the latest CE Alert Candle (`price > ceAlertHigh`).
  - **PE (Put) Entry:** Live tick price breaks **below** the low of the latest PE Alert Candle (`price < peAlertLow`).
- **1:3 Risk-to-Reward Ratio Execution:**
  - **CE Stop-Loss:** Low of the alert candle.
  - **PE Stop-Loss:** High of the alert candle.
  - **Dynamic Targets:** Stop-loss point difference is measured in percentage, and target is automatically set to **exactly 3 times** the SL percentage (`targetPct = slPct * 3`) to enforce 1:3 risk-to-reward ratio. (Capped SL range between 1.5% and 20%).

---

### C. Extreme Reversal Entries (Reversal Crossovers)
*(RSI + EMA Cross Mode only)*
- **Oversold CE Reversal:** Triggered when a fresh bullish crossover (`EMA9 > EMA21`) occurs while RSI is deeply oversold (`RSI < 28`).
- **Overbought PE Reversal:** Triggered when a fresh bearish crossover (`EMA9 < EMA21`) occurs while RSI is deeply overbought (`RSI > 72`).

---

## ⚡ 2. Expiry Day Special "Zero-Hero" Mode
Zero-Hero mode expiry contracts ki high gamma swings ko trade karne ke liye optimized hai. (Runs on Tuesdays/Thursdays after 12:30 PM).

### A. Filters & Conditions
- **Index Restrictions:** Scans **only** the index expiring today (Tuesday: `NIFTY50`, Thursday: `SENSEX`).
- **Time Restriction:** Inactive before **12:30 PM IST** (maximum premium decay phase).
- **Strike Selection:** Loops Out-Of-The-Money (OTM) strikes to choose the contract with premium in the **₹5 - ₹25 range** (minimum capital risk, high multiplier potential).

### B. Zero-Hero Entry Triggers
- **CE Trigger:** Fresh Bullish Crossover (`EMA9 > EMA21`) AND expanding momentum (`RSI > 52`).
- **PE Trigger:** Fresh Bearish Crossover (`EMA9 < EMA21`) AND contracting momentum (`RSI < 48`).

---

## 📊 3. Sizing & Lot Suggestions (लॉट साइज नियम)
- **Regular Mode Sizing:**
  - Margins are capped at **10% of user's available balance** to avoid overall drawdown.
  - Formula: `Math.floor((availableBalance * 0.10) / lotCost)`
- **Zero-Hero Sizing:**
  - Risk exposure is capped at a maximum of **₹1,500 total premium risk per trade**.
  - Formula: `Math.floor(1500 / lotCost)`

---

## 🎯 4. Target & Stop-Loss Settings (एग्जिट नियम)
Positions hit hone par dynamic targets ya stop-loss automatically execute hote hain. Auto early exits (like time-decay warnings) are completely disabled.

| Index Type | Target (%) | Stop Loss (%) | Risk Profile |
| :--- | :--- | :--- | :--- |
| **NIFTY50 / SENSEX** (Regular) | `+20%` | `-15%` | Standard Balanced |
| **BANKNIFTY** (Custom Safe) | `+12%` | `-10%` | High Volatility Guard |
| **Zero-Hero Mode** (All Index) | `+150%` | `-80%` | High Leverage / Gamma Spec |

### A. Position Averaging (BUY_MORE)
- **Condition:** Active position falls more than **-6%**, but the major trend and indicators (RSI and EMA direction) are still strongly favorable.
- **Action:** Recommends buying more lots to average down entry cost, provided the user has sufficient capital.

---

## 🔌 5. System Rate-Limiting & API Safeguards
Angel One SmartAPI rate limits block requests if spammed. The backend implements:
- **3-Second Interval:** Index quotes are fetched every 3 seconds to keep index tracking live without triggering rate limit blocks.
- **Cached Option Quotes:** Option LTP is cached for **2000ms** during market hours and **1000ms** after hours.
- **Smart Token Retention:** JWT Session token is **not** cleared on temporary `Access Denied` rate limit blocks. Re-login triggers only on actual authentication expiration (HTTP 401).
