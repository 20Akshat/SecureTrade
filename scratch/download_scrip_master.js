const https = require('https');
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../backend/OpenAPIScripMaster.json');

function downloadScripMaster() {
    console.log("📡 Connecting to Angel One Scrip Master Server...");
    const file = fs.createWriteStream(targetPath);
    
    https.get('https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json', (response) => {
        if (response.statusCode !== 200) {
            console.error(`❌ HTTP Error: ${response.statusCode}`);
            process.exit(1);
        }
        
        console.log("⏳ Downloading latest scrip master (approx. 34MB)...");
        response.pipe(file);
        
        file.on('finish', () => {
            file.close();
            console.log(`\n🎉 SUCCESS! Latest scrip master saved to: ${targetPath}`);
            const stats = fs.statSync(targetPath);
            console.log(`📊 File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
            process.exit(0);
        });
    }).on('error', (err) => {
        fs.unlink(targetPath, () => {});
        console.error("❌ Connection/Download Error:", err.message);
        process.exit(1);
    });
}

downloadScripMaster();
