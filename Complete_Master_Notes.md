# 🎓 SECURE-TRADE: COMPLETE MASTER NOTES (Zero to Hero)
*(Yeh tumhari poori journey ka master document hai. Isko apni copy mein bilkul aise hi likhna, interviews mein yahi concepts pooche jayenge!)*

---

## 🏗️ PHASE 1: Project Ka Base Banana (The Foundation)

Sabse pehle humne apne project ka ghar (folder) banaya aur usme Frontend (Design) aur Backend (Engine) set kiya.

### 1. Folder aur Frontend Setup
**Terminal Commands:**
```bash
mkdir C:\SecureTrade
cd C:\SecureTrade
npx -y create-next-app@latest frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```
* **Logic:** 
  - `mkdir`: Yeh command naya folder banati hai (Make Directory).
  - `npx create-next-app`: Yeh command humare liye Next.js (Frontend) ka poora bana-banaya framework download karti hai. Humne `--tailwind` use kiya design ke liye aur `--ts` (TypeScript) use kiya fewer bugs ke liye.

### 2. Backend Setup
**Terminal Commands:**
```bash
mkdir backend
cd backend
npm init -y
npm install express cors helmet express-rate-limit dotenv jsonwebtoken bcrypt ws @supabase/supabase-js
```
* **Logic:**
  - `npm init -y`: Yeh hamare backend engine ko ek "Identity Card" (`package.json`) deta hai.
  - `npm install ...`: Humne kai sare tools (Dependencies) internet se mangwaye. (e.g., `express` server banane ke liye, `bcrypt` password chupaane ke liye, aur `@supabase/supabase-js` database se judne ke liye).

---

## ⚙️ PHASE 2: Backend Engine & Security Layers (`server.js`)

Is phase mein humne `backend/server.js` banaya jo hamara "Brain" hai. Humne isme 4 Cyber Security Layers lagayi.

### 1. Express Server Start Karna
```javascript
const express = require('express');
const app = express();
const PORT = 5001;
app.listen(PORT, () => { console.log("Server running!"); });
```
* **Logic:** `require` se humne Express mangwaya aur usko `app` naam ke dabbe mein chalu kar diya. Port `5001` ek darwaza hai jahan se humara data in/out hoga.

### 2. The 3 Security Layers (Interview VIP Questions) 🛡️
* **Layer 1: Helmet (`app.use(helmet())`)**
  - **Analogy:** Helmet ek invisible shield hai.
  - **Kya karta hai:** Yeh XSS (Cross-Site Scripting) attacks rokti hai. (Yaad hai na "Notice Board aur Jaadui Mantra" wali kahani?) Yeh browser ko sakht instructions deta hai ki faltu ka koi bhi code mat chalne dena.
* **Layer 2: CORS (`app.use(cors({ origin: 'http://localhost:3000' }))`)**
  - **Analogy:** CORS ek "VIP Club ka Bouncer" hai.
  - **Kya karta hai:** Yeh dhyaan rakhta hai ki sirf hamara frontend (`localhost:3000`) hi hamare backend se data le sake. Koi doosra Hacker isse connect nahi kar payega.
* **Layer 3: Rate Limiter (`app.use(limiter)`)**
  - **Kya karta hai:** DDoS (Distributed Denial of Service) attack rokta hai. Agar hacker 1 second mein 1000 requests bhejkar server hang karna chahe, toh yeh rate limiter uske IP address ko block kar dega (jaise humne set kiya: 15 minutes mein sirf 100 requests).

---

## ⚡ PHASE 3: WebSockets (Live Market Data)

**HTTP (Postcard) vs WebSocket (Phone Call):**
* **HTTP:** Isme har baar naya request bhejna padta hai (page refresh karna padta hai).
* **WebSocket:** Ek baar connection jud gaya, toh line khuli rehti hai. Hum iska use karke server se har second Nifty/Stock ke **Live Prices** seedha user ki screen par push karte hain bina page refresh kiye!
* **Command Use Ki Thi:** `npm install ws`

---

## 🗄️ PHASE 4: Database Connection (`db.js` & Supabase)

Humne Supabase (Cloud PostgreSQL) use kiya taaki users ka data permanently save ho sake.

### 1. The Secret Locker (`.env` file)
* Hum apni API keys (URL aur Passwords) seedha code mein nahi likhte, nahi toh koi unko chura lega.
* Hum unhe `.env` file mein rakhte hain (jo chupayi hui hoti hai) aur code mein `process.env.SUPABASE_URL` karke bula lete hain.

### 2. Connection Code aur Node v20 ka "ws" Fix
Humare `db.js` mein humne connection banaya:
```javascript
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws'); 

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }, // Node Backend mein LocalStorage nahi hoti, isliye false
    realtime: { transport: ws }      // Node v20 mein in-built websocket nahi tha, isliye manual pass kiya!
});
```

