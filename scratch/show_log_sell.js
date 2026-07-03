const fs = require('fs');
const path = 'C:/Users/shivm/.gemini/antigravity/brain/27dfa054-71eb-4eda-a8db-3eabbbabb576/.system_generated/tasks/task-6326.log';
const code = fs.readFileSync(path, 'utf8');

const lines = code.split('\n');
console.log("=== Log Lines 5040 to 5160 ===");
for (let i = 5040; i <= Math.min(lines.length, 5160); i++) {
    console.log(`${i}: ${lines[i - 1].trim()}`);
}
