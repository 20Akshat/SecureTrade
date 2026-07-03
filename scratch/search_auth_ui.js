const fs = require('fs');
const path = require('path');

function search(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            search(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('Signup') || content.includes('signup') || content.includes('login') || content.includes('Login')) {
                console.log(`Found: ${fullPath}`);
            }
        }
    }
}

search(path.join(__dirname, '../frontend/src'));
