# 🎯 Aptitude Day 1: Number Series & Percentages (Quant)

Bhai, placements aur high-package (35 LPA) exams/interviews me quantitative aptitude basic criteria hota hai filtering ke liye. Hum ekdam short-tricks aur standard patterns se shuru kar rahe hain.

---

## 📌 PART 1: Number Series (Tricks & Patterns)

Number Series me missing ya wrong number dhoondhna hota hai. Iske major patterns ye hain:

### 1. Common Patterns Table:
| Pattern Type | Example Series | Logic / Explanation |
| :--- | :--- | :--- |
| **Arithmetic (Difference)** | 3, 7, 11, 15, 19, ... | Constant difference (+4) |
| **Geometric (Multiplication)** | 2, 6, 18, 54, ... | Constant multiplier (*3) |
| **Square / Cube Series** | 1, 4, 9, 16, 25, ... | $n^2$ series ($1^2, 2^2, 3^2...$) |
| **Square / Cube $+/-$ Constant** | 2, 5, 10, 17, 26, ... | $n^2 + 1$ series |
| **Prime Numbers** | 2, 3, 5, 7, 11, 13, ... | Only prime numbers |
| **Alternate Series** | 3, 10, 5, 12, 7, 14, ... | Alternating $+7$ and $-5$ loops |

### 💡 Short-Trick: "The Difference Method"
Agar series slow increment ho rahi hai, toh **difference** nikalo. Agar series bahut fast badh rahi hai, toh **multiplication** check karo. Agar zigzag hai, toh **alternate elements** check karo.

---

## 📌 PART 2: Percentages (Formulae & Speed Tricks)

Percentage ka matlab hota hai "per 100". Speed maths ke liye ye table yaad hona chahiye:

### 1. Fraction to Percentage Cheat-Sheet:
* $\frac{1}{2} = 50\%$
* $\frac{1}{3} = 33.33\%$
* $\frac{1}{4} = 25\%$
* $\frac{1}{5} = 20\%$
* $\frac{1}{6} = 16.66\%$
* $\frac{1}{8} = 12.5\%$
* $\frac{1}{10} = 10\%$
* $\frac{1}{12} = 8.33\%$

### 2. Successive Percentage Change Formula:
Agar kisi quantity ko pehle $A\%$ badhaya jaye aur fir $B\%$ badhaya/ghataya jaye, toh total percentage change:
$$\text{Net Change} = A + B + \frac{A \times B}{100}$$
*(Agar value ghati hai, toh minus sign use karein, e.g., $B = -10\%$)*

---

## 📝 Today's Practice Questions (Solve & Verify)

### Q1. Complete the series: $4, 9, 20, 43, 90, ?$
* **A)** 180
* **B)** 185
* **C)** 187
* **D)** 192
* **Solution**:
  Logic: $(Prev \times 2) + c$ jahan constant scale ho raha hai:
  - $4 \times 2 + 1 = 9$
  - $9 \times 2 + 2 = 20$
  - $20 \times 2 + 3 = 43$
  - $43 \times 2 + 4 = 90$
  - Next term: $90 \times 2 + 5 = 185$
  * **Correct Answer: B**

### Q2. Find the missing number: $10, 14, 23, 39, 64, ?$
* **A)** 100
* **B)** 105
* **C)** 90
* **D)** 112
* **Solution**:
  Chalo difference check karte hain:
  - $14 - 10 = 4 = 2^2$
  - $23 - 14 = 9 = 3^2$
  - $39 - 23 = 16 = 4^2$
  - $64 - 39 = 25 = 5^2$
  - Next difference should be $6^2 = 36$
  - Next term: $64 + 36 = 100$
  * **Correct Answer: A**

