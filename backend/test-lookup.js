const fs = require('fs');

console.log("Loading scrip master...");
const scrips = JSON.parse(fs.readFileSync('OpenAPIScripMaster.json', 'utf8'));

const scripMap = {};
scrips.forEach(s => {
    if (s.instrumenttype === 'OPTIDX' && (s.name === 'NIFTY' || s.name === 'BANKNIFTY' || s.name === 'SENSEX')) {
        const strikeVal = Math.round(parseFloat(s.strike) / 100);
        const optionType = s.symbol.endsWith('CE') ? 'CE' : 'PE';
        const key = `${s.name}_${s.expiry}_${strikeVal}_${optionType}`;
        scripMap[key] = {
            token: s.token,
            symbol: s.symbol,
            exch_seg: s.exch_seg,
            lotsize: Number(s.lotsize)
        };
    }
});

console.log("\n--- Checking NIFTY Expiry June 16, 2026 ---");
console.log("23900 CE:", scripMap["NIFTY_16JUN2026_23900_CE"]);
console.log("23900 PE:", scripMap["NIFTY_16JUN2026_23900_PE"]);
console.log("23800 CE:", scripMap["NIFTY_16JUN2026_23800_CE"]);
console.log("24000 PE:", scripMap["NIFTY_16JUN2026_24000_PE"]);

console.log("\nTotal keys in scripMap:", Object.keys(scripMap).length);
// Print 5 sample keys for NIFTY 16JUN2026
const sampleKeys = Object.keys(scripMap).filter(k => k.startsWith("NIFTY_16JUN2026"));
console.log("Sample 16JUN2026 NIFTY keys:", sampleKeys.slice(0, 5));
