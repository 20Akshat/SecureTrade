const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../backend/local_db.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Delete the specific glitched portfolio records (transactions)
const initialCount = data.portfolio.length;
data.portfolio = data.portfolio.filter(p => 
  p.id !== "0cdf2d50-6fa1-4bca-a3eb-595ddb21138f" && 
  p.id !== "0892b969-0fb2-4c36-a299-a2fe69bb910e"
);
const deletedCount = initialCount - data.portfolio.length;

// Find user in users object and restore balance and daily profit accumulator
const userId = "9ae19ceb-bf80-4719-b797-09b4f9751078";
const user = data.users[userId];
if (user) {
  const oldBalance = user.balance;
  user.balance += 7750; // Restore balance
  user.daily_profit_accumulated += 7750; // Restore daily profit
  console.log(`User balance restored: ₹${oldBalance} -> ₹${user.balance}`);
  console.log(`User daily profit accumulated restored: ₹${user.daily_profit_accumulated}`);
} else {
  console.log("User not found!");
}

fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
console.log(`Successfully deleted ${deletedCount} glitched trade records and updated user data.`);
