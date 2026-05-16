const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../goalpulse.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Remove existing db for clean init
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

console.log('Initializing database schema...');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

console.log('Seeding database...');
const hashPwd = (pwd) => bcrypt.hashSync(pwd, 10);
const pwdHash = hashPwd('Demo@123');

// 1. Users
const insertUser = db.prepare('INSERT INTO users (id, name, email, password, role, manager_id, department) VALUES (?, ?, ?, ?, ?, ?, ?)');
insertUser.run(1, 'Admin User', 'admin@goalpulse.demo', pwdHash, 'admin', null, 'HR');
insertUser.run(2, 'Manager User', 'manager@goalpulse.demo', pwdHash, 'manager', null, 'Engineering');
insertUser.run(3, 'Employee One', 'employee@goalpulse.demo', pwdHash, 'employee', 2, 'Engineering');
insertUser.run(4, 'Employee Two', 'employee2@goalpulse.demo', pwdHash, 'employee', 2, 'Engineering');
insertUser.run(5, 'Employee Three', 'employee3@goalpulse.demo', pwdHash, 'employee', 2, 'Engineering');

// 2. Cycles — Phase 1 (Goal Setting) is open now (May 2026), Q1 check-in opens July 2026
const insertCycle = db.prepare(`INSERT INTO cycles (id, name, year, phase1_open, phase1_close, q1_open, q1_close, q2_open, q2_close, q3_open, q3_close, q4_open, q4_close, is_active) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
insertCycle.run(1, 'FY 2026-27', '2026', '2026-05-01', '2026-06-30', '2026-07-01', '2026-09-30', '2026-10-01', '2026-12-31', '2027-01-01', '2027-03-31', '2027-04-01', '2027-04-30', 1);

// 3. Thrust Areas
const insertThrust = db.prepare('INSERT INTO thrust_areas (id, name, description) VALUES (?, ?, ?)');
insertThrust.run(1, 'Revenue Growth', 'Increase overall revenue');
insertThrust.run(2, 'Cost Reduction', 'Reduce operational costs');
insertThrust.run(3, 'Customer Experience', 'Improve customer satisfaction');
insertThrust.run(4, 'People & Culture', 'Employee engagement and retention');
insertThrust.run(5, 'Operational Excellence', 'Improve internal processes');
insertThrust.run(6, 'Compliance & Risk', 'Ensure regulatory compliance');

// 4. Goal Sheets (Empty for testing)
// 5. Goals (Empty)
// 6. Achievements (Empty)
// 7. Checkin Comments (Empty)
// 8. Audit Log (Empty)

// 9. Escalation Rules
const insertEscRule = db.prepare('INSERT INTO escalation_rules (id, rule_type, threshold_days, created_by) VALUES (?, ?, ?, ?)');
insertEscRule.run(1, 'goal_not_submitted', 7, 1);
insertEscRule.run(2, 'goal_not_approved', 7, 1);
insertEscRule.run(3, 'checkin_not_done', 7, 1);

// 10. Escalation Log (Empty)

console.log('Database seeded successfully!');
db.close();
