const fs = require('fs');
const path = require('path');
const serverJs = require('../backend/server.js'); // Wait, loading server.js will start it if it runs immediately.
// Let's just look at how it maps the token directly by parsing OpenAPIScripMaster.json ourselves!

const masterPath = path.join(__dirname, '../backend/OpenAPIScripMaster.json');

function run() {
    if (!fs.existsSync(masterPath)) {
        console.error("OpenAPIScripMaster.json not found");
        return;
    }
    console.log("Loading scrip master...");
    const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    console.log(`Loaded ${master.length} scrips.`);
    
    // Find scrips for NIFTY 30 JUN 26 23950 PE
    // Expiry formats in OpenAPIScripMaster are usually like "30JUN26" or "30JUN2026"
    // Let's filter by symbol/name
    const matches = master.filter(s => s.symbol && s.symbol.includes('23950') && s.symbol.includes('PE') && s.symbol.includes('NIFTY'));
    console.log("Matching scrips in master:");
    console.log(JSON.stringify(matches, null, 2));
}

run();