### 3. The SQL Magic (Table Creation)
Humne Supabase mein SQL chalayi:
```sql
CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  balance numeric DEFAULT 100000
);
```
* **Logic:** Har naye user ko hum 1 lakh (`100000`) ka virtual balance free de rahe hain taaki woh trading seekh sake! Aur `uuid` se hacker total users count nahi kar sakta.

---

## 🔒 PHASE 5: User Signup & Password Hashing (`bcrypt`)

Humne ek Signup API (`POST /api/signup`) banayi, jisme humne Password ko chupaane ke liye `bcrypt` use kiya.

### 1. `bcrypt` kya hai? (The Fruit Juicer / Mixer) 🥤
* **Analogy:** Maan lo `bcrypt` ek Juicer machine hai. Agar tum usme ek Seb (Apple / Original Password) daaloge, toh woh usko kuch aisa pees kar juice bana dega ki bahar ek random mix (Hash: `$2b$10$wdf...`) niklega. 
* Ab us juice ko dekh kar duniya ki koi bhi taqat use wapas Seb (Apple / Password) nahi bana sakti. Isey **"One-Way Hashing"** kehte hain.

### 2. Encryption vs Hashing (Super Important)
* **Encryption:** Taala-Chabi. Lock bhi hoga, aur uski ek chabi hogi jisse wo wapas unlock (decrypt) ho jayega.
* **Hashing:** Isme password aisa lock hota hai jiski **koi chabi nahi hoti**. Ise decrypt karna namumkin hai. Agar hacker ne database chura bhi liya, toh use sirf random kachra dikhega, asli passwords nahi!

---

## 🔑 PHASE 6: The Login API & Token Security

Humne Login system banaya jisme 2 sabse important tools kaam kar rahe hain: **`bcrypt.compare`** aur **`jwt.sign`**.

### 1. Login mein Password Match Kaise Hota hai? (`bcrypt.compare`)
* **Sawaal:** Agar humara password juice (kachra) ban chuka hai, toh server check kaise karta hai ki password sahi hai ya nahi?
* **Jawab (Logic):** Jab user login karne aata hai aur apna password (`Apple`) daalta hai, toh server us `Apple` ko wapas juicer mein daalta hai aur ek **naya juice** banata hai. Fir server check karta hai ki kya yeh "naya juice" database mein rakhe hue "purane juice" (Hash) se match ho raha hai?
* **Code:** `await bcrypt.compare(enteredPassword, databaseHash);`
* Agar dono ka kachra (hash) same hai, iska matlab user ne bilkul sahi password daala tha! (Very Safe).

### 2. Login System kis se chal raha hai? (JWT - JSON Web Token)
* **Analogy:** Maan lo tum ek 5-Star Hotel (Hamari App) mein gaye. Reception par tumne apna ID card aur Password dikhaya. Sab sahi nikla, toh Receptionist ne tumhe ek **"Smart Key-Card" (JWT Token)** de diya. 
* **Fayda:** Ab jab tak tum us hotel mein rahoge, tumhe baar-baar apna ID card nahi dikhana padega. Tum Gym jao, Pool jao, ya Room mein jao, bas woh Smart Card (Token) scan karoge aur gate khul jayega.
* **Code:** 
```javascript
const token = jwt.sign({ userId: data.id }, 'secret_key', { expiresIn: '1d' });
```
* **Logic:** `jwt.sign` humare liye woh Smart Card banata hai jisme user ki thodi si details (ID) hoti hain. Yeh token sirf 1 din (`1d`) tak chalega, uske baad expire ho jayega (jisse security badhti hai). Hum token mein user ka balance ya password aadi nahi daalte.

---

## 🏛️ PHASE 7: Project Architecture (Kaunsi File Kya Karti Hai?)

*(Interview mein agar pooche ki tumhare backend folder ka structure kaisa hai, toh yeh samajhna zaroori hai!)*

### 1. `server.js` (The Car Engine / The Brain 🧠)
Yeh sabse main file hai! Jab hum `node server.js` likhte hain, toh engine on ho jata hai.
* **Iska kaam:** Iske andar hamare **Routes** likhe hain (jaise `/api/signup` aur `/api/login`). Jab koi user request karta hai, toh yeh engine tay karta hai ki usko Database ke paas bhejna hai, ya security check karni hai. Isme humari sari Security (Helmet, CORS) aur WebSockets chalu rehte hain.

### 2. `db.js` (The Fuel Pipe / The Wire 🔌)
Yeh file engine aur petrol tank (Database/Supabase) ke beech ka pipe hai.
* **Iska kaam:** Cloud mein rakhe Database se connection establish karna. Yeh pipe jab jud jata hai, toh yeh apna connection wapas `server.js` ko de deta hai taaki engine wahan se data bhej ya nikaal sake.

