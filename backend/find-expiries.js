const fs = require('fs');

console.log("Loading scrip master...");
const scrips = JSON.parse(fs.readFileSync('OpenAPIScripMaster.json', 'utf8'));

const expiries = {
    NIFTY: new Set(),
    BANKNIFTY: new Set(),
    SENSEX: new Set()
};

scrips.forEach(s => {
    if (s.instrumenttype === 'OPTIDX') {
        if (s.name === 'NIFTY') expiries.NIFTY.add(s.expiry);
        if (s.name === 'BANKNIFTY') expiries.BANKNIFTY.add(s.expiry);
        if (s.name === 'SENSEX') expiries.SENSEX.add(s.expiry);
    }
});

console.log("\n--- Unique Expiry Dates in Scrip Master ---");
console.log("NIFTY Expiries (sorted):", Array.from(expiries.NIFTY).sort());
console.log("BANKNIFTY Expiries (sorted):", Array.from(expiries.BANKNIFTY).sort());
console.log("SENSEX Expiries (sorted):", Array.from(expiries.SENSEX).sort());
