const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendMail } = require('../notifications/mailer');
const templates = require('../notifications/templates');

// Helper to get or create sheet for active cycle
const getOrCreateSheet = (employeeId) => {
  const activeCycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1').get();
  if (!activeCycle) throw new Error('No active cycle found');
  
  let sheet = db.prepare('SELECT * FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?').get(employeeId, activeCycle.id);
  
  if (!sheet) {
    const res = db.prepare("INSERT INTO goal_sheets (employee_id, cycle_id, status) VALUES (?, ?, 'draft')").run(employeeId, activeCycle.id);
    sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(res.lastInsertRowid);
  }
  return sheet;
};

// Get current sheet & goals for employee
router.get('/sheet', requireAuth, (req, res) => {
  try {
    const sheet = getOrCreateSheet(req.user.userId);
    const goals = db.prepare(`
      SELECT g.*, t.name as thrust_area_name 
      FROM goals g 
      LEFT JOIN thrust_areas t ON g.thrust_area_id = t.id 
      WHERE g.sheet_id = ?
    `).all(sheet.id);
    
    // Fetch achievements for these goals
    const achievements = db.prepare(`
      SELECT a.* FROM achievements a
      JOIN goals g ON a.goal_id = g.id
      WHERE g.sheet_id = ?
    `).all(sheet.id);

    // Also fetch thrust areas for dropdown
    const thrustAreas = db.prepare('SELECT * FROM thrust_areas').all();
    
    res.json({ sheet, goals, achievements, thrustAreas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add goal
router.post('/', requireAuth, (req, res) => {
  try {
    const { title, description, thrust_area_id, uom_type, target_value, target_date, weightage } = req.body;
    const sheet = getOrCreateSheet(req.user.userId);
    
    if (sheet.status !== 'draft' && sheet.status !== 'rework') {
      return res.status(403).json({ error: 'Sheet is locked' });
    }

    // Enforce max 8 goals
    const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM goals WHERE sheet_id = ?').get(sheet.id).cnt;
    if (existingCount >= 8) {
      return res.status(400).json({ error: 'Maximum of 8 goals allowed per sheet' });
    }

    // Enforce min 10% weightage
    if (weightage < 10) {
      return res.status(400).json({ error: 'Minimum weightage per goal is 10%' });
    }

    const insert = db.prepare(`
      INSERT INTO goals (sheet_id, thrust_area_id, title, description, uom_type, target_value, target_date, weightage) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = insert.run(sheet.id, thrust_area_id, title, description, uom_type, target_value, target_date, weightage);
    res.json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit goal (used by employee in draft/rework, and manager anytime)
router.put('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    if (!goal) return res.status(404).json({ error: 'Not found' });
    
    // Auth logic: employee can edit if not locked. manager can edit weight/target inline.
    if (goal.is_locked && req.user.role !== 'manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Goal is locked' });
    }

    // Prepare update query dynamically based on allowed fields
    const fields = Object.keys(updates).filter(k => 
      ['title', 'description', 'thrust_area_id', 'uom_type', 'target_value', 'target_date', 'weightage'].includes(k)
    );
    
    if (fields.length === 0) return res.json({ success: true });

    // Enforce min 10% weightage
    if (updates.weightage !== undefined && updates.weightage < 10) {
      return res.status(400).json({ error: 'Minimum weightage per goal is 10%' });
    }
    
    const placeholders = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    
    const stmt = db.prepare(`UPDATE goals SET ${placeholders} WHERE id = ?`);
    stmt.run(...values, id);
    
    // Auto-audit for manager edits post-lock
    if (goal.is_locked && req.user.role === 'manager') {
      const audit = db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('goal', ?, ?, 'manager_edit', ?, ?)");
      audit.run(id, req.user.userId, JSON.stringify(goal), JSON.stringify({ ...goal, ...updates }));
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit sheet
router.post('/sheet/submit', requireAuth, (req, res) => {
  try {
    const sheet = getOrCreateSheet(req.user.userId);
    const goals = db.prepare('SELECT weightage FROM goals WHERE sheet_id = ?').all(sheet.id);
    const totalWeight = goals.reduce((sum, g) => sum + g.weightage, 0);
    
    if (totalWeight !== 100) return res.status(400).json({ error: 'Total weightage must be exactly 100%' });
    
    db.prepare("UPDATE goal_sheets SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = ?").run(sheet.id);
    
    const audit = db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('sheet', ?, ?, 'sheet_submit', 'draft', 'submitted')");
    audit.run(sheet.id, req.user.userId);
    
    // Notify Manager
    const manager = db.prepare('SELECT m.email FROM users u JOIN users m ON u.manager_id = m.id WHERE u.id = ?').get(req.user.userId);
    if (manager && manager.email) {
      const tpl = templates.goalSheetSubmitted(req.user.name, goals.length);
      sendMail({ to: manager.email, ...tpl }).catch(console.error);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MANAGER: Get approval queue (submitted only)
router.get('/queue', requireAuth, requireRole(['manager']), (req, res) => {
  try {
    const sheets = db.prepare(`
      SELECT s.*, u.name as employee_name, c.name as cycle_name
      FROM goal_sheets s
      JOIN users u ON s.employee_id = u.id
      JOIN cycles c ON s.cycle_id = c.id
      WHERE u.manager_id = ? AND s.status = 'submitted'
    `).all(req.user.userId);
    res.json(sheets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MANAGER: Get approved sheets for the active cycle
router.get('/approved-sheets', requireAuth, requireRole(['manager']), (req, res) => {
  try {
    const activeCycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1').get();
    if (!activeCycle) return res.json([]);
    const sheets = db.prepare(`
      SELECT s.*, u.name as employee_name, c.name as cycle_name
      FROM goal_sheets s
      JOIN users u ON s.employee_id = u.id
      JOIN cycles c ON s.cycle_id = c.id
      WHERE u.manager_id = ? AND s.cycle_id = ? AND s.status = 'approved'
    `).all(req.user.userId, activeCycle.id);
    res.json(sheets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MANAGER: Get full sheet for specific report
router.get('/sheet/:sheetId', requireAuth, requireRole(['manager']), (req, res) => {
  try {
    const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(req.params.sheetId);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    
    const goals = db.prepare(`
      SELECT g.*, t.name as thrust_area_name 
      FROM goals g 
      LEFT JOIN thrust_areas t ON g.thrust_area_id = t.id 
      WHERE g.sheet_id = ?
    `).all(sheet.id);
    
    res.json({ sheet, goals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MANAGER: Return sheet for rework (works from submitted OR approved)
router.post('/sheet/:id/rework', requireAuth, requireRole(['manager']), (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Rework reason is required' });
    }

    const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(req.params.id);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    if (!['submitted', 'approved'].includes(sheet.status)) {
      return res.status(400).json({ error: 'Sheet cannot be recalled in its current state' });
    }

    const wasApproved = sheet.status === 'approved';

    db.prepare("UPDATE goal_sheets SET status = 'rework', approved_at = NULL, approved_by = NULL WHERE id = ?").run(req.params.id);

    // If recalling an approved sheet, unlock all goals so employee can edit
    if (wasApproved) {
      db.prepare("UPDATE goals SET is_locked = 0 WHERE sheet_id = ?").run(req.params.id);
    }

    const audit = db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('sheet', ?, ?, 'sheet_rework', ?, ?)");
    audit.run(req.params.id, req.user.userId, sheet.status, JSON.stringify({ status: 'rework', reason, recalledFromApproved: wasApproved }));

    // Notify Employee
    const sheetInfo = db.prepare('SELECT u.email, u.name FROM goal_sheets s JOIN users u ON s.employee_id = u.id WHERE s.id = ?').get(req.params.id);
    const managerInfo = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.userId);
    if (sheetInfo && sheetInfo.email) {
      const tpl = templates.goalSheetRework(managerInfo.name, reason);
      sendMail({ to: sheetInfo.email, ...tpl }).catch(console.error);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MANAGER: Approve sheet
router.post('/sheet/:id/approve', requireAuth, requireRole(['manager']), (req, res) => {
  try {
    // Check total weightage again
    const goals = db.prepare('SELECT weightage FROM goals WHERE sheet_id = ?').all(req.params.id);
    const totalWeight = goals.reduce((sum, g) => sum + g.weightage, 0);
    if (totalWeight !== 100) return res.status(400).json({ error: 'Total weightage must be exactly 100% before approval' });

    db.prepare("UPDATE goal_sheets SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ? WHERE id = ?").run(req.user.userId, req.params.id);
    db.prepare("UPDATE goals SET is_locked = 1 WHERE sheet_id = ?").run(req.params.id);
    
    const audit = db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('sheet', ?, ?, 'sheet_approve', 'submitted', 'approved')");
    audit.run(req.params.id, req.user.userId);
    
    // Notify Employee
    const sheetInfo = db.prepare('SELECT u.email, c.name as cycle_name FROM goal_sheets s JOIN users u ON s.employee_id = u.id JOIN cycles c ON s.cycle_id = c.id WHERE s.id = ?').get(req.params.id);
    if (sheetInfo && sheetInfo.email) {
      const tpl = templates.goalSheetApproved(req.user.name, sheetInfo.cycle_name);
      sendMail({ to: sheetInfo.email, ...tpl }).catch(console.error);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Push shared goal
router.post('/push-shared', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { employeeIds, thrust_area_id, title, description, uom_type, target_value, target_date } = req.body;
    const activeCycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1').get();
    
    const insertGoal = db.prepare(`
      INSERT INTO goals (sheet_id, thrust_area_id, title, description, uom_type, target_value, target_date, weightage, is_shared, is_locked) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 10, 1, 0)
    `);

    db.transaction(() => {
      for (const empId of employeeIds) {
        let sheet = db.prepare('SELECT id FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?').get(empId, activeCycle.id);
        if (!sheet) {
          const sRes = db.prepare("INSERT INTO goal_sheets (employee_id, cycle_id, status) VALUES (?, ?, 'draft')").run(empId, activeCycle.id);
          sheet = { id: sRes.lastInsertRowid };
        }
        
        // Enforce max 8 goals
        const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM goals WHERE sheet_id = ?').get(sheet.id).cnt;
        if (existingCount >= 8) continue; // Skip if already full

        const gRes = insertGoal.run(sheet.id, thrust_area_id, title, description, uom_type, target_value, target_date);
        
        // Audit the push
        const audit = db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('goal', ?, ?, 'shared_goal_push', 'none', ?)");
        audit.run(gRes.lastInsertRowid, req.user.userId, JSON.stringify({ title, employee_id: empId }));
      }
    })();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Unlock goal
router.post('/:id/unlock', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { reason } = req.body;
    db.prepare("UPDATE goals SET is_locked = 0 WHERE id = ?").run(req.params.id);
    
    const audit = db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('goal', ?, ?, 'admin_unlock', ?, ?)");
    audit.run(req.params.id, req.user.userId, JSON.stringify({ is_locked: 1 }), JSON.stringify({ is_locked: 0, reason }));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