### 3. `.env` (The Secret Locker / Tijori 🔐)
Yeh kisi code ko nahi chalati, yeh sirf ek tijori hai.
* **Iska kaam:** Hum saare passwords aur secret keys yahan chupate hain. Hacker `.js` files easily padh sakte hain, par `.env` file kabhi nahi padh sakte. `server.js` aur `db.js` apni chabi le jaakar chupke se yahan se passwords nikaal lete hain.

### 4. `test-api.js` (The Driver / The Customer 🚗)
Yeh humari backend ka hissa nahi hai! Yeh sirf ek Testing Tool hai.
* **Iska kaam:** Kyunki abhi humare paas button dabane wala Frontend (React UI) nahi hai, isliye humne yeh fake file banayi hai. Yeh file wahi kaam karti hai jo kal ko hamara asli User/Frontend karega. Yeh data lekar `server.js` ke paas jati hai aur check karti hai ki sab theek se chal raha hai ya nahi.

**Architecture in Short:** 
**`test-api.js`** (Customer) ne order diya ➔ **`server.js`** (Manager) ne order suna aur verify kiya ➔ **`db.js`** (Pipe) ke zariye woh order **Supabase** (Kitchen/Database) mein banne gaya!

---

## 🐞 PHASE 8: Troubleshooting & Debugging Lesson (A Typos Story)

Aaj humne live debugging seekhi jab hamara Login fail ho gaya tha. 

### 1. The Error Story
* **Problem:** Jab humne signup/login ko test kiya, toh "Email already registered" aur HTML/DNS ke ajeeb errors aaye.
* **Reason:** Humari `.env` file mein `SUPABASE_URL` mein ek **ek akshar (letter) ki spelling mistake thi!** (Humne `p` ki jagah `r` likh diya tha, jaise: `qxkroydtey` instead of `qxkpoydtey`).
* **The Butterfly Effect:** Us ek letter ki galti se hamara Node.js server internet par us URL ko dhoondh nahi paaya (jisko tech bhasha mein `DNS ENOTFOUND` error kehte hain). 

### 2. The Big Lesson (Kahan chupi hoti hai galti?)
* Agar kisi API (Backend) ka connection fail ho jaye, toh humesha sabse pehle apni **`.env` file aur Secret Keys / URLs** dhyan se check karne chahiye.
* **Pro-tip:** Code humesha waisa hi karta hai jaisa tumne likha hai, waisa nahi jaisa tum chahte ho. Ek chota sa typo (spelling mistake) poora server crash kar sakta hai. Isliye aage se API keys hamesha **copy-paste** karni chahiye, manually type nahi karni chahiye!

---

## 🔐 PHASE 9: Deep Dive into JWT & Mock Testing

### 1. The JWT Token (JSON Web Token) kya hai?
Jo lamba sa kachra terminal mein aaya tha (`eyJhbGciOi...`), wahi JWT hai. Isey aasaan bhasha mein samajhte hain:
* **The Hotel Smart Card Analogy 🏨:** Maan lo tum ek 5-Star Hotel mein gaye. Reception par tumne apna Password aur ID check karwaya (Login kiya). Agar hotel wale tumhe har room, gym, ya pool mein jaane ke liye baar-baar Password mangte, toh tum chidh jaate. Isliye unhone tumhe ek **"Smart Key-Card" (JWT Token)** de diya. Ab jab bhi tum koi order karoge, bas yeh Token dikhaoge aur server samajh jayega ki *"Haan bhai, yeh wahi asli banda hai!"*
* **Token ke 3 Hisse (Dots se separate hote hain):**
  1. **Header:** Batata hai ki is card mein lock konsa laga hai.
  2. **Payload:** Isme tumhari information chupi hoti hai (ID aur Email). Password kabhi nahi hota!
  3. **Signature (The Stamp):** Yeh sabse important hai! Yeh hamare Server ki ek **Invisible Stamp** hai. Hacker apna email toh badal sakta hai, par yeh stamp nahi bana sakta kyunki uski Secret Chabi (`JWT_SECRET`) sirf hamare server ke paas hoti hai.

### 2. Bina Frontend ke User kaise ban gaya? (The `test-api.js` Logic)
* **Sawaal:** Tumne na koi form bhara, na password banaya, fir bhi `trader1@test.com` database mein kaise aa gaya?
* **Jawab:** Kyunki humne Frontend banane se pehle apne backend ko test karne ke liye **`test-api.js`** file banayi thi. Yeh file bilkul ek asli insaan (Frontend Form) ki tarah "acting" karti hai. Humne code mein hi likh diya tha: `body: JSON.stringify({ email: "trader1@test.com", password: "MySuperSecretPassword@123" })`. Toh jab humne script chalayi, usne khud hi form bhar diya aur enter daba diya! Kal ko jab hum React Frontend banayenge, toh yeh email/password ki jagah UI ke input box (textbox) se value aayegi.

