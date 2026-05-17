const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const stmt = db.prepare('SELECT id, name, email, password, role, manager_id FROM users WHERE email = ?');
    const user = stmt.get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, managerId: user.manager_id },
      process.env.JWT_SECRET || 'supersecretjwtkey_for_hackathon_demo',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.manager_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/demo-users
// Returns seeded users for mock MSAL login selection
router.get('/demo-users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, role FROM users').all();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/sso
// Accepts an MSAL account object and returns a GoalPulse JWT
router.post('/sso', (req, res) => {
  try {
    const { localAccountId, username, idTokenClaims } = req.body;

    const isDemoMode = !process.env.AZURE_CLIENT_ID;

    let user;
    if (isDemoMode) {
      // Match mock username to seeded user
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(username);
    } else {
      // Real mode: match by Azure OID claim
      user = db.prepare('SELECT * FROM users WHERE azure_oid = ?').get(localAccountId);
      
      // Auto-provisioning if enabled and no user match found
      if (!user && process.env.AZURE_AUTO_PROVISION === 'true') {
        const role = mapAzureRoleToGoalPulseRole(idTokenClaims?.roles?.[0]);
        const result = db.prepare(
          'INSERT INTO users (name, email, role, azure_oid) VALUES (?, ?, ?, ?)'
        ).run(idTokenClaims?.name || username.split('@')[0], username, role, localAccountId);
        
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found in organization directory. Contact your administrator.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, managerId: user.manager_id },
      process.env.JWT_SECRET || 'supersecretjwtkey_for_hackathon_demo',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.manager_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

function mapAzureRoleToGoalPulseRole(azureRole) {
  const map = { 'Admin': 'admin', 'Manager': 'manager', 'Employee': 'employee' };
  return map[azureRole] || 'employee';
}

module.exports = router;
