CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT CHECK(role IN ('employee','manager','admin')),
  manager_id INTEGER,
  department TEXT,
  azure_oid TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  year TEXT,
  phase1_open DATE,
  phase1_close DATE,
  q1_open DATE,
  q1_close DATE,
  q2_open DATE,
  q2_close DATE,
  q3_open DATE,
  q3_close DATE,
  q4_open DATE,
  q4_close DATE,
  is_active INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS thrust_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS goal_sheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER,
  cycle_id INTEGER,
  status TEXT CHECK(status IN ('draft','submitted','approved','rework')),
  submitted_at DATETIME,
  approved_at DATETIME,
  approved_by INTEGER,
  FOREIGN KEY(employee_id) REFERENCES users(id),
  FOREIGN KEY(cycle_id) REFERENCES cycles(id),
  FOREIGN KEY(approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_id INTEGER,
  thrust_area_id INTEGER,
  title TEXT,
  description TEXT,
  uom_type TEXT CHECK(uom_type IN ('min_numeric','max_numeric','min_percent','max_percent','timeline','zero')),
  target_value NUMERIC,
  target_date DATE,
  weightage INTEGER,
  is_shared INTEGER DEFAULT 0,
  shared_from_goal_id INTEGER,
  is_locked INTEGER DEFAULT 0,
  parent_goal_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sheet_id) REFERENCES goal_sheets(id),
  FOREIGN KEY(thrust_area_id) REFERENCES thrust_areas(id),
  FOREIGN KEY(shared_from_goal_id) REFERENCES goals(id),
  FOREIGN KEY(parent_goal_id) REFERENCES goals(id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER,
  quarter TEXT CHECK(quarter IN ('Q1','Q2','Q3','Q4')),
  actual_value NUMERIC,
  actual_date DATE,
  status TEXT CHECK(status IN ('not_started','on_track','completed')),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(goal_id) REFERENCES goals(id)
);

CREATE TABLE IF NOT EXISTS checkin_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_sheet_id INTEGER,
  manager_id INTEGER,
  quarter TEXT,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(goal_sheet_id) REFERENCES goal_sheets(id),
  FOREIGN KEY(manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT,
  entity_id INTEGER,
  changed_by INTEGER,
  change_type TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(changed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS escalation_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_type TEXT CHECK(rule_type IN ('goal_not_submitted','goal_not_approved','checkin_not_done')),
  threshold_days INTEGER,
  is_active INTEGER DEFAULT 1,
  created_by INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS escalation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER,
  target_user_id INTEGER,
  target_entity_id INTEGER,
  entity_type TEXT CHECK(entity_type IN ('goal_sheet','checkin')),
  escalation_level INTEGER,
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  is_resolved INTEGER DEFAULT 0,
  FOREIGN KEY(rule_id) REFERENCES escalation_rules(id),
  FOREIGN KEY(target_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

