# 📝 Session Notes - 01 June 2026

## Aaj kya kiya:

### ✅ Bug 1: Chart NaN Crash Fix
- `TradingChart.tsx` mein `useMarket()` update kiya.
- Ab wo dictionary se selected symbol ka price leta hai.
- Chart pe ab symbol ka naam bhi dikhta hai (e.g. "LIVE MARKET - SENSEX").

### ✅ Bug 2: server.js Code Gadbad Fix
- `server.js` ka poora code reset kiya — forEach loop galat jagah (WebSocket ke andar) ghus gaya tha.
- Ab ek clean, error-free version hai.

### ✅ Bug 3: Average Price Math Fix
- Portfolio ke `/api/portfolio` route mein SELL trade pe invested amount bhi adjust hoti hai.
- Ab average price sahi calculate hogi, koi "-43,000" nahi aayega!

### ✅ New Feature: Individual Trade P&L
- Backend mein ek nayi API banai: `GET /api/trades`
- Yeh API aaj ki saari individual trades return karti hai (BUY/SELL dono).
- `PositionsPanel.tsx` mein 2 Tabs banaye:
  - **"Live Positions"** → Aggregate holdings + Live unrealized P&L
  - **"Today's Trades"** → Har individual trade ka BUY/SELL label + uska live P&L

## ⚠️ Ek Zaruri Kaam Baaki Hai:
Supabase ki `portfolio` table mein `created_at` column hona chahiye taaki `/api/trades` aaj ke trades filter kar sake.
- Supabase Dashboard → Table Editor → `portfolio` table kholo
- Check karo ki `created_at` column hai ya nahi
- Agar nahi hai: New Column → Name: `created_at`, Type: `timestamptz`, Default: `now()`

## Next Steps (Future):
- [ ] Dropdown se SENSEX/BankNifty select karke buy karna test karna
- [ ] Database Reset script chalana agar purani galat entries hain
- [ ] Auto-SL (Stop Loss) feature banana
