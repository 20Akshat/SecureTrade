# 🤖 Phase 5 (Pivot): The AI Algorithmic Trading Bot

## Goal Description
Bhai, tumhari baat main 100% samajh gaya. Tum ek simple "Paper Trading" app nahi, balki ek **"Smart Algo-Trading Bot"** chahte ho! Ek aisi machine jo soti na ho, market ko dekhe, aur khud bataye ki "Bhai abhi Call le le" ya phir khud hi tumhare liye Buy/Sell kar de taaki profit maximize ho! 

Yeh ek massive aur advanced shift hai, lekin hum isko zarur banayenge.

## User Review Required
> [!IMPORTANT]
> **Warning About Real Money:** Abhi jo hum data use kar rahe hain, wo hamare server ka mock data hai. Hum Bot ka "Dimaag" (Brain) aur "UI" abhi banayenge. Lekin jab tumhe sach mein asli paise se profit badhana hoga, toh is bot ke peeche humein kisi asli broker ka API (jaise Zerodha Kite, Upstox, ya Binance) connect karna padega. Kya tum is baat se clear ho? Abhi hum isko apne server environment mein test karenge ki Bot sahi time par entry aur exit le raha hai ya nahi.

## Proposed Changes: The Algo-Bot Architecture

### 1. The Signal Engine (Backend `server.js`)
Hum backend mein ek algorithm likhenge (Trend Analysis). 
- **Signal Generator:** Jab market ekdum se girega ya uthega, toh bot automatically ek signal bhejega: *"Strong BUY Signal: Call at ₹21,900"*.
- Yeh signals hum WebSockets ke zariye seedha frontend par bhejenge.

### 2. Auto-Trading Mode (Backend)
- Agar user ne app mein **"Auto-Bot"** ON kiya hua hai, toh bot tumhare click karne ka wait nahi karega. Jaise hi signal aayega, bot khud backend se tumhare `portfolio` mein order place kar dega aur SL/Target bhi apne hisaab se laga dega.

### 3. Bot Dashboard (Frontend)
#### [NEW] `frontend/src/components/BotControl.tsx`
- Ek naya panel banayenge jisme ek bada sa switch hoga: **🤖 AUTO-TRADE: ON / OFF**.
- Isme ek "Live Signals" ka box hoga jahan bot apne suggestions (Call/Put) print karega.

#### [MODIFY] `PortfolioPanel.tsx` & `server.js`
- SL (Stop Loss) aur Target lagane ka option add karenge.
- Ek naya logic likhenge jo har second check karega ki agar price target par pahaunch gaya toh trade apne aap cut ho jaye aur profit wallet mein jud jaye.

## Verification Plan
1. Hum backend engine mein ek dummy algorithm dalenge jo har 10-15 second mein ek trend pakde.
2. Hum Auto-Trade button ON karenge.
3. Hum hath band karke baith jayenge aur dekhenge ki kya bot apne aap wallet se paise kat kar shares kharid raha hai aur profit book kar raha hai!
