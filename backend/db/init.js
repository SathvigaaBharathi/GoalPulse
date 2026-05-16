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

// 2. Cycles
const insertCycle = db.prepare(`INSERT INTO cycles (id, name, year, phase1_open, phase1_close, q1_open, q1_close, q2_open, q2_close, q3_open, q3_close, q4_open, q4_close, is_active) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
insertCycle.run(1, 'FY 2025-26', '2025', '2025-05-01', '2025-06-30', '2025-07-01', '2025-08-31', '2025-10-01', '2025-11-30', '2026-01-01', '2026-02-28', '2026-03-01', '2026-04-30', 1);

// 3. Thrust Areas
const insertThrust = db.prepare('INSERT INTO thrust_areas (id, name, description) VALUES (?, ?, ?)');
insertThrust.run(1, 'Revenue Growth', 'Increase overall revenue');
insertThrust.run(2, 'Cost Reduction', 'Reduce operational costs');
insertThrust.run(3, 'Customer Experience', 'Improve customer satisfaction');
insertThrust.run(4, 'People & Culture', 'Employee engagement and retention');
insertThrust.run(5, 'Operational Excellence', 'Improve internal processes');
insertThrust.run(6, 'Compliance & Risk', 'Ensure regulatory compliance');

// 4. Goal Sheets
const insertSheet = db.prepare('INSERT INTO goal_sheets (id, employee_id, cycle_id, status, submitted_at, approved_at, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
insertSheet.run(1, 3, 1, 'approved', '2025-06-15 10:00:00', '2025-06-20 10:00:00', 2);
insertSheet.run(2, 4, 1, 'approved', '2025-06-16 10:00:00', '2025-06-20 10:00:00', 2);
insertSheet.run(3, 5, 1, 'approved', '2025-06-17 10:00:00', '2025-06-20 10:00:00', 2);

// 5. Goals
const insertGoal = db.prepare(`INSERT INTO goals (id, sheet_id, thrust_area_id, title, description, uom_type, target_value, target_date, weightage, is_shared, shared_from_goal_id, is_locked) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

// Employee 1 Goals
insertGoal.run(1, 1, 1, 'Increase Q3 Sales', 'Push product X', 'max_numeric', 500000, null, 20, 0, null, 1);
insertGoal.run(2, 1, 3, 'Improve CSAT Score', 'From 80 to 90', 'min_percent', 90, null, 20, 0, null, 1);
insertGoal.run(3, 1, 5, 'Launch New Feature', 'Feature Y timeline', 'timeline', null, '2025-10-15', 20, 0, null, 1);
insertGoal.run(4, 1, 6, 'Zero Compliance Breaches', 'Maintain 0', 'zero', 0, null, 20, 0, null, 1);
insertGoal.run(5, 1, 2, 'Reduce Cloud Costs', 'Shared goal for all', 'min_percent', 15, null, 20, 1, null, 1);

// Employee 2 Goals
insertGoal.run(6, 2, 1, 'Increase Q4 Sales', 'Push product Y', 'max_numeric', 600000, null, 20, 0, null, 1);
insertGoal.run(7, 2, 3, 'Improve NPS', 'From 40 to 50', 'min_percent', 50, null, 20, 0, null, 1);
insertGoal.run(8, 2, 5, 'Refactor Legacy API', 'Refactor v1 API', 'timeline', null, '2025-11-01', 20, 0, null, 1);
insertGoal.run(9, 2, 6, 'Complete Security Training', 'All team members', 'zero', 0, null, 20, 0, null, 1);
insertGoal.run(10, 2, 2, 'Reduce Cloud Costs', 'Shared goal for all', 'min_percent', 15, null, 20, 1, 5, 1);

// Employee 3 Goals
insertGoal.run(11, 3, 1, 'Q1 Regional Sales', 'Region Z', 'max_numeric', 300000, null, 20, 0, null, 1);
insertGoal.run(12, 3, 3, 'Reduce Support Ticket Time', 'Avg resolution under 2h', 'min_numeric', 2, null, 20, 0, null, 1);
insertGoal.run(13, 3, 5, 'Deploy CI/CD Pipeline', 'For new microservices', 'timeline', null, '2025-08-15', 20, 0, null, 1);
insertGoal.run(14, 3, 4, 'Organize Tech Talk', 'Internal team', 'timeline', null, '2025-09-30', 20, 0, null, 1);
insertGoal.run(15, 3, 2, 'Reduce Cloud Costs', 'Shared goal for all', 'min_percent', 15, null, 20, 1, 5, 1);

// 6. Achievements
const insertAchievement = db.prepare(`INSERT INTO achievements (goal_id, quarter, actual_value, actual_date, status) VALUES (?, ?, ?, ?, ?)`);
// Q1 achievements for Employee 1
insertAchievement.run(1, 'Q1', 120000, null, 'on_track');
insertAchievement.run(2, 'Q1', 82, null, 'on_track');
insertAchievement.run(3, 'Q1', null, null, 'on_track');
insertAchievement.run(4, 'Q1', 0, null, 'completed');
insertAchievement.run(5, 'Q1', 5, null, 'on_track');

// Q1 achievements for Employee 2
insertAchievement.run(6, 'Q1', 100000, null, 'on_track');
insertAchievement.run(7, 'Q1', 42, null, 'on_track');
insertAchievement.run(8, 'Q1', null, null, 'on_track');
insertAchievement.run(9, 'Q1', 0, null, 'completed');
insertAchievement.run(10, 'Q1', 5, null, 'on_track');

// Q1 achievements for Employee 3
insertAchievement.run(11, 'Q1', 90000, null, 'on_track');
insertAchievement.run(12, 'Q1', 3.5, null, 'on_track');
insertAchievement.run(13, 'Q1', null, '2025-08-14', 'completed');
insertAchievement.run(14, 'Q1', null, null, 'on_track');
insertAchievement.run(15, 'Q1', 5, null, 'on_track');

// 7. Checkin Comments
const insertCheckin = db.prepare('INSERT INTO checkin_comments (goal_sheet_id, manager_id, quarter, comment) VALUES (?, ?, ?, ?)');
insertCheckin.run(1, 2, 'Q1', 'Good progress so far. Keep pushing on sales.');
insertCheckin.run(2, 2, 'Q1', 'NPS is improving, let us focus more on API refactoring next quarter.');

// 8. Audit Log
const insertAudit = db.prepare('INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)');
insertAudit.run('goal', 1, 2, 'manager_edit', JSON.stringify({target_value: 450000}), JSON.stringify({target_value: 500000}));
insertAudit.run('goal', 2, 1, 'admin_unlock', JSON.stringify({is_locked: 1}), JSON.stringify({is_locked: 0, reason: 'Employee requested update to target before Q2'}));

// 9. Escalation Rules
const insertEscRule = db.prepare('INSERT INTO escalation_rules (id, rule_type, threshold_days, created_by) VALUES (?, ?, ?, ?)');
insertEscRule.run(1, 'goal_not_submitted', 7, 1);
insertEscRule.run(2, 'goal_not_approved', 7, 1);
insertEscRule.run(3, 'checkin_not_done', 7, 1);

// 10. Escalation Log (Employee 3 has not submitted Q2 checkin)
const insertEscLog = db.prepare('INSERT INTO escalation_log (rule_id, target_user_id, target_entity_id, entity_type, escalation_level, triggered_at) VALUES (?, ?, ?, ?, ?, ?)');
insertEscLog.run(3, 5, 3, 'checkin', 1, '2025-10-08 09:00:00');

console.log('Database seeded successfully!');
db.close();