---

## 📈 PHASE 10: The Trading Engine & Middleware Security

Ab humne apna Trading Engine (Buy aur Sell APIs) bana liya hai. Isko chalane se pehle 2 sabse badi security concepts samajhna zaroori hai:

### 1. RLS (Row Level Security) ko Disable kyun kiya?
* **Analogy (The Database Bouncer):** Supabase database ke paas by default apna khud ka bouncer hota hai jise RLS kehte hain. Agar user/frontend seedha database se baat karna chahe, toh RLS lagana zaroori hai taaki koi kisi aur ka data na chura le.
* **Humne disable kyun kiya?** Kyunki hum apne Frontend ko seedha database se baat karne hi nahi de rahe! Humara Frontend sirf hamare Node.js Backend (Engine) se baat karta hai. Aur hamara Node.js Backend ek "Admin" ki tarah kaam karta hai. Backend ke paas apni khud ki strict security (JWT Guard) hai, isliye humne Supabase ke internal bouncer (RLS) ko hata diya, warna woh bina wajah hamare code ko database mein data save karne se rok raha tha.

### 2. Middleware kya hota hai? (The Security Guard 👮‍♂️)
* **Analogy:** Maan lo tumhari App ek bada sa Office hai, jisme ek "Trading Room" (Buy/Sell APIs) hai. Agar koi bhi insaan sadak se uth kar seedha aaye aur bole "Mere liye 10 NIFTY shares khareed lo", toh kya server maan lega? Agar maan lega, toh log app ko barbaad kar denge.
* **The Solution:** Isliye humne ek **`auth.js`** naam ka Middleware banaya. Yeh ek "Security Guard" hai jo us "Trading Room" ke darwaze par khada hai.
* **Kaam kaise karta hai:** Jab bhi koi request `/api/buy` par aati hai, toh yeh Guard usse sabse pehle rokta hai aur kehta hai: *"Ruko! Apna Smart Key-Card (JWT Token) dikhao."*
  - Agar card nakli hai (Invalid token) ya expire ho chuka hai, toh Guard usko wahin se laat maar kar bhaga deta hai (`Error 401: Access Denied`). Engine tak request pohochni hi nahi deta.
  - Agar card asli hai, toh Guard token scan karke usme chupi hui `User ID` nikalta hai, usko request ke upar ek sticker ki tarah chipka deta hai (`req.user = decoded`), aur andar aane deta hai (`next()`).

### 3. The Buy & Sell Logic
* **Buy Logic:** Server sabse pehle Check karta hai ki kya account mein utne paise hain? Agar haan, toh total cost balance se kaato aur `portfolio` table mein naye shares add kar do.
* **Sell Logic:** Server Check karta hai ki kya tumhare paas bechne ke liye shares hain bhi ya nahi? Agar haan, toh `portfolio` se utne shares hata do aur share ki price ke hisaab se paise wapas balance (wallet) mein add kar do.

### 4. Code Explanation (Buy API & Sell API)
Jo code humne `server.js` mein likha, uski sabse important lines ka matlab:

**Buy API (`/api/buy`):**
1. `const totalCost = quantity * price;`: Agar 5 shares ₹100 ke kharide, toh total cost hui ₹500.
2. `const { data: userData } = await supabase...select('balance')...`: Database se poocho ki "Is bande ke purse (balance) mein abhi kitne paise hain?".
3. `if (userData.balance < totalCost)`: Agar purse mein ₹500 se kam hain, toh error de do ki "Paise nahi hain bhai!".
4. `const newBalance = userData.balance - totalCost;`: Agar paise hain, toh purse mein se ₹500 minus karke naya balance nikal lo.
5. `supabase.from('users').update({ balance: newBalance })`: Database mein purse ka naya balance update kar do.
6. `supabase.from('portfolio').insert(...)`: Portfolio (Demat Account) mein un 5 shares ko save kar lo.

**Sell API (`/api/sell`):**
1. `const totalRevenue = quantity * price;`: Agar 2 shares ₹150 mein beche, toh humein ₹300 milenge.
2. `supabase.from('portfolio').select('quantity')...eq('symbol', symbol)`: Check karo ki is bande ne NIFTY50 kharida bhi tha ya hawa mein bech raha hai?
3. `let totalShares = 0; ... if (totalShares < quantity)`: Check karo ki kharide huye shares se zyada toh nahi bech raha? (Khareede 5 the, bech 10 raha hai toh error de do).
4. `const newBalance = Number(userData.balance) + totalRevenue;`: Purse (balance) mein ₹300 add (plus) kar do.
5. `quantity: -quantity`: Portfolio se un beche hue shares ko hatane ke liye humne ek "Negative Entry" daal di (Minus mein quantity daal di).

