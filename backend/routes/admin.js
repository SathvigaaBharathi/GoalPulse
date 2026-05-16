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
      params.push(`%\${user}%`);
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

module.exports = router;
