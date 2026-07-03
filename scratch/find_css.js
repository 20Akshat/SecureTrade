const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../frontend/src');
function search(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            search(fullPath);
        } else if (file.endsWith('.css')) {
            console.log(`Found CSS file: ${fullPath}`);
        }
    });
}
search(srcDir);
