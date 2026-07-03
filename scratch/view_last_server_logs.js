const fs = require('fs');
const path = require('path');

const logPath = 'C:/Users/shivm/.gemini/antigravity/brain/27dfa054-71eb-4eda-a8db-3eabbbabb576/.system_generated/tasks/task-7525.log';
if (fs.existsSync(logPath)) {
    const log = fs.readFileSync(logPath, 'utf8');
    const lines = log.split('\n');
    console.log("Last 50 lines of server log:");
    console.log(lines.slice(Math.max(0, lines.length - 50)).join('\n'));
} else {
    console.log("Log file not found");
}
