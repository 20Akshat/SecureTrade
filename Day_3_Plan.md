# 🚀 Day 3: The Core Trading Logic (Buy & Sell APIs)

## Goal Description
Ab hamare paas ek secure backend hai aur users login kar sakte hain. Agla step hai **Trading Engine** banana. Is phase mein hum users ko allowed karenge ki woh apne virtual ₹1 Lakh balance se stocks (jaise NIFTY50) buy ya sell kar sakein. Iske liye hum ek naya database table (`portfolio`) aur do naye routes banayenge.

---

## 🏗️ Proposed Changes & Architecture

### 1. Nayi Database Table: `portfolio`
Jaise user ka details save karne ke liye `users` table thi, waise hi kharide hue shares save karne ke liye `portfolio` table banayenge.
* **Fields:** 
  * `id`: Share entry ki unique ID
  * `user_id`: Yeh share kis user ka hai?
  * `symbol`: Konsa stock hai? (e.g., NIFTY50)
  * `quantity`: Kitne shares kharide?
  * `average_price`: Kis price par kharida?

### 2. The Security Guard: JWT Middleware
Hum nahi chahte ki koi bina login kiye seedha URL hit karke shares buy kar le.
* Isliye hum ek "Security Guard" (Middleware) banayenge. 
* Jab bhi koi user `/api/buy` par hit karega, guard sabse pehle usse uska **Smart Card (JWT Token)** maangega. Agar token valid hua, tabhi engine trade allow karega.

### 3. The Buy API (`POST /api/buy`)
* **Logic:**
  1. Guard pehle Token check karega.
  2. Server check karega ki kya user ke paas utna **Balance** hai? (Jaise 10 share x ₹100 = ₹1000 chahiye).
  3. Agar balance hai, toh balance deduct hoga aur `portfolio` table mein naye shares add ho jayenge.

### 4. The Sell API (`POST /api/sell`)
* **Logic:**
  1. Guard Token check karega.
  2. Server check karega ki kya user ke paas bechne ke liye woh shares **Portfolio** mein hain bhi ya nahi?
  3. Agar shares hain, toh `portfolio` se shares minus ho jayenge aur uski current price ke hisaab se paise wapas **Balance** mein add ho jayenge.

---

## 🧪 Verification Plan (Testing)

Jaisa humne Day 2 mein `test-api.js` use kiya tha, waise hi Day 3 mein bhi hum `test-api.js` ko update karke usse ek mock trade lagwayenge:
1. `test-api.js` ek dummy account se pehle login karega aur **Token** nikalega.
2. Us Token ka use karke woh NIFTY50 ke 5 shares buy karega.
3. Fir wahi Token use karke 2 shares sell karega.
4. Database check karke verify karenge ki balance aur shares sahi deduct hue ya nahi.