### Q3. Find the wrong number in the series: $3, 5, 8, 13, 20, 33, 53$
* **A)** 13
* **B)** 20
* **C)** 33
* **D)** 8
* **Solution**:
  Fibonacci series logic check karo: $3 + 5 = 8$, $5 + 8 = 13$, $8 + 13 = 21$ (par series me 20 hai).
  Verify checking next: $13 + 21 = 34$ (no, wait).
  Let's look at differences:
  - $5 - 3 = 2$
  - $8 - 5 = 3$
  - $13 - 8 = 5$
  - $20 - 13 = 7$ (Prime differences: 2, 3, 5, 7)
  - Next difference should be 11 (next prime after 7).
  - So, $20 + 11 = 31$ (But series has 33).
  - If we use 31: $31 + 13$ (next prime is 13) $= 44$ (but we have 53).
  Let's re-verify Fibonacci:
  If $3+5=8$, $5+8=13$, $8+13=21$, $13+21=34$ (but we have 33), $21+34=55$ (but we have 53).
  Wait, what if the series is prime difference?
  Wait! Let's check difference of differences:
  - $3 \to 5 \to 8 \to 13 \to 21 \to 34 \to 55$ is standard Fibonacci.
  - If 20 is wrong and should be 21: $3, 5, 8, 13, 21, 34, 55$ works, but the series ends in 33, 53.
  Wait, look at this:
  - $3+5 = 8$
  - $8+5 = 13$
  - $13+8 = 21$ (If 20 was 21)
  - $20 - 13 = 7$
  Let's check alternative prime differences:
  Differences: $+2, +3, +5, +7, +13, +20$...
  Wait! Look at this sequence:
  - $3 + 2 = 5$
  - $5 + 3 = 8$
  - $8 + 5 = 13$
  - $13 + 8 = 21$ (so 20 is wrong!)
  - If $20$ becomes $21$, then $21 + 12 = 33$? No, Fibonacci is $13 + 21 = 34$.
  Wait! Let's check the difference:
  - $+2, +3, +5, +7, +13, +20$.
  - Wait: $2, 3, 5, 7, 13, 20$? No!
  - If the series is: $3, 5, 8, 13, 20, 33, 53$.
  - Let's check differences:
    - $5 - 3 = 2$
    - $8 - 5 = 3$
    - $13 - 8 = 5$
    - $20 - 13 = 7$
    - $33 - 20 = 13$
    - $53 - 33 = 20$
  - The differences are: $2, 3, 5, 7, 13, 20$.
  - Notice that $2, 3, 5, 7, 13, 20$.
  - If the sequence is prime differences $+2, +3, +5, +7, +11, +13...$
  - Then $13+7=20$, $20+11=31$ (instead of 33).
  - Fibonacci is $8+13=21$ (instead of 20). So 20 is wrong in either case.
  * **Correct Answer: B (20 is wrong)**

### Q4. If A's salary is $25\%$ more than B's salary, then by what percentage is B's salary less than A's salary?
* **A)** $20\%$
* **B)** $25\%$
* **C)** $16.67\%$
* **D)** $30\%$
* **Solution**:
  **Short-trick Formula**:
  $$\text{Less \%} = \left(\frac{R}{100 + R}\right) \times 100$$
  Jahan $R = 25$ (increase rate).
  - $\text{Less \%} = \left(\frac{25}{125}\right) \times 100 = \frac{1}{5} \times 100 = 20\%$
  * **Correct Answer: A**

### Q5. Due to a $20\%$ reduction in the price of sugar, a man can buy 5 kg more sugar for ₹600. Find the original price of sugar per kg.
* **A)** ₹24/kg
* **B)** ₹30/kg
* **C)** ₹36/kg
* **D)** ₹40/kg
* **Solution**:
  **Short-trick**:
  Price reduction $= 20\%$ of ₹$600 = \frac{20}{100} \times 600 =$ ₹$120$.
  Is ₹120 me man 5 kg extra sugar kharid sakta hai.
  - Reduced Price per kg $= \frac{120}{5} =$ ₹$24/\text{kg}$.
  - original price $X$ check karo: $20\%$ reduce hone ke baad ₹24 hai.
  - $80\%$ of Original Price $= 24$
  - Original Price $= 24 \times \frac{100}{80} = 24 \times \frac{5}{4} =$ ₹$30/\text{kg}$.
  * **Correct Answer: B**

### Q6. A's salary increases by $10\%$ in the first year and decreases by $10\%$ in the second year. What is the net percentage change in his salary after 2 years?
* **A)** $0\%$ (No change)
* **B)** $1\%$ increase
* **C)** $1\%$ decrease
* **D)** $2\%$ decrease
* **Solution**:
  Use Successive Change formula: $A = +10$, $B = -10$:
  - $\text{Net Change} = 10 - 10 + \frac{10 \times (-10)}{100} = 0 - \frac{100}{100} = -1\%$
  - Minus sign ka matlab **1% decrease**.
  * **Correct Answer: C**

### Q7. The population of a town increases by $10\%$ annually. If the current population is 20,000, what will be its population after 2 years?
* **A)** 24,000
* **B)** 24,200
* **C)** 22,000
* **D)** 25,000
* **Solution**:
  Successive increase formula (compound interest type):
  - Year 1: $20,000 + 10\% = 22,000$
  - Year 2: $22,000 + 10\% = 24,200$
  * **Correct Answer: B**

### Q8. 40% of a number is 80 more than 30% of the same number. Find the number.
* **A)** 800
* **B)** 600
* **C)** 400
* **D)** 1000
* **Solution**:
  Let the number be $X$.
  - $40\% \text{ of } X - 30\% \text{ of } X = 80$
  - $10\% \text{ of } X = 80$
  - $X = 80 \times 10 = 800$
  * **Correct Answer: A**
