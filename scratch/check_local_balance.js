const fs = require('fs');
const path = require('path');

const localDbPath = path.join(__dirname, '../backend/local_db.json');
if (fs.existsSync(localDbPath)) {
    const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    console.log("Local DB User balance:", localDb.users['9ae19ceb-bf80-4719-b797-09b4f9751078'].balance);
} else {
    console.log("Local DB file not found");
}
