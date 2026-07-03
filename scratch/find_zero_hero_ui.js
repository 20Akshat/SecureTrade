const fs = require('fs');
const path = require('path');

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            searchDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('isZeroHeroActive') || content.includes('ZeroHero')) {
                // Find all line numbers
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (line.includes('isZeroHeroActive') || line.includes('ZeroHero')) {
                        console.log(`${fullPath}:${idx+1} -> ${line.trim()}`);
                    }
                });
            }
        }
    });
}

searchDir('c:/SecureTrade/frontend/src');
