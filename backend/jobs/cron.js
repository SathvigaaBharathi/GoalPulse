const cron = require('node-cron');
const db = require('../db');
const { sendMail } = require('../notifications/mailer');
const templates = require('../notifications/templates');

const runDailyJobs = async () => {
  console.log('Running daily cron jobs...');
  const nowStr = new Date().toISOString().split('T')[0];
  const activeCycle = db.prepare('SELECT * FROM cycles WHERE is_active = 1').get();
  
  if (!activeCycle) return;

  // Check windows for reminders
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  for (const q of quarters) {
    const closeDate = activeCycle[`\${q.toLowerCase()}_close`];
    if (!closeDate) continue;
    
    const closeTime = new Date(closeDate).getTime();
    const nowTime = new Date(nowStr).getTime();
    const daysRemaining = (closeTime - nowTime) / (1000 * 3600 * 24);
    
    // 3 days before close
    if (daysRemaining === 3) {
      // Find employees who haven't submitted this quarter
      const pendingUsers = db.prepare(`
        SELECT u.email, u.name 
        FROM users u
        JOIN goal_sheets s ON u.id = s.employee_id
        WHERE u.role = 'employee' AND s.cycle_id = ? AND s.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM achievements a 
          JOIN goals g ON a.goal_id = g.id 
          WHERE g.sheet_id = s.id AND a.quarter = ?
        )
      `).all(activeCycle.id, q);

      for (const user of pendingUsers) {
        const tpl = templates.checkinReminder(q, closeDate);
        sendMail({ to: user.email, ...tpl }).catch(console.error);
      }
    }
  }

  // --- ESCALATIONS (Phase 5) ---
  const rules = db.prepare('SELECT * FROM escalation_rules WHERE is_active = 1').all();
  
  for (const rule of rules) {
    if (rule.rule_type === 'goal_not_submitted') {
      const targetDate = new Date(activeCycle.phase1_open);
      targetDate.setDate(targetDate.getDate() + rule.threshold_days);
      if (new Date(nowStr) >= targetDate) {
        // Find employees with no submitted sheet
        const violators = db.prepare(`
          SELECT u.id, u.email, u.name, u.manager_id, m.email as manager_email
          FROM users u
          LEFT JOIN users m ON u.manager_id = m.id
          LEFT JOIN goal_sheets s ON u.id = s.employee_id AND s.cycle_id = ? AND s.status != 'draft'
          WHERE u.role = 'employee' AND s.id IS NULL
        `).all(activeCycle.id);

        for (const v of violators) {
          logEscalation(rule.id, v.id, null, 'goal_sheet', v);
        }
      }
    } else if (rule.rule_type === 'goal_not_approved') {
      // Find submitted sheets that have been waiting > threshold
      const violators = db.prepare(`
        SELECT s.id as sheet_id, u.id, u.email, u.name, u.manager_id, m.email as manager_email
        FROM goal_sheets s
        JOIN users u ON s.employee_id = u.id
        LEFT JOIN users m ON u.manager_id = m.id
        WHERE s.cycle_id = ? AND s.status = 'submitted'
        AND julianday(?) - julianday(s.submitted_at) >= ?
      `).all(activeCycle.id, nowStr, rule.threshold_days);

      for (const v of violators) {
        logEscalation(rule.id, v.id, v.sheet_id, 'goal_sheet', v);
      }
    } else if (rule.rule_type === 'checkin_not_done') {
      // Find checkins not done within window open + threshold
      for (const q of quarters) {
        const qOpen = activeCycle[`\${q.toLowerCase()}_open`];
        const qClose = activeCycle[`\${q.toLowerCase()}_close`];
        if (!qOpen || nowStr > qClose) continue;
        
        const targetDate = new Date(qOpen);
        targetDate.setDate(targetDate.getDate() + rule.threshold_days);
        if (new Date(nowStr) >= targetDate) {
          const violators = db.prepare(`
            SELECT u.id, u.email, u.name, u.manager_id, m.email as manager_email, s.id as sheet_id
            FROM users u
            JOIN goal_sheets s ON u.id = s.employee_id
            LEFT JOIN users m ON u.manager_id = m.id
            WHERE u.role = 'employee' AND s.cycle_id = ? AND s.status = 'approved'
            AND NOT EXISTS (
              SELECT 1 FROM achievements a 
              JOIN goals g ON a.goal_id = g.id 
              WHERE g.sheet_id = s.id AND a.quarter = ?
            )
          `).all(activeCycle.id, q);

          for (const v of violators) {
            logEscalation(rule.id, v.id, v.sheet_id, 'checkin', v);
          }
        }
      }
    }
  }

  // Auto-resolve checkin escalations if they finally submitted
  db.prepare(`
    UPDATE escalation_log SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP
    WHERE is_resolved = 0 AND entity_type = 'checkin' AND EXISTS (
      SELECT 1 FROM achievements a 
      JOIN goals g ON a.goal_id = g.id 
      WHERE g.sheet_id = escalation_log.target_entity_id
    )
  `).run();

  // Auto-resolve sheet escalations
  db.prepare(`
    UPDATE escalation_log SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP
    WHERE is_resolved = 0 AND entity_type = 'goal_sheet' AND EXISTS (
      SELECT 1 FROM goal_sheets s
      WHERE s.id = escalation_log.target_entity_id AND s.status = 'approved'
    )
  `).run();
};

