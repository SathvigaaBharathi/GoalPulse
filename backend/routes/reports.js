const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const Papa = require('papaparse');
const xlsx = require('xlsx');

// Achievement Report with server-side filters
router.get('/achievement', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
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
      const disclaimer = "# IMPORTANT: Progress scores in this report are tracking indicators only. They do not constitute performance ratings or appraisal scores.\n";
      res.header('Content-Type', 'text/csv');
      res.attachment('achievement_report.csv');
      return res.send(disclaimer + csv);
    } else if (exportFormat === 'excel') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Achievements');

      // Add Disclaimer Row
      sheet.mergeCells('A1:I1');
      const disclaimerRow = sheet.getRow(1);
      disclaimerRow.getCell(1).value = 'IMPORTANT: Progress scores in this report are tracking indicators only. They do not constitute performance ratings or appraisal scores.';
      disclaimerRow.getCell(1).font = { italic: true, color: { argb: 'FF666666' }, size: 10 };
      disclaimerRow.getCell(1).alignment = { horizontal: 'center' };
      disclaimerRow.height = 30;

      sheet.columns = [
        { header: 'Employee', key: 'employee', width: 25 },
        { header: 'Goal Title', key: 'goal_title', width: 40 },
        { header: 'Thrust Area', key: 'thrust_area', width: 25 },
        { header: 'Type', key: 'uom_type', width: 15 },
        { header: 'Target', key: 'target_value', width: 15 },
        { header: 'Actual', key: 'actual_value', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Quarter', key: 'quarter', width: 12 },
        { header: 'Manager', key: 'manager', width: 25 },
      ];

      // Style header (now on row 2)
      sheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF152A46' } };
      sheet.getRow(2).alignment = { vertical: 'middle', horizontal: 'center' };

      // Add rows starting from row 3
      rows.forEach(row => {
        const rowRef = sheet.addRow(row);
        const statusCell = rowRef.getCell('status');
        if (row.status === 'completed') {
          statusCell.font = { color: { argb: 'FF1B9E4B' }, bold: true };
        } else if (row.status === 'on_track') {
          statusCell.font = { color: { argb: 'FFEAB308' }, bold: true };
        } else {
          statusCell.font = { color: { argb: 'FF9CA3AF' }, bold: true };
        }
      });

      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('achievement_report.xlsx');
      
      const buffer = await workbook.xlsx.writeBuffer();
      return res.send(buffer);
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
