const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../goalpulse.db');
const db = new Database(dbPath, { fileMustExist: true });
db.pragma('journal_mode = WAL');

module.exports = db;
