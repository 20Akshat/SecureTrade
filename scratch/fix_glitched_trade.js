const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../backend/local_db.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Delete the specific glitched trade records
const initialTradeCount = data.trades.length;
data.trades = data.trades.filter(t => 
  t.id !== "0cdf2d50-6fa1-4bca-a3eb-595ddb21138f" && 
  t.id !== "0892b969-0fb2-4c36-a299-a2fe69bb910e"
);
const deletedCount = initialTradeCount - data.trades.length;

// Find user in users array and restore balance
const userId = "9ae19ceb-bf80-4719-b797-09b4f9751078";
const user = data.users.find(u => u.id === userId);
if (user) {
  const oldBalance = user.balance;
  user.balance += 7750; // Restore the fake loss of ₹7,750
  console.log(`User balance restored: ₹${oldBalance} -> ₹${user.balance}`);
} else {
  console.log("User not found!");
}

// Remove from portfolio if still stuck there
data.portfolio = data.portfolio.filter(p => p.symbol !== "SENSEX 09 JUL 26 78000 CE");

fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
console.log(`Successfully deleted ${deletedCount} glitched trade records and cleared portfolio cache.`);
