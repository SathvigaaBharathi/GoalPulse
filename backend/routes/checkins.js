const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// Calculate score based on UoM rules
const calculateScore = (uom, actual, target, targetDateStr, actualDateStr) => {
  if (uom === 'zero') {
    return actual === 0 ? 100 : 0;
  }
  
  if (uom === 'timeline') {
    if (!targetDateStr) return null; // N/A
    if (!actualDateStr) return 0;
    const targetTime = new Date(targetDateStr).getTime();
    const actualTime = new Date(actualDateStr).getTime();
    if (actualTime <= targetTime) return 100;
    
    // Proportional penalty based on overdue days (e.g. drop 10% per week, simple heuristic for demo)
    const overdueDays = (actualTime - targetTime) / (1000 * 60 * 60 * 24);
    return Math.max(0, 100 - (overdueDays * 2)); // Simple logic
  }

  // Numeric and Percent types
  if (target === 0 || target === null) return 0;
  let score = 0;
  
  if (uom === 'min_numeric' || uom === 'min_percent') {
    score = (actual / target) * 100;
  } else if (uom === 'max_numeric' || uom === 'max_percent') {
    score = (target / actual) * 100;
  }
  
  return Math.min(score, 150); // Capped at 150%
};

// Log achievement (Employee)
router.post('/achievements', requireAuth, (req, res) => {
  try {
    const { goal_id, quarter, actual_value, actual_date, status } = req.body;
    
    // Enforce window guard
    const activeCycle = db.prepare('SELECT * FROM cycles WHERE is_active = 1').get();
    const todayStr = new Date().toISOString().split('T')[0];
    const qOpen = activeCycle[`${quarter.toLowerCase()}_open`];
    const qClose = activeCycle[`${quarter.toLowerCase()}_close`];
    
    if (todayStr < qOpen || todayStr > qClose) {
      return res.status(403).json({ error: `Check-in window for ${quarter} is currently closed.` });
    }

    // Check existing
    const existing = db.prepare('SELECT id FROM achievements WHERE goal_id = ? AND quarter = ?').get(goal_id, quarter);
    if (existing) {
      db.prepare('UPDATE achievements SET actual_value = ?, actual_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(actual_value, actual_date, status, existing.id);
      
      const audit = db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('achievement', ?, ?, 'checkin_update', 'existing', ?)");
      audit.run(existing.id, req.user.userId, JSON.stringify({ quarter, actual_value, status }));
    } else {
      const res = db.prepare('INSERT INTO achievements (goal_id, quarter, actual_value, actual_date, status) VALUES (?, ?, ?, ?, ?)')
        .run(goal_id, quarter, actual_value, actual_date, status);
      
      const audit = db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('achievement', ?, ?, 'checkin_submit', 'none', ?)");
      audit.run(res.lastInsertRowid, req.user.userId, JSON.stringify({ quarter, actual_value, status }));
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manager: Checkin module for direct reports
router.get('/team', requireAuth, requireRole(['manager']), (req, res) => {
  try {
    const cycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1').get();
    const sheets = db.prepare(`
      SELECT s.id as sheet_id, u.id as emp_id, u.name as employee_name 
      FROM goal_sheets s 
      JOIN users u ON s.employee_id = u.id 
      WHERE u.manager_id = ? AND s.cycle_id = ? AND s.status = 'approved'
    `).all(req.user.userId, cycle.id);
    
    const teamData = sheets.map(s => {
      const goals = db.prepare(`
        SELECT g.*, 
               a.actual_value, a.actual_date, a.status as achievement_status, a.quarter
        FROM goals g
        LEFT JOIN achievements a ON g.id = a.goal_id
        WHERE g.sheet_id = ?
      `).all(s.sheet_id);
      
      const goalsWithScore = goals.map(g => ({
        ...g,
        score: g.actual_value !== null ? calculateScore(g.uom_type, g.actual_value, g.target_value, g.target_date, g.actual_date) : null
      }));

      // Also get comments
      const comments = db.prepare('SELECT quarter, comment FROM checkin_comments WHERE goal_sheet_id = ?').all(s.sheet_id);

      return {
        ...s,
        goals: goalsWithScore,
        comments
      };
    });
    
    res.json(teamData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manager adds checkin comment
router.post('/comments', requireAuth, requireRole(['manager']), (req, res) => {
  try {
    const { goal_sheet_id, quarter, comment } = req.body;
    if (!comment || comment.trim() === '') return res.status(400).json({ error: 'Comment is required' });

    db.prepare('INSERT INTO checkin_comments (goal_sheet_id, manager_id, quarter, comment) VALUES (?, ?, ?, ?)')
      .run(goal_sheet_id, req.user.userId, quarter, comment);
      
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
