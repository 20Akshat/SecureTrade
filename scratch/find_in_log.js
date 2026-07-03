const fs = require('fs');
const path = 'C:/Users/shivm/.gemini/antigravity/brain/27dfa054-71eb-4eda-a8db-3eabbbabb576/.system_generated/tasks/task-6326.log';
const code = fs.readFileSync(path, 'utf8');

const lines = code.split('\n');
console.log("=== Matching Lines between 4920 and 5060 ===");
for (let i = 4920; i <= Math.min(lines.length, 5080); i++) {
    const line = lines[i - 1];
    if (line.includes('23900 PE') || line.includes('API') || line.includes('Target') || line.includes('Stop-Loss') || line.includes('Exit') || line.includes('Sync') || line.includes('closed externally') || line.includes('Option') || line.includes('option')) {
        console.log(`${i}: ${line.trim()}`);
    }
}
