const fs = require('fs');
const path = require('path');

const logPath = 'C:/Users/shivm/.gemini/antigravity/brain/27dfa054-71eb-4eda-a8db-3eabbbabb576/.system_generated/tasks/task-7605.log';
if (fs.existsSync(logPath)) {
    const log = fs.readFileSync(logPath, 'utf8');
    const lines = log.split('\n');
    console.log("Searching for triggers/alerts in today's server logs...");
    lines.forEach((line, idx) => {
        if (line.includes('Alert') || line.includes('Trigger') || line.includes('Signal')) {
            console.log(`Line ${idx + 1}: ${line}`);
        }
    });
} else {
    console.log("Log file not found");
}
