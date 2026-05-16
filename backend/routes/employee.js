const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendMail } = require('../notifications/mailer');

// GET /api/employee/next-action
router.get('/next-action', requireAuth, (req, res) => {
  try {
    const userId = req.user.userId;
    const activeCycle = db.prepare('SELECT * FROM cycles WHERE is_active = 1').get();
    if (!activeCycle) return res.json({ type: 'all_clear', urgency: 'none', message: 'No active cycle.', cta: null, detail: null });

    const todayStr = new Date().toISOString().split('T')[0];

    // Determine current window
    const phases = [
      { name: 'phase1', label: 'Phase 1', open: activeCycle.phase1_open, close: activeCycle.phase1_close },
      { name: 'q1',     label: 'Q1',      open: activeCycle.q1_open,     close: activeCycle.q1_close },
      { name: 'q2',     label: 'Q2',      open: activeCycle.q2_open,     close: activeCycle.q2_close },
      { name: 'q3',     label: 'Q3',      open: activeCycle.q3_open,     close: activeCycle.q3_close },
      { name: 'q4',     label: 'Q4',      open: activeCycle.q4_open,     close: activeCycle.q4_close },
    ];

    let currentPhase = null;
    for (const p of phases) {
      if (p.open && p.close && todayStr >= p.open && todayStr <= p.close) {
        currentPhase = p;
        break;
      }
    }

    const daysUntil = (dateStr) => {
      if (!dateStr) return null;
      return Math.ceil((new Date(dateStr) - new Date(todayStr)) / (1000 * 3600 * 24));
    };

    // Get sheet
    const sheet = db.prepare('SELECT * FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?').get(userId, activeCycle.id);

    // Priority 1 — Phase 1 open, sheet not submitted
    if (currentPhase?.name === 'phase1' && (!sheet || sheet.status === 'draft')) {
      const daysLeft = daysUntil(currentPhase.close);
      return res.json({
        type: 'submit_goals',
        urgency: 'high',
        message: 'Goal setting window is open. Your goal sheet is not submitted yet.',
        cta: 'Submit Goal Sheet',
        ctaRoute: '/employee/goals',
        daysLeft,
        detail: `Window closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
      });
    }

    // Priority 2 — Rework
    if (sheet?.status === 'rework') {
      const reworkLog = db.prepare(
        "SELECT new_value FROM audit_log WHERE entity_type = 'sheet' AND entity_id = ? AND change_type = 'sheet_rework' ORDER BY changed_at DESC LIMIT 1"
      ).get(sheet.id);
      let reworkReason = null;
      if (reworkLog) {
        try { reworkReason = JSON.parse(reworkLog.new_value)?.reason; } catch {}
      }
      return res.json({
        type: 'rework_required',
        urgency: 'high',
        message: 'Your goal sheet has been returned for revision.',
        cta: 'View Feedback & Revise',
        ctaRoute: '/employee/goals',
        detail: reworkReason || 'Check your goal sheet for manager feedback.'
      });
    }

    // Priority 3 — Submitted, waiting on manager
    if (sheet?.status === 'submitted') {
      const submittedAt = sheet.submitted_at ? new Date(sheet.submitted_at + 'Z') : null;
      const daysSince = submittedAt ? Math.floor((new Date() - submittedAt) / (1000 * 3600 * 24)) : 0;
      return res.json({
        type: 'waiting_approval',
        urgency: 'low',
        message: 'Your goal sheet is with your manager for approval.',
        cta: null,
        detail: `Submitted ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`,
        waitingDays: daysSince
      });
    }

    // Priority 4 — Check-in window open, incomplete goals
    const checkInPhase = phases.find(p => p.name !== 'phase1' && p.open && p.close && todayStr >= p.open && todayStr <= p.close);
    if (checkInPhase && sheet?.status === 'approved') {
      const quarter = checkInPhase.label; // 'Q1', 'Q2', etc.
      const goals = db.prepare('SELECT id FROM goals WHERE sheet_id = ?').all(sheet.id);
      const completedCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM achievements WHERE goal_id IN (SELECT id FROM goals WHERE sheet_id = ?) AND quarter = ?'
      ).get(sheet.id, quarter).cnt;
      const incompleteCount = goals.length - completedCount;
      const daysLeft = daysUntil(checkInPhase.close);

      if (incompleteCount > 0) {
        return res.json({
          type: 'checkin_pending',
          urgency: daysLeft <= 3 ? 'high' : 'medium',
          message: `${quarter} check-in is open. ${incompleteCount} goal${incompleteCount !== 1 ? 's' : ''} need an update.`,
          cta: `Update ${quarter} Progress`,
          ctaRoute: '/employee/checkin',
          daysLeft,
          detail: `Window closes ${new Date(checkInPhase.close).toLocaleDateString()}`
        });
      }
    }

    // Priority 5 — All clear
    const nextPhase = phases.find(p => p.open && p.open > todayStr);
    const nextOpensIn = nextPhase ? daysUntil(nextPhase.open) : null;
    return res.json({
      type: 'all_clear',
      urgency: 'none',
      message: "You're all caught up. Nothing pending right now.",
      cta: null,
      detail: nextOpensIn ? `Next window opens in ${nextOpensIn} day${nextOpensIn !== 1 ? 's' : ''}` : null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/employee/nudge-manager
router.post('/nudge-manager', requireAuth, (req, res) => {
  try {
    const userId = req.user.userId;
    const activeCycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1').get();
    const sheet = db.prepare('SELECT * FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?').get(userId, activeCycle.id);
    if (!sheet || sheet.status !== 'submitted') return res.status(400).json({ error: 'No submitted sheet to nudge about.' });

    const employee = db.prepare('SELECT name, manager_id FROM users WHERE id = ?').get(userId);
    const manager = db.prepare('SELECT email, name FROM users WHERE id = ?').get(employee.manager_id);

    const submittedAt = sheet.submitted_at ? new Date(sheet.submitted_at + 'Z') : new Date();
    const daysSince = Math.floor((new Date() - submittedAt) / (1000 * 3600 * 24));

    if (manager?.email) {
      sendMail({
        to: manager.email,
        subject: `[GoalPulse] Reminder: ${employee.name}'s goal sheet is awaiting your approval`,
        text: `Hi ${manager.name},\n\n${employee.name} has been waiting ${daysSince} day${daysSince !== 1 ? 's' : ''} for their goal sheet to be approved.\n\nPlease review it in your Approval Queue at your earliest convenience.\n\n— GoalPulse`
      }).catch(console.error);
    }

    db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('sheet', ?, ?, 'employee_nudge', null, ?)")
      .run(sheet.id, userId, JSON.stringify({ waitingDays: daysSince, managerId: employee.manager_id }));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
