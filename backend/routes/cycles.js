const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { name, year, phase1_open, phase1_close, q1_open, q1_close, q2_open, q2_close, q3_open, q3_close, q4_open, q4_close } = req.body;
    db.prepare('UPDATE cycles SET is_active = 0').run();
    const insertCycle = db.prepare(`INSERT INTO cycles (name, year, phase1_open, phase1_close, q1_open, q1_close, q2_open, q2_close, q3_open, q3_close, q4_open, q4_close, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);
    const info = insertCycle.run(name, year, phase1_open, phase1_close, q1_open, q1_close, q2_open, q2_close, q3_open, q3_close, q4_open, q4_close);
    res.json({ id: info.lastInsertRowid, message: 'Cycle created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/active/window', requireAuth, (req, res) => {
  try {
    const activeCycle = db.prepare('SELECT * FROM cycles WHERE is_active = 1').get();
    if (!activeCycle) {
      return res.json({ phase: null, isOpen: false });
    }

    const now = new Date(); // In UTC, or local for demo
    
    // Check phases in order of priority (simplification for hackathon, comparing ISO strings works if dates are formatted properly)
    const phases = [
      { name: 'Phase 1', open: activeCycle.phase1_open, close: activeCycle.phase1_close },
      { name: 'Q1', open: activeCycle.q1_open, close: activeCycle.q1_close },
      { name: 'Q2', open: activeCycle.q2_open, close: activeCycle.q2_close },
      { name: 'Q3', open: activeCycle.q3_open, close: activeCycle.q3_close },
      { name: 'Q4', open: activeCycle.q4_open, close: activeCycle.q4_close },
    ];

    // Helper to format today's date for comparison YYYY-MM-DD
    const todayStr = now.toISOString().split('T')[0];
    
    let currentPhase = null;
    
    for (const p of phases) {
      if (todayStr >= p.open && todayStr <= p.close) {
        currentPhase = { phase: p.name, isOpen: true, closesAt: p.close, opensAt: p.open };
        break;
      }
    }
    
    if (!currentPhase) {
      // Find next phase
      const upcoming = phases.find(p => p.open > todayStr);
      if (upcoming) {
        currentPhase = { phase: null, isOpen: false, nextOpensAt: upcoming.open };
      } else {
        currentPhase = { phase: null, isOpen: false };
      }
    }

    res.json(currentPhase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
