const Database = require('better-sqlite3');
const db = new Database('d:/GoalPulse/backend/goalpulse.db');

console.log("=== CYCLES ===");
console.log(db.prepare('SELECT * FROM cycles').all());

console.log("\n=== GOAL SHEETS ===");
console.log(db.prepare('SELECT * FROM goal_sheets').all());

console.log("\n=== GOALS ===");
console.log(db.prepare('SELECT id, sheet_id, title, status FROM goals LEFT JOIN achievements on goals.id = achievements.goal_id').all());

console.log("\n=== ACHIEVEMENTS ===");
console.log(db.prepare('SELECT * FROM achievements').all());

console.log("\n=== CHECKIN COMMENTS ===");
console.log(db.prepare('SELECT * FROM checkin_comments').all());

console.log("\n=== AUDIT LOG ===");
console.log(db.prepare('SELECT * FROM audit_log').all());

db.close();
