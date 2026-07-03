const fs = require('fs');

console.log("Loading scrip master...");
const scrips = JSON.parse(fs.readFileSync('OpenAPIScripMaster.json', 'utf8'));

console.log("Building index map...");
const scripMap = {};
let count = 0;
scrips.forEach(s => {
    if (s.instrumenttype === 'OPTIDX' && (s.name === 'NIFTY' || s.name === 'BANKNIFTY' || s.name === 'SENSEX')) {
        const strikeVal = Math.round(parseFloat(s.strike) / 100);
        const optionType = s.symbol.endsWith('CE') ? 'CE' : 'PE';
        const key = `${s.name}_${s.expiry}_${strikeVal}_${optionType}`;
        scripMap[key] = {
            token: s.token,
            symbol: s.symbol,
            exch_seg: s.exch_seg,
            lotsize: s.lotsize
        };
        count++;
    }
});

console.log(`Indexed ${count} option contracts.`);

// Let's test a lookup
console.log("Lookup NIFTY_09JUN2026_24500_PE:", scripMap["NIFTY_09JUN2026_24500_PE"]);
console.log("Lookup BANKNIFTY_29SEP2026_45000_CE:", scripMap["BANKNIFTY_29SEP2026_45000_CE"]);
console.log("Lookup SENSEX_25JUN2026_66500_CE:", scripMap["SENSEX_25JUN2026_66500_CE"]);
console.log("Lookup SENSEX_04JUN2026_79900_PE:", scripMap["SENSEX_04JUN2026_79900_PE"]);
