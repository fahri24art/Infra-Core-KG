const sqlite3 = require('sqlite3').verbose(); 
const path = require('path');
const dbPath = path.join(__dirname, '../../check_apar/database/database.sqlite');
console.log("DB Path:", dbPath);
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY); 
db.serialize(() => { 
    db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, rows) => { 
        if (err) console.error(err); else console.log(rows); 
        db.close(); 
    }); 
});
