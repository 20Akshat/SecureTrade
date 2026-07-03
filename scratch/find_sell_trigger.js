const fs = require('fs');
const path = 'C:/Users/shivm/.gemini/antigravity/brain/27dfa054-71eb-4eda-a8db-3eabbbabb576/.system_generated/tasks/task-6566.log';

if (!fs.existsSync(path)) {
    console.error("Log file not found");
    return;
}
const code = fs.readFileSync(path, 'utf8');
const lines = code.split('\n');

console.log("=== Logs around line 408 ===");
for (let i = Math.max(1, 408 - 100); i <= Math.min(lines.length, 408 + 50); i++) {
    console.log(`${i}: ${lines[i - 1].trim()}`);
}