const logEscalation = (ruleId, targetUserId, targetEntityId, entityType, userDetails) => {
  // Check existing log
  let log = db.prepare('SELECT * FROM escalation_log WHERE rule_id = ? AND target_user_id = ? AND is_resolved = 0').get(ruleId, targetUserId);
  
  if (!log) {
    // Level 1
    const res = db.prepare('INSERT INTO escalation_log (rule_id, target_user_id, target_entity_id, entity_type, escalation_level) VALUES (?, ?, ?, ?, 1)')
      .run(ruleId, targetUserId, targetEntityId, entityType);
    
    // In-App Notification (Level 1 to Employee)
    db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, 'escalation', 'Escalation Level 1: You have an overdue action in GoalPulse.')")
      .run(targetUserId);

    // Notify Employee
    sendMail({ to: userDetails.email, subject: '[GoalPulse] Action Required (Escalation Level 1)', text: 'You have an overdue action in GoalPulse.' }).catch(console.error);
  } else if (log.escalation_level === 1) {
    // Level 2
    const daysSinceTrigger = (new Date().getTime() - new Date(log.triggered_at).getTime()) / (1000 * 3600 * 24);
    if (daysSinceTrigger >= 3) {
      db.prepare('UPDATE escalation_log SET escalation_level = 2 WHERE id = ?').run(log.id);
      
      // In-App Notification (Level 2 to Manager)
      if (userDetails.manager_id) {
        db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, 'escalation', ?)")
          .run(userDetails.manager_id, `Escalation Level 2: Direct report ${userDetails.name} has an overdue action.`);
      }

      sendMail({ to: userDetails.manager_email, subject: `[GoalPulse] Action Required for ${userDetails.name} (Escalation Level 2)`, text: `${userDetails.name} has an overdue action.` }).catch(console.error);
    }
  } else if (log.escalation_level === 2) {
    // Level 3
    const daysSinceTrigger = (new Date().getTime() - new Date(log.triggered_at).getTime()) / (1000 * 3600 * 24);
    if (daysSinceTrigger >= 7) {
      db.prepare('UPDATE escalation_log SET escalation_level = 3 WHERE id = ?').run(log.id);
      
      // In-App Notification (Level 3 to Admins)
      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
      for (const admin of admins) {
        db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, 'escalation', ?)")
          .run(admin.id, `Escalation Level 3: Employee ${userDetails.name} has a severely overdue action.`);
      }

      sendMail({ to: 'admin@goalpulse.demo', subject: `[GoalPulse] Admin Escalation for ${userDetails.name} (Level 3)`, text: `${userDetails.name} has a severely overdue action.` }).catch(console.error);
    }
  }
};

// Run daily at 08:00
cron.schedule('0 8 * * *', () => {
  runDailyJobs().catch(console.error);
});

module.exports = { runDailyJobs };
