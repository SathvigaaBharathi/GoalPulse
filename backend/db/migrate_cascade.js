const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../goalpulse.db');
const db = new Database(dbPath);

console.log('Running database migration for cascade view...');

try {
  // Check if column exists
  const tableInfo = db.pragma("table_info(goals)");
  const hasColumn = tableInfo.some(col => col.name === 'parent_goal_id');
  
  if (!hasColumn) {
    db.prepare('ALTER TABLE goals ADD COLUMN parent_goal_id INTEGER REFERENCES goals(id)').run();
    console.log('Successfully added parent_goal_id column to goals table.');
  } else {
    console.log('Column parent_goal_id already exists in goals table.');
  }
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
