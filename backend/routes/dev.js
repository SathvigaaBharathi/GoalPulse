const express = require('express');
const router = express.Router();
const { runDailyJobs } = require('../jobs/cron');
const { requireAuth, requireRole } = require('../middleware/auth');

// Dev-only endpoint to trigger cron jobs
router.post('/trigger-cron', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    await runDailyJobs();
    res.json({ success: true, message: 'Cron jobs executed successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
