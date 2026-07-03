# 🚀 Day 4: Frontend Development (The Trader Dashboard)

## Goal Description
Ab hamara Backend 100% ready hai! Agla step hai ek aisi **Web Application (UI)** banana jise dekh kar users ko maza aa jaye. Hum Next.js (React) ka use karke ek modern, dark-mode, aur premium "Trader Dashboard" banayenge. Is dashboard mein live graphs chalenge (WebSockets se) aur hum buttons click karke directly Buy/Sell order lagayenge!

## User Review Required
> [!IMPORTANT]
> - **Aesthetics:** Hum ek bahut hi premium, sleek "Glassmorphism" Dark Mode design use karenge taaki yeh bilkul Zerodha ya Binance jaisa professional lage. Neon colors aur smooth animations honge taaki app bahut "alive" feel ho!
> - **Library:** Live graphs dikhane ke liye hum TradingView ki `lightweight-charts` library install karenge jo ki industry standard hai.

## Proposed Changes

### 1. New Packages
- `lightweight-charts` (For live graph rendering)
- `lucide-react` (For beautiful UI icons)

### 2. Components (`frontend/src/components/`)
#### [NEW] `AuthForm.tsx`
- Yeh component user ko Login ya Signup karne ka form dega.
- Submit karne par backend se JWT (Smart Card) layega aur browser (localStorage) mein save karega.

#### [NEW] `TradingChart.tsx`
- Yeh hamari application ka dil hoga. 
- Yeh component WebSockets se connect hoga aur har second aane wale "NIFTY50" ke price ko ek live chalte hue graph par plot karega.

#### [NEW] `PortfolioPanel.tsx`
- Yeh ek side-panel hoga jahan user ka Wallet Balance (₹1,00,000) aur uski kharidi hui NIFTY50 ki quantity dikhegi.
- Isme **Buy** aur **Sell** ke bade buttons honge.

### 3. Main Dashboard (`frontend/src/app/page.tsx`)
#### [MODIFY] `page.tsx`
- Is file ko hum completely rewrite karenge taaki agar user logged in nahi hai, toh use pehle Login page dikhe, aur agar logged in hai toh poora Trading Dashboard dikhe.

## Verification Plan
1. Hum dono terminals (Backend aur Frontend) ko run karenge.
2. Hum browser (`http://localhost:3000`) open karke ek naya account banayenge.
3. Login karne ke baad hum live chart ko chalte hue dekhenge.
4. Hum "Buy" button dabayenge aur check karenge ki wallet balance live kam hota hai ya nahi!
