const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const Papa = require('papaparse');
const xlsx = require('xlsx');

// Achievement Report with server-side filters
router.get('/achievement', requireAuth, requireRole(['admin', 'manager']), (req, res) => {
  try {
    const { cycleId, department, quarter, status, export: exportFormat } = req.query;
    
    let query = `
      SELECT u.name as employee, g.title as goal_title, t.name as thrust_area, 
             g.uom_type, g.target_value, a.actual_value, 
             a.status, a.quarter, m.name as manager
      FROM goals g
      JOIN goal_sheets s ON g.sheet_id = s.id
      JOIN users u ON s.employee_id = u.id
      LEFT JOIN users m ON u.manager_id = m.id
      JOIN thrust_areas t ON g.thrust_area_id = t.id
      LEFT JOIN achievements a ON g.id = a.goal_id
      WHERE 1=1
    `;
    const params = [];

    if (cycleId) { query += ' AND s.cycle_id = ?'; params.push(cycleId); }
    if (department) { query += ' AND u.department = ?'; params.push(department); }
    if (quarter) { query += ' AND a.quarter = ?'; params.push(quarter); }
    if (status) { query += ' AND a.status = ?'; params.push(status); }

    const rows = db.prepare(query).all(...params);

    if (exportFormat === 'csv') {
      const csv = Papa.unparse(rows);
      res.header('Content-Type', 'text/csv');
      res.attachment('achievement_report.csv');
      return res.send(csv);
    } else if (exportFormat === 'excel') {
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Achievements");
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('achievement_report.xlsx');
      return res.send(buf);
    }

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Completion Dashboard
router.get('/completion', requireAuth, requireRole(['admin', 'manager']), (req, res) => {
  try {
    const activeCycle = db.prepare('SELECT id FROM cycles WHERE is_active = 1').get();
    
    // Get all employees
    let empQuery = "SELECT id, name FROM users WHERE role = 'employee'";
    let params = [];
    if (req.user.role === 'manager') {
      empQuery += " AND manager_id = ?";
      params.push(req.user.userId);
    }
    const employees = db.prepare(empQuery).all(...params);
    
    const results = employees.map(emp => {
      const sheet = db.prepare('SELECT * FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?').get(emp.id, activeCycle.id);
      if (!sheet) {
        return { employee: emp.name, submitted: false, approved: false, q1: false, q2: false, q3: false, q4: false };
      }
      
      const checkins = db.prepare('SELECT DISTINCT quarter FROM checkin_comments WHERE goal_sheet_id = ?').all(sheet.id).map(c => c.quarter);
      
      return {
        employee: emp.name,
        submitted: ['submitted', 'approved'].includes(sheet.status),
        approved: sheet.status === 'approved',
        q1: checkins.includes('Q1'),
        q2: checkins.includes('Q2'),
        q3: checkins.includes('Q3'),
        q4: checkins.includes('Q4')
      };
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
