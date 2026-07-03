const fs = require('fs');
const path = 'C:/Users/shivm/.gemini/antigravity/brain/27dfa054-71eb-4eda-a8db-3eabbbabb576/.system_generated/tasks/task-6566.log';

if (!fs.existsSync(path)) {
    console.error("Log file not found at", path);
    return;
}
const code = fs.readFileSync(path, 'utf8');
const lines = code.split('\n');
console.log(`Total lines: ${lines.length}`);
const lastLines = lines.slice(Math.max(0, lines.length - 200));
console.log("=== Last 200 lines ===");
lastLines.forEach((line, idx) => {
    console.log(`${lines.length - 200 + idx + 1}: ${line.trim()}`);
});
