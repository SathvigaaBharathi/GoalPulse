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

    const sheets = db.prepare("SELECT id FROM goal_sheets WHERE cycle_id = ? AND status = 'approved'").all(cycleId);
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
router.get('/cycles', requireAuth, (req, res) => {
  try {
    const cycles = db.prepare('SELECT id, name, is_active FROM cycles ORDER BY id DESC').all();
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// QoQ Achievement Trends by Department
router.get('/qoq', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const cycleId = req.query.cycleId;
    if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const departments = db.prepare("SELECT DISTINCT department FROM users WHERE role = 'employee' AND department IS NOT NULL").all().map(d => d.department);

    const result = quarters.map(q => {
      const row = { quarter: q };
      for (const dept of departments) {
        const data = db.prepare(`
          SELECT AVG(
            CASE 
              WHEN g.uom_type IN ('min_numeric','min_percent') AND g.target_value > 0 THEN MIN(a.actual_value * 100.0 / g.target_value, 150)
              WHEN g.uom_type IN ('max_numeric','max_percent') AND a.actual_value > 0 THEN MIN(g.target_value * 100.0 / a.actual_value, 150)
              WHEN g.uom_type = 'zero' THEN CASE WHEN a.actual_value = 0 THEN 100 ELSE 0 END
              ELSE NULL
            END
          ) as avg_score
          FROM achievements a
          JOIN goals g ON a.goal_id = g.id
          JOIN goal_sheets s ON g.sheet_id = s.id
          JOIN users u ON s.employee_id = u.id
          WHERE s.cycle_id = ? AND a.quarter = ? AND u.department = ?
        `).get(cycleId, q, dept);
        row[dept] = data.avg_score ? Math.round(data.avg_score) : 0;
      }
      return row;
    });

    res.json({ data: result, departments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manager Effectiveness
router.get('/manager-effectiveness', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const cycleId = req.query.cycleId;
    if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

    const managers = db.prepare("SELECT id, name FROM users WHERE role = 'manager'").all();

    const result = managers.map(mgr => {
      const teamSize = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE manager_id = ? AND role = 'employee'").get(mgr.id).cnt;
      
      const totalSheets = db.prepare("SELECT COUNT(*) as cnt FROM goal_sheets s JOIN users u ON s.employee_id = u.id WHERE u.manager_id = ? AND s.cycle_id = ?").get(mgr.id, cycleId).cnt;
      const approvedSheets = db.prepare("SELECT COUNT(*) as cnt FROM goal_sheets s JOIN users u ON s.employee_id = u.id WHERE u.manager_id = ? AND s.cycle_id = ? AND s.status = 'approved'").get(mgr.id, cycleId).cnt;
      const approvalRate = totalSheets > 0 ? Math.round((approvedSheets / totalSheets) * 100) : 0;

      const checkinsDone = {};
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
        const done = db.prepare(`
          SELECT COUNT(DISTINCT c.goal_sheet_id) as cnt 
          FROM checkin_comments c
          JOIN goal_sheets s ON c.goal_sheet_id = s.id
          JOIN users u ON s.employee_id = u.id
          WHERE u.manager_id = ? AND s.cycle_id = ? AND c.quarter = ?
        `).get(mgr.id, cycleId, q).cnt;
        checkinsDone[q] = approvedSheets > 0 ? Math.round((done / approvedSheets) * 100) : 0;
      }

      const avgScore = db.prepare(`
        SELECT AVG(
          CASE 
            WHEN g.uom_type IN ('min_numeric','min_percent') AND g.target_value > 0 THEN MIN(a.actual_value * 100.0 / g.target_value, 150)
            WHEN g.uom_type IN ('max_numeric','max_percent') AND a.actual_value > 0 THEN MIN(g.target_value * 100.0 / a.actual_value, 150)
            WHEN g.uom_type = 'zero' THEN CASE WHEN a.actual_value = 0 THEN 100 ELSE 0 END
            ELSE NULL
          END
        ) as avg
        FROM achievements a
        JOIN goals g ON a.goal_id = g.id
        JOIN goal_sheets s ON g.sheet_id = s.id
        JOIN users u ON s.employee_id = u.id
        WHERE u.manager_id = ? AND s.cycle_id = ?
      `).get(mgr.id, cycleId);

      return {
        manager: mgr.name,
        teamSize,
        approvalRate,
        q1CheckIn: checkinsDone['Q1'],
        q2CheckIn: checkinsDone['Q2'],
        q3CheckIn: checkinsDone['Q3'],
        q4CheckIn: checkinsDone['Q4'],
        avgTeamScore: avgScore.avg ? Math.round(avgScore.avg) : 0
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Completion Heatmap (employees x quarters)
router.get('/heatmap', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const cycleId = req.query.cycleId;
    if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

    const employees = db.prepare(`
      SELECT u.id, u.name, u.department, s.id as sheet_id, s.status as sheet_status
      FROM users u
      LEFT JOIN goal_sheets s ON u.id = s.employee_id AND s.cycle_id = ?
      WHERE u.role = 'employee'
      ORDER BY u.department, u.name
    `).all(cycleId);

    const result = employees.map(emp => {
      const row = { employee: emp.name, department: emp.department, submitted: !!emp.sheet_id, approved: emp.sheet_status === 'approved' };
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
        if (!emp.sheet_id) { row[q] = 'none'; continue; }
        const hasCheckin = db.prepare('SELECT 1 FROM checkin_comments WHERE goal_sheet_id = ? AND quarter = ?').get(emp.sheet_id, q);
        const hasAchievement = db.prepare(`
          SELECT 1 FROM achievements a JOIN goals g ON a.goal_id = g.id WHERE g.sheet_id = ? AND a.quarter = ?
        `).get(emp.sheet_id, q);
        row[q] = hasCheckin ? 'reviewed' : hasAchievement ? 'submitted' : 'pending';
      }
      return row;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