---

## 💻 PHASE 11: Day 3 Complete Code Reference (Super Detailed Line-by-Line)

Yahan Day 3 mein likhe gaye saare codes ki ekdum deep, bacchon ko samajh aane wali line-by-line explanation hai. Isko padhne ke baad tumhe koi bhi interview mein hara nahi sakta!

### 1. The Portfolio Database Table (SQL)
Supabase mein kharide hue shares (assets) save karne ke liye humne yeh SQL chalayi thi:
```sql
CREATE TABLE portfolio (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  quantity numeric NOT NULL,
  average_price numeric NOT NULL,
  created_at timestamp DEFAULT now()
);
```
* **Line 2 (`id uuid...`):** Har ek trade (buy) ko ek unique id milti hai taaki koi do trade aapas mein mix na hon.
* **Line 3 (`user_id uuid REFERENCES users(id) ON DELETE CASCADE`):** 
  - `REFERENCES`: Yeh command batati hai ki yeh share kisne kharida hai. Yeh `users` table se link kar rahi hai. Isey "Foreign Key" aur "Relational Database" kehte hain.
  - `ON DELETE CASCADE`: Agar koi user gusse mein aakar apna account delete kar de, toh database apne aap uske saare shares `portfolio` table se uda dega. Humko manually delete nahi karna padega.
* **Line 4-6:** `symbol` (konsa stock hai), `quantity` (kitne kharide), `average_price` (kis bhaav par kharide). `NOT NULL` ka matlab hai ki yeh khali nahi ho sakte.

### 2. The Security Guard (`middleware/auth.js`)
Yeh file ensure karti hai ki bina JWT Token (Smart Card) ke koi Trade Room mein enter na kar paye.
```javascript
const jwt = require('jsonwebtoken'); // 1. Smart Card read karne wali machine mangwai

const authMiddleware = (req, res, next) => {
    // 2. req.headers.authorization: Frontend ne jo HTTP Header bheja hai, usme se token nikalo
    const authHeader = req.headers.authorization;
    
    // 3. Agar header khali hai, ya usme 'Bearer ' word nahi hai, toh bhaga do
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access Denied: Missing token." });
    }

    // 4. Token ke shuru mein 'Bearer ' (7 letters) likha hota hai, usko kaat kar sirf asli lamba token nikalo
    const token = authHeader.split(' ')[1];

    try {
        // 5. jwt.verify: Yeh line token ki asliyat check karti hai ki kahin hacker ne nakli signature toh nahi banaya? 
        // Isme wahi JWT_SECRET use hota hai jo humne Login ke time use kiya tha.
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_trading_key_123');
        
        // 6. Token sahi nikla! Ab us token ke andar chupi hui ID (decoded) ko humne 'req.user' naam ke dabbe mein daal diya.
        // Isse aage aane wale functions (jaise Buy/Sell) ko pata chal jayega ki kaunsa user trade kar raha hai.
        req.user = decoded;
        
        // 7. next(): Yeh sabse zaroori function hai! Iska matlab hai Guard keh raha hai "Ja bhai, tu pass ho gaya, ab andar ja ke Trade kar le."
        next(); 
    } catch (err) {
        // 8. Agar verify karte waqt koi bhi gadbad hui (jaise token expire ho gaya), toh seedha block kardo.
        res.status(401).json({ error: "Unauthorized: Token is invalid." });
    }
};
module.exports = authMiddleware; // 9. Is Guard ko dusri files mein use karne ke liye export kar diya.
```

### 3. The Buy & Sell Routes (`server.js`)
Yahan Buy aur Sell ke functions ki depth hai:

#### Buy API Deep Dive:
```javascript
// 1. '/api/buy' route hai, aur uske baad 'authMiddleware' laga hai. Iska matlab bina token ke is route ke andar aana namumkin hai.
app.post('/api/buy', authMiddleware, async (req, res) => {
    // 2. req.body se user ne kya kharida, kitna kharida, wo nikalo
    const { symbol, quantity, price } = req.body;
    const totalCost = quantity * price; // (Maslan: 5 * 22000 = 1,10,000)

    // 3. Database se pucho ki user ke purse (balance) mein kitne paise hain
    const { data: userData } = await supabase.from('users').select('balance').eq('id', req.user.userId).single();

    // 4. Agar totalCost uske balance se zyada hai, toh transaction cancel kardo. Udhaar allowed nahi hai.
    if (userData.balance < totalCost) {
        return res.status(400).json({ error: "Insufficient Balance" });
    }

    // 5. Paisa kato! Purane balance mein se totalCost minus karo, aur Supabase mein update kar do.
    const newBalance = userData.balance - totalCost;
    await supabase.from('users').update({ balance: newBalance }).eq('id', req.user.userId);

    // 6. Shares ko user ki 'portfolio' table (Demat Account) mein daal do.
    await supabase.from('portfolio').insert([{ user_id: req.user.userId, symbol: symbol, quantity: quantity, average_price: price }]);

    // 7. Sab sahi raha, toh success ka response bhej do.
    res.status(200).json({ message: "Bought!", newBalance });
});
```

