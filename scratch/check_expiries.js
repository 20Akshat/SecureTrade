const fs = require('fs');
const path = require('path');

const scripMasterPath = 'c:/SecureTrade/backend/OpenAPIScripMaster.json';

function checkNiftyExpiries() {
    if (!fs.existsSync(scripMasterPath)) {
        console.error("❌ Scrip master not found.");
        return;
    }
    console.log("⏳ Reading scrip master...");
    const scrips = JSON.parse(fs.readFileSync(scripMasterPath, 'utf8'));
    
    console.log("🔍 Finding expiries for NIFTY options...");
    const niftyExpiries = new Set();
    const bankniftyExpiries = new Set();
    const sensexExpiries = new Set();
    
    scrips.forEach(s => {
        if (s.instrumenttype === 'OPTIDX') {
            if (s.name === 'NIFTY') niftyExpiries.add(s.expiry);
            if (s.name === 'BANKNIFTY') bankniftyExpiries.add(s.expiry);
            if (s.name === 'SENSEX') sensexExpiries.add(s.expiry);
        }
    });

    console.log("\n📅 NIFTY Expiries in Scrip Master:");
    console.log(Array.from(niftyExpiries).sort());
    
    console.log("\n📅 BANKNIFTY Expiries in Scrip Master:");
    console.log(Array.from(bankniftyExpiries).sort());
    
    console.log("\n📅 SENSEX Expiries in Scrip Master:");
    console.log(Array.from(sensexExpiries).sort());
}

checkNiftyExpiries();
