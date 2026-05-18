const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendMail } = require('../notifications/mailer');
const templates = require('../notifications/templates');
const { sendTeamsNotification } = require('../notifications/teams');

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
    let { title, description, thrust_area_id, uom_type, target_value, target_date, weightage, score_cap } = req.body;
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

    // Validate score_cap (must be integer between 100 and 150)
    if (score_cap !== undefined && score_cap !== null) {
      const capVal = parseInt(score_cap, 10);
      if (isNaN(capVal) || capVal < 100 || capVal > 150) {
        return res.status(400).json({ error: 'Max Score Cap must be an integer between 100% and 150%' });
      }
      score_cap = capVal;
    } else {
      score_cap = 150;
    }

    const insert = db.prepare(`
      INSERT INTO goals (sheet_id, thrust_area_id, title, description, uom_type, target_value, target_date, weightage, score_cap) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = insert.run(sheet.id, thrust_area_id, title, description, uom_type, target_value, target_date, weightage, score_cap);
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
    // ALLOW weightage updates on locked goals if they are NOT shared goals (to support auto-rebalance)
    const isWeightageOnly = Object.keys(updates).length === 1 && updates.weightage !== undefined;
    if (goal.is_locked && !isWeightageOnly && req.user.role !== 'manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Goal is locked' });
    }

    // Validate score_cap if provided
    if (updates.score_cap !== undefined && updates.score_cap !== null) {
      const capVal = parseInt(updates.score_cap, 10);
      if (isNaN(capVal) || capVal < 100 || capVal > 150) {
        return res.status(400).json({ error: 'Max Score Cap must be an integer between 100% and 150%' });
      }
      updates.score_cap = capVal;
    }

    // Prepare update query dynamically based on allowed fields
    const fields = Object.keys(updates).filter(k => 
      ['title', 'description', 'thrust_area_id', 'uom_type', 'target_value', 'target_date', 'weightage', 'score_cap'].includes(k)
    );
    
    if (fields.length === 0) return res.json({ success: true });

    // Enforce min 10% weightage (only for regular employees manual edits)
    // We relax this for Managers/Admins to allow the system to rebalance automatically
    if (updates.weightage !== undefined && updates.weightage < 10 && req.user.role === 'employee') {
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
    const manager = db.prepare('SELECT m.id, m.email FROM users u JOIN users m ON u.manager_id = m.id WHERE u.id = ?').get(req.user.userId);
    if (manager) {
      const employee = db.prepare('SELECT name, department FROM users WHERE id = ?').get(req.user.userId);
      db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, 'goal_submitted', ?)")
        .run(manager.id, `${employee.name} has submitted goals for review.`);
      
      if (manager.email) {
        const tpl = templates.goalSheetSubmitted(employee.name, goals.length);
        sendMail({ to: manager.email, ...tpl }).catch(console.error);
      }

      // MS Teams Notification webhook
      const cycleName = db.prepare('SELECT name FROM cycles WHERE id = ?').get(sheet.cycle_id)?.name;
      sendTeamsNotification('goal_submit', {
        employeeName: employee.name,
        department: employee.department,
        goalCount: goals.length,
        cycleName
      }).catch(console.error);
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
    const sheetInfo = db.prepare('SELECT s.employee_id, u.email, u.name FROM goal_sheets s JOIN users u ON s.employee_id = u.id WHERE s.id = ?').get(req.params.id);
    const managerInfo = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.userId);
    if (sheetInfo) {
      db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, 'goal_rework', ?)")
        .run(sheetInfo.employee_id, `Your goal sheet has been returned for rework by ${managerInfo.name}. Reason: "${reason}"`);
      
      if (sheetInfo.email) {
        const tpl = templates.goalSheetRework(managerInfo.name, reason);
        sendMail({ to: sheetInfo.email, ...tpl }).catch(console.error);
      }
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
    const sheetInfo = db.prepare('SELECT s.employee_id, u.email, c.name as cycle_name FROM goal_sheets s JOIN users u ON s.employee_id = u.id JOIN cycles c ON s.cycle_id = c.id WHERE s.id = ?').get(req.params.id);
    const managerInfo = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.userId);
    if (sheetInfo) {
      db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, 'goal_approved', ?)")
        .run(sheetInfo.employee_id, `Your goal sheet has been approved by ${managerInfo.name}.`);
      
      if (sheetInfo.email) {
        const tpl = templates.goalSheetApproved(managerInfo.name, sheetInfo.cycle_name);
        sendMail({ to: sheetInfo.email, ...tpl }).catch(console.error);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Push shared goal
router.post('/push-shared', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { employeeIds, thrust_area_id, title, description, uom_type, target_value, target_date, parent_goal_id } = req.body;
    const activeCycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1').get();
    
    const insertGoal = db.prepare(`
      INSERT INTO goals (sheet_id, thrust_area_id, title, description, uom_type, target_value, target_date, weightage, is_shared, is_locked, parent_goal_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 10, 1, 0, ?)
    `);

    db.transaction(() => {
      for (const empId of employeeIds) {
        let sheet = db.prepare('SELECT id, status FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?').get(empId, activeCycle.id);
        if (!sheet) {
          const sRes = db.prepare("INSERT INTO goal_sheets (employee_id, cycle_id, status) VALUES (?, ?, 'draft')").run(empId, activeCycle.id);
          sheet = { id: sRes.lastInsertRowid, status: 'draft' };
        }
        
        // Enforce max 8 goals
        const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM goals WHERE sheet_id = ?').get(sheet.id).cnt;
        if (existingCount >= 8) continue;

        const gRes = insertGoal.run(sheet.id, thrust_area_id, title, description, uom_type, target_value, target_date, parent_goal_id || null);
        
        // Insert In-App Notification
        db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, 'shared_goal', ?)")
          .run(empId, `A new shared goal "${title}" has been pushed to your goal sheet.`);
        
        // --- AUTO REBALANCE LOGIC ---
        const allGoals = db.prepare('SELECT id, weightage, is_shared, is_locked FROM goals WHERE sheet_id = ?').all(sheet.id);
        const totalWeight = allGoals.reduce((sum, g) => sum + g.weightage, 0);

        if (totalWeight > 100) {
          const lockedGoals = allGoals.filter(g => g.is_shared || g.is_locked);
          const regularGoals = allGoals.filter(g => !(g.is_shared || g.is_locked));
          
          const reservedWeight = lockedGoals.reduce((sum, g) => sum + g.weightage, 0);
          const targetForRegular = Math.max(0, 100 - reservedWeight);

          if (regularGoals.length > 0) {
            const baseWeight = Math.floor(targetForRegular / regularGoals.length);
            let remainder = targetForRegular % regularGoals.length;

            regularGoals.forEach((g, index) => {
              const newWeight = baseWeight + (index < remainder ? 1 : 0);
              db.prepare('UPDATE goals SET weightage = ? WHERE id = ?').run(newWeight, g.id);
            });
          }

          // If the sheet was already approved, it is now "Invalidated" by the new goal and weight change.
          // Move it back to 'submitted' so the manager MUST re-approve the new state.
          if (sheet.status === 'approved') {
            db.prepare("UPDATE goal_sheets SET status = 'submitted', approved_at = NULL, approved_by = NULL WHERE id = ?").run(sheet.id);
            
            // Audit the status change
            db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('sheet', ?, ?, 'auto_rework_shared_push', 'approved', 'submitted')")
              .run(sheet.id, req.user.userId);
          }
        }
        
        // Audit the push
        const audit = db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('goal', ?, ?, 'shared_goal_push', 'none', ?)");
        audit.run(gRes.lastInsertRowid, req.user.userId, JSON.stringify({ title, employee_id: empId, parent_goal_id, auto_rebalanced: totalWeight > 100 }));
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

// CASCADE VIEW: Get flat array of goals
router.get('/cascade', requireAuth, (req, res) => {
  try {
    const { cycleId } = req.query;
    if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });

    let goals = db.prepare(`
      SELECT g.id, g.title, g.parent_goal_id as parentGoalId,
             u.id as ownerId, u.name as ownerName, u.role as ownerRole, u.department as ownerDept,
             t.name as thrustArea,
             t_parent.name as parentThrustArea,
             (
               SELECT MAX(a.actual_value) 
               FROM achievements a 
               WHERE a.goal_id = g.id
             ) as actualValue,
             g.target_value as targetValue,
             g.uom_type as uomType,
             g.score_cap as scoreCap,
             u_parent.department as parentOwnerDept
      FROM goals g
      JOIN goal_sheets s ON g.sheet_id = s.id
      JOIN users u ON s.employee_id = u.id
      LEFT JOIN thrust_areas t ON g.thrust_area_id = t.id
      LEFT JOIN goals g_parent ON g.parent_goal_id = g_parent.id
      LEFT JOIN goal_sheets s_parent ON g_parent.sheet_id = s_parent.id
      LEFT JOIN users u_parent ON s_parent.employee_id = u_parent.id
      LEFT JOIN thrust_areas t_parent ON g_parent.thrust_area_id = t_parent.id
      WHERE s.cycle_id = ?
    `).all(cycleId);
    
    // Filter by role
    if (req.user.role === 'manager') {
      const allowedUserIds = [req.user.userId, ...db.prepare('SELECT id FROM users WHERE manager_id = ?').all(req.user.userId).map(u => u.id)];
      goals = goals.filter(g => allowedUserIds.includes(g.ownerId));
    } else if (req.user.role === 'employee') {
      const ownGoals = goals.filter(g => g.ownerId === req.user.userId);
      const allowedGoalIds = new Set(ownGoals.map(g => g.id));
      
      ownGoals.forEach(g => {
        let currentParentId = g.parentGoalId;
        while (currentParentId) {
          allowedGoalIds.add(currentParentId);
          const parent = goals.find(pg => pg.id === currentParentId);
          currentParentId = parent ? parent.parentGoalId : null;
        }
      });
      goals = goals.filter(g => allowedGoalIds.has(g.id));
    }

    const getScore = (uom, actual, target, scoreCap) => {
      if (actual === null || target === 0 || !target) return 0;
      if (uom === 'zero') return actual === 0 ? 100 : 0;
      if (uom === 'timeline') return 0;
      const cap = scoreCap !== undefined && scoreCap !== null ? scoreCap : 150;
      if (uom === 'min_numeric' || uom === 'min_percent') return Math.min((actual / target) * 100, cap);
      if (uom === 'max_numeric' || uom === 'max_percent') return Math.min((target / actual) * 100, cap);
      return 0;
    };

    const result = goals.map(g => {
      const isCrossDept = g.parentGoalId !== null && g.ownerDept !== g.parentOwnerDept;
      return {
        id: g.id,
        title: g.title,
        ownerName: g.ownerName,
        ownerRole: g.ownerRole,
        thrustArea: g.thrustArea,
        parentGoalId: g.parentGoalId,
        progressScore: Math.round(getScore(g.uomType, g.actualValue, g.targetValue, g.scoreCap)),
        ownerDept: g.ownerDept,
        parentOwnerDept: g.parentOwnerDept || null,
        parentThrustArea: g.parentThrustArea || null,
        isCrossDept: !!isCrossDept
      };
    });

    // Calculate crossDeptChildrenCount
    const crossDeptCounts = {};
    result.forEach(g => {
      if (g.isCrossDept && g.parentGoalId) {
        crossDeptCounts[g.parentGoalId] = (crossDeptCounts[g.parentGoalId] || 0) + 1;
      }
    });

    result.forEach(g => {
      g.crossDeptChildrenCount = crossDeptCounts[g.id] || 0;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN/MANAGER: Link parent goal
router.post('/:id/link-parent', requireAuth, requireRole(['admin', 'manager']), (req, res) => {
  try {
    const { parentGoalId } = req.body;
    const goalId = parseInt(req.params.id);
    
    if (goalId === parentGoalId) return res.status(400).json({ error: 'Cannot link to self' });

    if (parentGoalId !== null) {
      const parent = db.prepare('SELECT id, parent_goal_id FROM goals WHERE id = ?').get(parentGoalId);
      if (!parent) return res.status(404).json({ error: 'Parent goal not found' });
      
      // Prevent circular links
      let currentParentId = parent.parent_goal_id;
      while (currentParentId) {
        if (currentParentId === goalId) {
          return res.status(400).json({ error: 'Circular link detected' });
        }
        const nextParent = db.prepare('SELECT parent_goal_id FROM goals WHERE id = ?').get(currentParentId);
        currentParentId = nextParent ? nextParent.parent_goal_id : null;
      }
    }

    const oldGoal = db.prepare('SELECT parent_goal_id FROM goals WHERE id = ?').get(goalId);
    if (!oldGoal) return res.status(404).json({ error: 'Goal not found' });
    
    db.prepare('UPDATE goals SET parent_goal_id = ? WHERE id = ?').run(parentGoalId, goalId);
    
    const audit = db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('goal', ?, ?, 'goal_linked', ?, ?)");
    audit.run(goalId, req.user.userId, JSON.stringify({ parent_goal_id: oldGoal.parent_goal_id }), JSON.stringify({ parent_goal_id: parentGoalId }));

    // Check if cross-department link
    let isCrossDept = false;
    let parentDept = null;
    if (parentGoalId !== null) {
      const owner = db.prepare(`
        SELECT u.department 
        FROM goals g
        JOIN goal_sheets s ON g.sheet_id = s.id
        JOIN users u ON s.employee_id = u.id
        WHERE g.id = ?
      `).get(goalId);
      
      const parentOwner = db.prepare(`
        SELECT u.department 
        FROM goals g
        JOIN goal_sheets s ON g.sheet_id = s.id
        JOIN users u ON s.employee_id = u.id
        WHERE g.id = ?
      `).get(parentGoalId);
      
      if (owner && parentOwner && owner.department !== parentOwner.department) {
        isCrossDept = true;
        parentDept = parentOwner.department;
      }
    }
    
    res.json({ success: true, isCrossDept, parentDept });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notifications: Get user notifications
router.get('/notifications', requireAuth, (req, res) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notifications: Mark as read
router.put('/notifications/:id/read', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    
    // Get notification info for audit trail before updating
    const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(id, req.user.userId);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);

    // Log to Audit Trail
    if (notification.type === 'nudge') {
      db.prepare(`
        INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('user', req.user.userId, req.user.userId, 'nudge_acknowledge', 'nudged', 'acknowledged');
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