#### Sell API Deep Dive:
```javascript
app.post('/api/sell', authMiddleware, async (req, res) => {
    // 1. Bechna kitna hai aur kya daam chal raha hai?
    const { symbol, quantity, price } = req.body;
    const totalRevenue = quantity * price;

    // 2. Sabse pehle Portfolio table check karo ki kya bande ne zindagi mein kabhi yeh share kharida bhi tha?
    const { data: portfolioData } = await supabase.from('portfolio').select('quantity').eq('user_id', req.user.userId).eq('symbol', symbol);

    // 3. Saari quantity add karke dekho total kitne shares hain uske paas
    let totalShares = 0;
    portfolioData.forEach(p => totalShares += Number(p.quantity));

    // 4. Agar wo 10 bechna chahta hai par kharide sirf 5 the, toh usko block kar do (Short Selling abhi allowed nahi hai).
    if (totalShares < quantity) {
        return res.status(400).json({ error: "Insufficient shares" });
    }

    // 5. Paisa Wapas! User ka balance nikalo, usme aaj ke beche hue shares ka paisa (totalRevenue) plus kar do.
    const { data: userData } = await supabase.from('users').select('balance').eq('id', req.user.userId).single();
    const newBalance = Number(userData.balance) + totalRevenue;
    await supabase.from('users').update({ balance: newBalance }).eq('id', req.user.userId);

    // 6. Portfolio se shares nikalo. (Hum delete karne ki jagah negative quantity ki entry pass karte hain taaki history bachi rahe).
    await supabase.from('portfolio').insert([{ user_id: req.user.userId, symbol: symbol, quantity: -quantity, average_price: price }]);

    res.status(200).json({ message: "Sold!", newBalance });
});
```

---

## 🎨 PHASE 12: Day 4 Frontend (Glassmorphism UI)

Frontend mein humne React (Next.js) ka use karke ek modern, dark-theme UI banaya.

### 1. `AuthForm.tsx` (The Login/Signup Screen)
Yeh ek single component hai jo Login aur Signup dono ka kaam karta hai. Isme "Glassmorphism" (sheeshe jaisa blur effect) use hua hai.

**Key Concepts Explained:**
* **`"use client";`**: Next.js mein jab humein button click (interactivity) ya state (`useState`) chahiye hoti hai, toh humein file ke top par yeh likhna zaroori hota hai taaki Next.js ise browser par run kare.
* **`useState` Hooks**: 
  - `isLogin`: Track karta hai ki user Login screen par hai ya Signup screen par.
  - `email`, `password`: User jo bhi type karta hai, usko in variables mein save karte hain.
  - `loading`: Jab API call chal rahi hoti hai, toh button par spinner (chakri) dikhane ke kaam aata hai.
* **`handleSubmit` Function**: 
  - Jab user "Submit" dabata hai, toh `e.preventDefault()` page ko refresh hone se rokta hai.
  - Uske baad ek `fetch` call hamare `localhost:5001` (Backend) par jaati hai Email aur Password le kar.
  - Agar Login success hua, toh Backend humein Token bhejta hai. Yeh Token hum `onLogin(data.token, data.balance)` ke zariye main App ko bhej dete hain.
* **Tailwind CSS Styling**: 
  - `backdrop-blur-xl`: Yeh pichhe ke background ko blur karta hai.
  - `bg-white/5`: Yeh white color ko sirf 5% opacity ke sath dikhata hai, jisse sheeshe jaisa transparent look aata hai.

### 2. `PortfolioPanel.tsx` (The Wallet & Order Book)
Yeh component tumhara balance dikhata hai aur usme "Buy" aur "Sell" ke buttons hote hain.
* **Logic:** Jab user "BUY" dabata hai, toh ek function `handleTrade("buy")` chalta hai. Yeh backend API `/api/buy` ko tumhara Smart Token aur Live Price bhejta hai. Agar backend se Success aata hai, toh `onTradeSuccess(data.newBalance)` trigger hota hai, jo main page par tumhara wallet balance update kar deta hai!
* **Icons:** Humne isme `lucide-react` library ke icons (Wallet, TrendingUp, TrendingDown) use kiye hain taaki UI boring na lage.

