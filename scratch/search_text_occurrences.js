const fs = require('fs');
const path = require('path');

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') {
                searchDir(fullPath);
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.js')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes('Support Request Submitted')) {
                    console.log(`Found in: ${fullPath}`);
                    const lines = content.split('\n');
                    lines.forEach((line, idx) => {
                        if (line.includes('Support Request Submitted')) {
                            console.log(`  Line ${idx + 1}: ${line.trim()}`);
                        }
                    });
                }
            }
        }
    });
}

searchDir(path.join(__dirname, '../frontend'));
