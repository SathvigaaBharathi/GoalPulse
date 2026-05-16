const Database = require('better-sqlite3');
const db = new Database('d:/GoalPulse/backend/goalpulse.db');

const cycleId = "1"; // string from req.query

const sheets1 = db.prepare('SELECT id FROM goal_sheets WHERE cycle_id = ? AND status = "approved"').all(cycleId);
console.log("With string '1':", sheets1);

const sheets2 = db.prepare('SELECT id FROM goal_sheets WHERE cycle_id = ? AND status = "approved"').all(parseInt(cycleId));
console.log("With number 1:", sheets2);

console.log("Goal sheets for cycle_id = 1:", db.prepare('SELECT * FROM goal_sheets WHERE cycle_id = 1').all());

db.close();
