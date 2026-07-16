const fs = require('fs');
const scripMasterPath = 'c:/SecureTrade/backend/OpenAPIScripMaster.json';

function main() {
    if (fs.existsSync(scripMasterPath)) {
        const scrips = JSON.parse(fs.readFileSync(scripMasterPath, 'utf8'));
        const niftyExp = new Set();
        const sensexExp = new Set();
        
        scrips.forEach(s => {
            if (s.instrumenttype === 'OPTIDX') {
                if (s.name === 'NIFTY') {
                    niftyExp.add(s.expiry);
                } else if (s.name === 'SENSEX') {
                    sensexExp.add(s.expiry);
                }
            }
        });
        
        console.log("NIFTY Expiries in Master:", Array.from(niftyExp).sort());
        console.log("SENSEX Expiries in Master:", Array.from(sensexExp).sort());
    } else {
        console.log("Master scrip file not found.");
    }
}
main();
