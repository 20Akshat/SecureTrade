const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../frontend/src');

function searchDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('syncPositionWithDb')) {
                console.log(`Match in ${fullPath}`);
                content.split('\n').forEach((line, idx) => {
                    if (line.includes('syncPositionWithDb')) {
                        console.log(`  Line ${idx+1}: ${line.trim()}`);
                    }
                });
            }
        }
    });
}

searchDir(srcDir);
