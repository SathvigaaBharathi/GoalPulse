const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/readiness', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const cycleId = req.query.cycleId || 1;
    
    // 1. Cycle Info
    const cycle = db.prepare('SELECT * FROM cycles WHERE id = ?').get(cycleId);
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' });

    // Determine current window
    const now = new Date().toISOString().split('T')[0];
    let currentWindow = 'phase1';
    let windowClose = cycle.phase1_close;

    if (now > cycle.phase1_close) {
      if (now <= cycle.q1_close) { currentWindow = 'q1'; windowClose = cycle.q1_close; }
      else if (now <= cycle.q2_close) { currentWindow = 'q2'; windowClose = cycle.q2_close; }
      else if (now <= cycle.q3_close) { currentWindow = 'q3'; windowClose = cycle.q3_close; }
      else { currentWindow = 'q4'; windowClose = cycle.q4_close; }
    }

    const daysUntilWindowCloses = Math.max(0, Math.ceil((new Date(windowClose) - new Date()) / (1000 * 60 * 60 * 24)));

    // 2. Overall Readiness
    const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'employee'").get().count;
    const stats = db.prepare(`
      SELECT 
        COUNT(CASE WHEN status IN ('submitted', 'approved') THEN 1 END) as submitted,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
      FROM goal_sheets 
      WHERE cycle_id = ?
    `).get(cycleId);

    // Placeholder for checkins (would query achievements table in real scenario)
    const checkinsThisQuarter = db.prepare(`
      SELECT COUNT(*) as count FROM achievements 
      WHERE quarter = ? AND goal_id IN (SELECT id FROM goals WHERE sheet_id IN (SELECT id FROM goal_sheets WHERE cycle_id = ?))
    `).get(currentWindow.toUpperCase(), cycleId).count;

    // 3. Department Breakdown
    const deptStats = db.prepare(`
      SELECT 
        u.department as dept,
        COUNT(u.id) as total,
        COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved
      FROM users u
      LEFT JOIN goal_sheets s ON u.id = s.employee_id AND s.cycle_id = ?
      WHERE u.role = 'employee'
      GROUP BY u.department
    `).all(cycleId);

    const departmentBreakdown = deptStats.map(d => ({
      dept: d.dept,
      total: d.total,
      approved: d.approved,
      readiness: d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0,
      atRisk: d.total - d.approved
    })).sort((a, b) => a.readiness - b.readiness);

    // 4. Thrust Area Coverage
    const thrustStats = db.prepare(`
      SELECT 
        ta.name as area,
        COUNT(g.id) as goalCount,
        AVG(g.weightage) as avgWeight
      FROM thrust_areas ta
      LEFT JOIN goals g ON ta.id = g.thrust_area_id AND g.sheet_id IN (SELECT id FROM goal_sheets WHERE cycle_id = ?)
      GROUP BY ta.id
    `).all(cycleId);

    const thrustAreaCoverage = thrustStats.map(t => ({
      area: t.area,
      goalCount: t.goalCount || 0,
      avgWeight: Math.round(t.avgWeight || 0)
    }));

    // 5. Urgent Attention
    const urgentAttention = db.prepare(`
      SELECT 
        u.name,
        u.manager_id as managerId,
        CASE 
          WHEN s.id IS NULL THEN 'Goal sheet not started'
          WHEN s.status = 'draft' THEN 'Goal sheet still in draft'
          WHEN s.status = 'rework' THEN 'Rework pending from employee'
          WHEN s.status = 'submitted' THEN 'Awaiting manager approval'
        END as issue,
        CAST((julianday('now') - julianday(COALESCE(s.submitted_at, u.created_at))) AS INTEGER) as daysPending
      FROM users u
      LEFT JOIN goal_sheets s ON u.id = s.employee_id AND s.cycle_id = ?
      WHERE u.role = 'employee' AND (s.status IS NULL OR s.status != 'approved')
      LIMIT 10
    `).all(cycleId);

    // 6. Manager Summary
    const managerStats = db.prepare(`
      SELECT 
        m.name,
        COUNT(s.id) as pendingApprovals,
        AVG(CAST((julianday('now') - julianday(s.submitted_at)) AS INTEGER)) as avgApprovalDays
      FROM users m
      JOIN goal_sheets s ON s.status = 'submitted' AND s.cycle_id = ?
      JOIN users e ON s.employee_id = e.id AND e.manager_id = m.id
      GROUP BY m.id
    `).all(cycleId);

    res.json({
      cycleId,
      cycleName: cycle.name,
      currentWindow,
      daysUntilWindowCloses,
      overallReadiness: {
        totalEmployees,
        sheetsSubmitted: stats.submitted,
        sheetsApproved: stats.approved,
        checkinsThisQuarter,
        readinessPercent: totalEmployees > 0 ? Math.round((stats.approved / totalEmployees) * 100) : 0
      },
      departmentBreakdown,
      thrustAreaCoverage,
      urgentAttention,
      managerSummary: managerStats.map(m => ({
        name: m.name,
        pendingApprovals: m.pendingApprovals,
        avgApprovalDays: Math.round(m.avgApprovalDays || 0)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/nudge/:managerId', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { managerId } = req.params;
    const adminId = req.user.userId;
    
    // 1. Get some context for the notification
    const cycle = db.prepare('SELECT name, phase1_close FROM cycles WHERE is_active = 1').get();
    
    const message = `URGENT: Admin has nudged you regarding pending goal approvals. The ${cycle.name} setup window closes on ${cycle.phase1_close}. Please take immediate action.`;

    // 2. Insert Notification for Manager
    db.prepare('INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)')
      .run(managerId, 'nudge', message);

    // 3. Log to Audit Trail
    db.prepare(`
      INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('user', managerId, adminId, 'manager_nudge', 'active', 'nudged');

    res.json({ success: true, message: 'Nudge sent successfully and logged to audit trail' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
