const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'goalpulse.db');
const db = new Database(dbPath);

console.log('Clearing mock data...');
db.prepare('DELETE FROM escalation_log').run();
db.prepare('DELETE FROM checkin_comments').run();
db.prepare('DELETE FROM achievements').run();
db.prepare('DELETE FROM goals').run();
db.prepare('DELETE FROM goal_sheets').run();
db.prepare('DELETE FROM audit_log').run();

console.log('Mock data cleared successfully!');
db.close();
