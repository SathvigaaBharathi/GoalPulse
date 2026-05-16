const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/audit-log', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { user, date } = req.query;
    
    let query = `
      SELECT a.*, u.name as changed_by_name 
      FROM audit_log a
      JOIN users u ON a.changed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (user) {
      query += ` AND u.name LIKE ?`;
      params.push(`%${user}%`);
    }
    if (date) {
      query += ` AND date(a.changed_at) = ?`;
      params.push(date);
    }
    
    query += " ORDER BY a.changed_at DESC LIMIT 100";

    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/escalation-log', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT e.*, u.name as target_user, r.rule_type
      FROM escalation_log e
      JOIN users u ON e.target_user_id = u.id
      JOIN escalation_rules r ON e.rule_id = r.id
      ORDER BY e.triggered_at DESC
    `).all();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Escalation Rules CRUD
router.get('/escalation-rules', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const rules = db.prepare('SELECT * FROM escalation_rules ORDER BY id').all();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/escalation-rules/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { threshold_days, is_active } = req.body;
    db.prepare('UPDATE escalation_rules SET threshold_days = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(threshold_days, is_active ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Users list for org manager
router.get('/users', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, role, department, manager_id FROM users ORDER BY role, name').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
