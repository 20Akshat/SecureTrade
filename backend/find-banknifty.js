const fs = require('fs');

console.log("Loading scrip master...");
const scrips = JSON.parse(fs.readFileSync('OpenAPIScripMaster.json', 'utf8'));

const types = new Set();
const expiries = new Set();
let count = 0;

scrips.forEach(s => {
    if (s.name === 'BANKNIFTY') {
        types.add(s.instrumenttype);
        if (s.instrumenttype === 'OPTIDX') {
            expiries.add(s.expiry);
        }
        count++;
    }
});

console.log(`Found ${count} total BANKNIFTY contracts.`);
console.log("Instrument Types:", Array.from(types));
console.log("OPTIDX Expiries:", Array.from(expiries).sort());
