const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../frontend/src');
function search(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            search(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.toUpperCase().includes('EQUITY HOLDINGS') || content.toUpperCase().includes('HOLDINGS')) {
                console.log(`Found in: ${fullPath}`);
                content.split('\n').forEach((line, idx) => {
                    if (line.toUpperCase().includes('EQUITY HOLDINGS') || line.toUpperCase().includes('HOLDINGS')) {
                        console.log(`  Line ${idx+1}: ${line.trim()}`);
                    }
                });
            }
        }
    });
}
search(srcDir);
