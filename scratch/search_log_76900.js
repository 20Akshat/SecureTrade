const fs = require('fs');
const path = require('path');

const logPath = 'C:/Users/shivm/.gemini/antigravity/brain/27dfa054-71eb-4eda-a8db-3eabbbabb576/.system_generated/tasks/task-7395.log';
if (fs.existsSync(logPath)) {
    const log = fs.readFileSync(logPath, 'utf8');
    const lines = log.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('76900') || line.includes('sell') || line.includes('SELL')) {
            console.log(`Line ${idx + 1}: ${line}`);
        }
    });
} else {
    console.log("Log file not found");
}