### 3. `TradingChart.tsx` (The Live Graph & WebSocket Engine)
Yeh sabse advanced frontend component hai jahan Live Market aur AI Signals chalte hain.
* **`createChart` (Lightweight Charts):** Yeh TradingView ki library hai. Humne ise `<div ref={chartContainerRef}>` par mount kiya hai. Isme humne dark mode ki settings daali.
* **`chart.addSeries(LineSeries)`:** Yeh version 5 ka naya syntax hai line banane ke liye.
* **`lineSeries.setData(...)`:** Jab chart load hota hai, toh hum usko 2 purane (dummy) data points dete hain aur `chart.timeScale().fitContent()` call karte hain. Isse chart ki X aur Y axes scale ho jati hain, warna chart "blank" dikhta hai!
* **The WebSocket Connection:**
  ```javascript
  const ws = new WebSocket("ws://localhost:5001");
  ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Naya dot graph par lagaya
      lineSeries.update({ time: currentTime, value: price });
      // Main page (page.tsx) ko saari information bhej di
      onMarketUpdate(price, signal, rsi);
  }
  ```
  Is code ka kaam hai lagatar backend ki baatein sunna, chart par blue line draw karna, aur baaki components (BotControl) ko signals batana!

### 4. `page.tsx` (The Main App Dashboard)
Yeh `page.tsx` hamare ghar ki chhat (Roof) ki tarah hai, jiske neeche saare kamre (components) base hain.
* Agar user ke paas Token nahi hai (`!token`), toh yeh `AuthForm` dikhata hai.
* Agar Token hai, toh yeh `TradingChart`, `BotControl`, aur `PortfolioPanel` teeno ko ek sath Grid Layout (`grid-cols-3`) mein dikhata hai.
* Yeh `state` maintain karta hai (Jaise `currentPrice`, `rsi`, `signal`). Jab `TradingChart` naya price deta hai, toh `page.tsx` usko catch karta hai aur `PortfolioPanel` ko de deta hai. Yahi wajah hai ki "BUY" button hamesha real-time price par kaam karta hai!

---

## 🤖 PHASE 13: Day 5 - The AI Algorithmic Trading Bot (Pivot)

Tumne ek sadharan Paper Trading app ko "Smart Algorithmic Bot" mein badal diya! Yahan humne ek Mathematical "Brain" banaya jo khud market ko analyse karke BUY/SELL ka suggestion (Signal) deta hai.

### 1. Database Upgrade (Stop Loss & Target)
Humne `portfolio` table mein naye column jode:
* `status`: Yeh batayega ki trade abhi chal rahi hai ('open') ya band ho chuki hai ('closed').
* `stop_loss` aur `take_profit`: Agar auto-bot use karte hain, toh in prices par aate hi bot khud trade cut kar dega.
* `pnl`: Live Profit and Loss track karne ke liye.

### 2. The AI Brain (Relative Strength Index - RSI Logic)
Humne `server.js` mein WebSocket ke andar ek Engine daala jo tukke (random guessing) par nahi, balki data par kaam karta hai.

**RSI (14 Period) Kaise Kaam Karta Hai?**
1. **`globalPriceHistory`:** Hum backend mein ek array banate hain jisme pichle 50 seconds ke prices lagatar record ho rahe hain.
2. **`calculateRSI()` Function:** Yeh pichle 14 prices ko check karta hai ki market kitni baar upar gaya (Gains) aur kitni baar neecha gira (Losses).
3. **The Trading Rules:**
   - Agar RSI **30 se neeche** gir jata hai: Iska matlab market oversold hai (zyada gir chuka hai) aur ab wapas bounce karega. Engine signal deta hai: **"STRONG BUY"**.
   - Agar RSI **70 se upar** jata hai: Iska matlab market overbought hai (hadd se zyada mehnga ho gaya hai) aur ab girega. Engine signal deta hai: **"STRONG SELL"**.

### 3. `BotControl.tsx` (The AI Dashboard)
* Yeh Frontend component hai jiska ek hi kaam hai: `page.tsx` se RSI number aur Signal text lena, aur usko screen par display karna.
* Isme humne Conditional Styling use ki hai:
  - `if (signal.includes("BUY")) { signalColor = "text-green-400"; }` -> Agar signal mein "BUY" word hai, toh font ka color Green kar do.
  - "SELL" ke liye Red kar do. Yeh UI ko interactive aur aasan banata hai.

