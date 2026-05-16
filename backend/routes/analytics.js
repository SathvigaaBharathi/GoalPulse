const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/overview', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const cycleId = req.query.cycleId;
    if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

    // 1. Completion Rate over quarters (mockup logic based on checkins)
    const completionByQuarter = [
      { name: 'Q1', submitted: 0, pending: 0 },
      { name: 'Q2', submitted: 0, pending: 0 },
      { name: 'Q3', submitted: 0, pending: 0 },
      { name: 'Q4', submitted: 0, pending: 0 }
    ];

    const sheets = db.prepare('SELECT id FROM goal_sheets WHERE cycle_id = ? AND status = "approved"').all(cycleId);
    const totalSheets = sheets.length;

    for (let i = 0; i < 4; i++) {
      const q = `Q${i+1}`;
      const count = db.prepare(`
        SELECT COUNT(DISTINCT goal_sheet_id) as count 
        FROM checkin_comments 
        WHERE quarter = ? AND goal_sheet_id IN (SELECT id FROM goal_sheets WHERE cycle_id = ?)
      `).get(q, cycleId).count;
      
      completionByQuarter[i].submitted = count;
      completionByQuarter[i].pending = totalSheets - count;
    }

    // 2. Goal Status Distribution
    const statusCounts = db.prepare(`
      SELECT a.status, COUNT(*) as value
      FROM achievements a
      JOIN goals g ON a.goal_id = g.id
      JOIN goal_sheets s ON g.sheet_id = s.id
      WHERE s.cycle_id = ? AND a.quarter = (SELECT MAX(quarter) FROM achievements a2 JOIN goals g2 ON a2.goal_id = g2.id JOIN goal_sheets s2 ON g2.sheet_id = s2.id WHERE s2.cycle_id = ?)
      GROUP BY a.status
    `).all(cycleId, cycleId);
    
    // Normalize status strings
    const distribution = statusCounts.map(s => ({
      name: s.status === 'completed' ? 'Completed' : s.status === 'on_track' ? 'On Track' : 'Not Started',
      value: s.value
    }));

    if (distribution.length === 0) {
      distribution.push({ name: 'No Data', value: 1 });
    }

    res.json({
      completionByQuarter,
      distribution
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch all cycles for the dropdown
router.get('/cycles', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const cycles = db.prepare('SELECT id, name, is_active FROM cycles ORDER BY id DESC').all();
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
