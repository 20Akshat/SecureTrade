# 🛠️ Bug Fixes Plan (Ready for when you return!)

Bhai aaram se break lo! Tumhare jaane ke baad maine teeno screenshots ko dhyan se analyze kiya aur saari bimariyon ka ilaaj dhoond liya hai. Jab tum wapas aao, toh bas in steps ko follow karna aur sab ekdum makhan ho jayega!

---

### Bug 1: Chart Crash (NaN Error) 📉
**Issue:** `TradingChart.tsx` abhi bhi purana `currentPrice` dhoondh raha tha jo ab dictionary ban chuka hai.
**Fix:** `frontend/src/components/TradingChart.tsx` kholo aur usme line 11 ke aas paas jahan `useMarket()` call ho raha hai usko aise change kardo:

```tsx
  // OLD: const { rsi, signal, currentPrice } = useMarket();
  // NEW:
  const { marketData, selectedSymbol } = useMarket();
  const activeData = marketData[selectedSymbol] || { price: 0, rsi: 0, signal: "WAIT" };
  const currentPrice = activeData.price;
  const rsi = activeData.rsi;
  const signal = activeData.signal;
```
*Is ek change se chart wapas zinda ho jayega aur alag-alag symbol ka chart dikhayega!*

---

### Bug 2: Average Price `-43,567` (Math Gadbad) 🧮
**Issue:** Jab tumne "Short Sell" kiya (bina kharide becha), toh backend ka average price calculate karne wala formula confuse ho gaya.
**Fix:** `backend/server.js` mein apna `app.get('/api/portfolio')` dhundo aur uske andar ka loop aise theek kardo:

```javascript
        portfolioData.forEach(trade => {
            if (!positions[trade.symbol]) {
                positions[trade.symbol] = { symbol: trade.symbol, totalQuantity: 0, totalInvested: 0 };
            }
            const qty = Number(trade.quantity);
            const price = Number(trade.average_price);
            
            if (qty > 0) {
                // Buy kiya toh investment add karo
                positions[trade.symbol].totalInvested += (qty * price);
                positions[trade.symbol].totalQuantity += qty;
            } else {
                // Sell kiya toh investment usi proportion mein kam karo
                if (positions[trade.symbol].totalQuantity > 0) {
                   const avgBuyPrice = positions[trade.symbol].totalInvested / positions[trade.symbol].totalQuantity;
                   positions[trade.symbol].totalInvested -= (Math.abs(qty) * avgBuyPrice);
                }
                positions[trade.symbol].totalQuantity += qty;
            }
        });
```

---

### Bug 3: "Shares sell nhi hore hai" 🛑
**Issue:** Tumhara holding quantity negative mein (-184) chala gaya tha, aur maine pichli baar "Strict Limits" wapas laga di thi. Toh system soch raha hai "Iske paas toh shares hain hi nahi, yeh aur kaise bechega?"
**Fix:** `backend/server.js` mein wapas jao, aur `app.post('/api/sell')` ke andar se yeh strict block hata do (delete maro ya comment kar do):

```javascript
        // Isey HATA do taaki tum wapas short sell kar sako!
        // if (totalShares < quantity) {
        //     return res.status(400).json({ error: "Insufficient shares to complete the sale." });
        // }
```

Jab free hona, aaram se aana, ye changes karna aur mujhe ping karna. Main yahin baitha hu. Bye bhai! 👋