---
**🏆 PRO-TIP FOR INTERVIEWS:** Agar interview mein pooche "Tumhara Bot kaise kaam karta hai?", toh bolna: *"Maine WebSocket par ek streaming data pipeline banayi hai. Server side par ek algorithmic engine RSI (Relative Strength Index) calculate karta hai aur har tick par ek JSON payload broadcast karta hai jisme Price, RSI score, aur Trading Signal hote hain. Frontend React un signals ko real-time mein consume karta hai bina DOM block kiye!"*

---

## 🐛 PHASE 14: Advanced React Debugging & Market Simulation (End of Day 5)

Aaj ke aakhiri hisse mein humne 3 aisi problems theek ki jo bade-bade developers ko pareshan karti hain. Yeh concepts tumhari React ki knowledge ko next level par le jayenge!

### 1. The Blank Chart Problem (`lightweight-charts`)
* **Problem:** Jab humne naya chart banaya, toh woh puri tarah se kaala (blank) aa raha tha, aur X/Y axis par koi numbers nahi the.
* **Reason:** Chart ko pata hi nahi tha ki use kis "Scale" (Range) se shuru karna hai. Agar pehla data point 22,000 hai, toh kya axis 0 se start hogi ya 20,000 se? Use guess nahi karna aata.
* **The Fix:** Humne usko initial (dummy) points diye taaki wo apni scale set kar sake:
  ```javascript
  lineSeries.setData([
    { time: Math.floor(Date.now() / 1000) - 2, value: 22000 },
    { time: Math.floor(Date.now() / 1000) - 1, value: 22000 }
  ]);
  chart.timeScale().fitContent(); // Isey kehte hain: "Bhai apna size data ke hisaab se set kar le"
  ```

### 2. The React "Infinite Loop" Bug (Sabse Badi Galti)
* **Problem:** Chart par blue line aage nahi badh rahi thi, wahi ki wahi ruki hui thi.
* **Reason:** `TradingChart` mein humne `useEffect` ke andar ek dependency daali thi `[onMarketUpdate]`. 
  - Har baar jab WebSocket se naya price aata, `TradingChart` usko main `page.tsx` ko bhejta.
  - Main page naya price dekh kar "Refresh" (Re-render) hota.
  - Main page refresh hota toh `onMarketUpdate` ek "Naya Function" ban jata.
  - `TradingChart` dekhta ki "Arre, dependency badal gayi!", toh wo WebSocket band karta aur **Pura Chart dobara banata!** Yeh 1 second mein baar-baar ho raha tha.
* **The 1-Character Fix:** Humne `[onMarketUpdate]` ko badal kar sirf `[]` (Empty Array) kar diya.
  ```javascript
  // Puraani galti:
  }, [onMarketUpdate]); 

  // Sahi tareeka:
  }, []); 
  ```
  `[]` ka matlab hai: "Bhai React, is code ko sirf aur sirf ek baar chalana jab page pehli baar load ho. Baad mein isko chhedna mat!" Isse chart tootna band ho gaya aur line perfectly chalne lagi.

### 3. The TypeScript Null Safety Error (`?`)
* **Problem:** `chartContainerRef.current.clientWidth` par ek laal line (error) aa rahi thi ki "Object is possibly null".
* **Reason:** TypeScript ek bohot strict teacher hai. Wo kehta hai, "Kya guarantee hai ki jab window resize hogi tab `chartContainer` screen par hoga hi hoga? Agar user ne page band kar diya toh system crash ho jayega!"
* **The Fix (Optional Chaining):** Humne `.` ke aage `?` laga diya.
  ```javascript
  width: chartContainerRef.current?.clientWidth || 0
  ```
  Is `?` ka matlab hai: "Agar container exist karta hai, tabhi `clientWidth` check karo. Agar nahi karta (null hai), toh chup-chaap error ignore karke `0` le lo." Isey **Optional Chaining** kehte hain.

### 4. The Hollywood Market Simulation (Server.js Script)
Demo dikhane ke liye humne `server.js` mein randomness hata kar ek "Scripted Movie" banayi:
* **`scenarioStep` Variable:** Humne ek counter banaya jo har second badhta hai.
* **Phase 1 (Crash):** Pehle 10 second `currentPrice -= 40`. Yani market tezi se girta hai. Isse RSI 30 ke niche chala jata hai aur "STRONG BUY" signal aata hai.
* **Phase 2 (Hold):** 5 second tak price rukta hai taaki tum "BUY" button daba sako.
* **Phase 3 (Bull Run):** Agle 20 second `currentPrice += 60`. Market rocket ban jata hai, aur tumhara profit hazaron mein pohch jata hai!
* **Phase 4 (Take Profit):** Upar ja kar RSI 70 cross karta hai, aur "STRONG SELL" signal aata hai.

*Yeh trick Startups apne investors ko product ka demo dikhane ke liye use karte hain!* 🎬
