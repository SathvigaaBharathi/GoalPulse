const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../goalpulse.db');

// Self-healing database initialization: If goalpulse.db is missing (e.g. on new ephemeral containers), auto-seed it on boot!
if (!fs.existsSync(dbPath)) {
  console.log('[Database] goalpulse.db not found. Automatically seeding demo data before starting...');
  try {
    // Dynamically run the seeding script
    require('./init');
    console.log('[Database] Auto-seeding completed successfully!');
  } catch (err) {
    console.error('[Database] Failed to auto-seed database:', err.message);
  }
}

const db = new Database(dbPath, { fileMustExist: true });
db.pragma('journal_mode = WAL');

module.exports = db;
