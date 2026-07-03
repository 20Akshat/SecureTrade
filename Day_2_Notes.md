# 📝 SECURE-TRADE: DAY 2 NOTES
*(Kripya isey apni notebook mein Day 1 ke aage likh lein)*

---

## 📌 TOPIC 1: Database & Supabase (The Memory)

### 1. Database kya hota hai?
- **Concept:** Jaise tumhare mobile mein Gallery hai jahan photos permanently save hoti hain (phone switch off hone ke baad bhi nahi udti). Waise hi hamare App ke liye ek permanent storage chahiye jahan Users ka paisa, trades, aur passwords save ho saken. Isey Database kehte hain.
- **Supabase kyun?** Yeh ek cloud database hai (PostgreSQL) jo humein API keys (Secret keys) deta hai, taaki humara Node.js code seedha internet par data save kar sake.

### 2. The `.env` File (The Secret Locker) 🔐
- **Logic:** Hum apni secret API keys (jaise Password aur URL) ko seedha apne code mein nahi likhte. Agar hacker ne ya kisi dost ne hamara code dekh liya, toh woh hamara database uda dega.
- **Solution:** Hum ek `.env` (Environment) naam ki invisible file banate hain, wahan passwords rakhte hain, aur main code mein `process.env.KEY_NAME` likh kar password ko chupke se bula lete hain.

---

## 📌 TOPIC 2: Database Connection & The Big Error (Troubleshooting)

### 1. Translator tool (`@supabase/supabase-js`)
- **Command:** `npm install @supabase/supabase-js`
- **Kyun chalaya?** Hamara Node.js by default Supabase ki bhasha nahi jaanta. Yeh tool ek "Bhasha Anuvadak (Translator)" ki tarah kaam karta hai jo hamare server ko sikhata hai ki Supabase se baat kaise karni hai.

### 2. The Node.js v20 Error 🚨
Jab humne pehli baar connection banaya, toh ek lamba sa error aaya:
`Error: Node.js 20 detected without native WebSocket support.`

**Error ka asli matlab:**
Supabase ka naya version bolta hai ki *"Main seedha connect nahi hunga, mujhe ek advance line (WebSocket) chahiye."* Node.js version 22 ke baad walo mein yeh line in-built hoti hai. Par kyunki hum version 20 par hain, Node.js ne mana kar diya!

### 3. The Fix (The "ws" Tool) 🛠️
Humne is error ko bypass karne ke liye manually "ws" library Supabase ko pakda di. 
*Note this down in your copy:*

```javascript
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws'); // Humara manual WebSocket tool
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false // Server mein Browser ki tarah LocalStorage nahi hota, isliye ise false kiya taaki error na aaye.
    },
    realtime: {
        transport: ws // Humne Supabase ko apni "ws" line use karne ko de di (Problem Solved!)
    }
});

module.exports = supabase; // Is tool ko poori app mein share karne ke liye
```

### Interview Tip 💡
Agar interviewer pooche ki *"Node.js mein Supabase connect karte waqt persistSession false kyun karte hain?"*
**Jawab:** "Sir, Frontend (React) mein browser ke paas cookies aur LocalStorage hota hai data save karne ke liye. Par Node.js Backend ek server hai, uske paas koi LocalStorage nahi hoti. Agar hum ise `true` chhod dein, toh woh storage dhoondega aur crash ho crash ho jayega. Isliye hum backend mein persistSession hamesha `false` rakhte hain!"

---

## 📌 TOPIC 3: Table Creation (The SQL Magic) 🗄️

Humne database mein `users` table banayi. 
**SQL Query aur uska Logic:**
```sql
CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  balance numeric DEFAULT 100000,
  created_at timestamp DEFAULT now()
);
```
- **`uuid` (Universally Unique Identifier):** Har naye user ko 1, 2, 3 ID dene ki jagah SQL usko ek bahut lambi random ID deta hai (e.g., `550e8400-e29b-41d4-a716-446655440000`). Isse hackers guess nahi kar sakte ki app mein kitne users hain.
- **`UNIQUE NOT NULL`:** Matlab ek email se doosra account nahi ban sakta, aur khali email valid nahi hoga.
- **`numeric DEFAULT 100000`:** Jab bhi naya user banega, database usay automatically ₹1,00,000 (1 Lakh) virtual balance de dega trading seekhne ke liye.

---

## 📌 TOPIC 4: Authentication & Password Hashing 🛡️

### 1. `bcrypt` kya hai? (The Mixer Grinder / Juicer) 🥤
- **Analogy:** Maan lo `bcrypt` ek Mixer Grinder ya Juicer hai. Agar tum usme ek Seb (Apple / Original Password) daaloge, toh woh usko kuch aisa pees kar juice bana dega ki bahar ek random mix (Hash: `$2b$10$wdf...`) niklega. Ab us juice ko dekh kar duniya ki koi bhi taqat use wapas Seb (Apple / Password) nahi bana sakti. Isey **"One-Way Hashing"** kehte hain.

### 2. Hashing vs Encryption (Interview ka sabse bada sawaal)
- **Encryption:** Jaise taal-chabi. Tumne data lock kiya (Encrypt), aur chabi se wapas khol liya (Decrypt). (e.g., AES-256 jo hum API keys ke liye use karenge).
- **Hashing:** Isme password lock toh ho jata hai, par iski koi chabi nahi hoti. Isko wapas original format mein decrypt nahi kiya jaa sakta.

### 3. Signup API Logic
```javascript
// 1. User ne password bheja "Ramesh@123"
const hashedPassword = await bcrypt.hash(password, 10); 
// 2. Humara bcrypt usko pees dega ($2b$10$x... jaisa bana dega)
// 3. Phir hum us kachre (hash) ko database mein save kar lenge.
```
- **Fayda:** Agar database hack bhi ho gaya, toh hacker ko password nahi milega!
- **`10` kya hai?:** Yeh "Salt Rounds" hain. Matlab bcrypt password ko 10 baar grind karega (ghuma-ghuma kar confuse karega) taaki duniya ka sabse tez supercomputer bhi us password ko crack na kar sake.
