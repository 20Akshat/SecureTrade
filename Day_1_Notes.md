# 📝 SECURE-TRADE: DAY 1 NOTES
*(Kripya isey apni notebook mein likh lein)*

---

## 📌 TOPIC 1: Basic Node.js & Express (The Engine)

### 1. Variables kya hote hain? (`const`, `let`)
- **Concept:** Coding mein data (jaise number ya text) ko store karne ke liye ek dabbe (box) ki zaroorat hoti hai. Uss dabbe ko Variable kehte hain.
- **`const`:** (Constant) Yeh ek aisa dabba hai jiska saman ek baar rakhne ke baad change nahi ho sakta.
- **`let`:** Yeh kachha dabba hai. Iska saman baad mein change ho sakta hai.

### 2. Imports (Bahar se tools mangwana)
```javascript
const express = require('express');
```
- **Line ka matlab:** `require` ka matlab hota hai bahar se kisi tool ko apni file mein laana. Humne internet se `express` naam ka tool manga kar ek dabbe (const) mein daal diya.
- **Express kya hai?** Node.js mein server (jo users ki requests sunta hai) banana bahut mushkil hai. Express ek bana-banaya aasaan framework hai jo is kaam ko chutkiyon mein kar deta hai. (Example: Express ek Manager ki tarah hai jo customers ke orders leta hai).

### 3. Server Start Karna (The Engine On)
```javascript
const app = express();
const PORT = 5001;
app.listen(PORT, () => { console.log("Server is running!"); });
```
- **Line ka matlab:** 
  - `app = express()`: Manager (Express) ko jagaya aur kaam par laga diya.
  - `PORT`: Har computer mein lakho darwaze (ports) hote hain data aane ke liye. Humne bola ki humara server Darwaza No. 5001 par khada rahega.
  - `app.listen()`: Server ko bola ki ab Darwaze (5001) par khade hokar sunna (listen) shuru karo, aur jab shuru ho jaye toh terminal mein print karo "Server is running!".

---

## 📌 TOPIC 2: Cyber Security Layers (The Interview Highlights)

### Layer 1: Helmet & XSS Attack (Invisible Shield) 🛡️
```javascript
const helmet = require('helmet');
app.use(helmet());
```
- **XSS (Cross-Site Scripting) ki Kahani:** Maan lo tumhari website ek Public Notice Board hai. Koi bhi wahan comment likh sakta hai. Ek hacker aata hai aur wahan marker se ek "Jaadui Mantra" (Malicious JavaScript code) likh deta hai. Ab jab bhi koi naya asli user us board ko padhne aata hai, woh "Jaadui Mantra" uski aankhon ke zariye uske computer par chal jata hai aur uska password hacker ke paas udkar chala jata hai!
- **Helmet kya karta hai:** Yeh HTTP headers (data ke upar ka cover) ko hide kar deta hai aur browser ko strictly bolta hai ki "Notice board par likha koi bhi jaadui mantra mat chalana!"
- **Interview Answer:** "Sir, maine Helmet use kiya taaki koi hacker mere server par Cross-Site Scripting (XSS) jaise attacks na kar paye."

### Layer 2: CORS (The Bouncer) 💂‍♂️
```javascript
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3000' }));
```
- **CORS Full Form:** Cross-Origin Resource Sharing.
- **CORS ki Kahani:** Maan lo tumhara server ek Private VIP Club hai jisme bahut paisa hai. CORS us club ka Bouncer hai. Bouncer ke paas ek Guest List hai jisme likha hai ki sirf "localhost:3000" wale hi andar aa sakte hain. Agar koi Hacker "evil.com" se aakar ghusne ki koshish karega, toh Bouncer (Browser) uska ID dekhega aur usko dhakka maar kar bahar nikal dega bolkar: "CORS Error: Access Denied!"
- **Kya karta hai:** Yeh ensure karta hai ki sirf tumhari apni website hi tumhare backend server se baat kar sake.

### Layer 3: Rate Limiter (Anti-DDoS) 🚦
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);
```
- **Kya karta hai:** DDoS (Distributed Denial of Service) ek attack hai jisme hacker bot se 1 second mein lakho requests bhej kar server ko hang (crash) kar deta hai.
- **Interview Answer:** "Sir, maine Rate Limiter lagaya hai jo ek IP Address ko 15 minute mein sirf 100 baar aane ki permission deta hai. 101th baar aate hi server usko block kar dega."

---

## 📌 TOPIC 3: WebSockets (Live Market Data) ⚡

### HTTP vs WebSockets (Sabse Important Question)
- **HTTP (REST API):** Yeh "Chitthi" (Postcard) ki tarah hai. Ek baar request bhejo, toh response aayega, aur connection tut jayega. Live data ke liye user ko baar-baar page refresh karna padega.
- **WebSocket:** Yeh "Phone Call" ki tarah hai. Ek baar call (connection) mil gaya, toh line khuli rehti hai. Ab server bina maange bhi har second live prices (Nifty/Stocks) user ke screen par push kar sakta hai bina refresh kiye!

### WebSocket Ka Code Logic:
```javascript
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    setInterval(() => {
        ws.send("NIFTY 22000"); // Har 1 second mein naya price bhejo
    }, 1000);
});
```
- **Line ka matlab:** 
  - `wss.on('connection')`: Jaise hi koi naya trader app kholta hai, yeh function chalta hai.
  - `setInterval(..., 1000)`: Yeh timer hai. Har 1000 milliseconds (1 second) ke baad yeh andar ka code chalata hai.
  - `ws.send()`: Har 1 second mein server naya price nikalta hai aur user ke khule hue "pipe" (connection) ke andar daal deta hai, jo seedha uski screen par dikhta hai.
