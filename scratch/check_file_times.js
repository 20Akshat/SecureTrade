const fs = require('fs');
const path = require('path');

const filesToCheck = [
    'c:/SecureTrade/backend/last_prices.json',
    'c:/SecureTrade/backend/local_db.json',
    'c:/SecureTrade/backend/option_quotes_cache.json'
];

console.log("⏱️ CHECKING BACKEND FILE MODIFICATION TIMESTAMPS:\n");
filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        console.log(`📄 File: ${path.basename(file)}`);
        console.log(`   └─ Last Modified: ${stats.mtime.toLocaleString("en-IN")}`);
        console.log(`   └─ Size: ${stats.size} bytes`);
    } else {
        console.log(`❌ File not found: ${path.basename(file)}`);
    }
});
