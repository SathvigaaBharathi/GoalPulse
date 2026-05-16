# GoalPulse — AI Agent Build Prompt
### AtomQuest Hackathon 1.0 | Goal Setting & Tracking Portal

---

## 🎯 PROJECT IDENTITY

**App Name:** GoalPulse
**Tagline:** *Set it. Track it. Own it.*
**Color Palette:**
- Primary: `#1E3A5F` (Deep Navy — trust, structure)
- Accent: `#00C2A8` (Teal — progress, energy)
- Success: `#22C55E` (Green)
- Warning: `#F59E0B` (Amber)
- Danger: `#EF4444` (Red)
- Background: `#F8FAFC` (Off-white)
- Surface: `#FFFFFF`
- Muted Text: `#64748B`

Use a clean sans-serif font (Inter or system-ui). No gradients except subtle ones on cards. Keep UI minimal, data-dense but not cluttered.

---

## 🧱 TECH STACK (Recommended)

- **Frontend:** React + Vite + Tailwind CSS + Recharts (analytics charts)
- **Backend:** Node.js + Express (or Next.js API routes if preferred)
- **Database:** PostgreSQL (via Supabase for free tier + auth) OR SQLite for local-first simplicity
- **Auth:** Supabase Auth (JWT-based, supports role claims) — skip Azure SSO for now unless time allows
- **Email:** Nodemailer + Ethereal Email (free fake SMTP for demo) — no paid service
- **Scheduling:** node-cron (reminders + escalation checks)
- **Hosting:** Vercel (frontend) + Railway or Render (backend) — both free tier
- **Export:** `xlsx` or `papaparse` npm library for CSV/Excel exports
- **Version Control:** GitHub

> Cost optimization note: Use Supabase free tier (500MB DB, 50k auth users), Vercel free tier for frontend, Railway Starter for backend. Zero infrastructure cost for demo scale.

---

## 📁 PROJECT STRUCTURE

```
goalpulse/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── employee/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── GoalSheet.jsx
│   │   │   │   └── CheckIn.jsx
│   │   │   ├── manager/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── ApprovalQueue.jsx
│   │   │   │   └── TeamCheckIn.jsx
│   │   │   └── admin/
│   │   │       ├── Dashboard.jsx
│   │   │       ├── CycleManager.jsx
│   │   │       ├── OrgManager.jsx
│   │   │       ├── AuditLog.jsx
│   │   │       ├── EscalationLog.jsx   # Phase 5
│   │   │       └── Analytics.jsx       # Phase 6
│   │   ├── components/
│   │   │   ├── GoalCard.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── WeightageValidator.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── RoleGuard.jsx
│   │   └── hooks/
├── backend/           # Express API
│   ├── routes/
│   │   ├── auth.js
│   │   ├── goals.js
│   │   ├── checkins.js
│   │   ├── admin.js
│   │   ├── reports.js
│   │   ├── analytics.js        # Phase 6
│   │   └── escalations.js      # Phase 5
│   ├── middleware/
│   │   ├── auth.js             # JWT verification + role check
│   │   └── audit.js            # Auto-log changes post-lock
│   ├── notifications/
│   │   ├── mailer.js           # Nodemailer utility (Phase 4)
│   │   └── templates.js        # Email body templates
│   ├── jobs/
│   │   └── cron.js             # node-cron: reminders + escalations (Phase 4+5)
│   └── db/
│       ├── schema.sql
│       └── seed.sql            # Demo data for 3 roles
└── README.md
```

---

## 🗃️ DATABASE SCHEMA (Build exactly this)

```sql
-- Users
users (id, name, email, role ENUM('employee','manager','admin'), manager_id FK, department, created_at)

-- Goal Cycles
cycles (
  id, name, year,
  phase1_open DATE,   -- Goal setting window opens
  phase1_close DATE,  -- Goal setting window closes (before Q1 open)
  q1_open DATE,       -- Q1 check-in window opens
  q1_close DATE,
  q2_open DATE,
  q2_close DATE,
  q3_open DATE,
  q3_close DATE,
  q4_open DATE,
  q4_close DATE,
  is_active BOOL
)
-- NOTE: Seed the active cycle with EXACT dates from the problem statement:
-- phase1_open  = '2025-05-01',  phase1_close = '2025-06-30'
-- q1_open      = '2025-07-01',  q1_close     = '2025-08-31'
-- q2_open      = '2025-10-01',  q2_close     = '2025-11-30'
-- q3_open      = '2026-01-01',  q3_close     = '2026-02-28'
-- q4_open      = '2026-03-01',  q4_close     = '2026-04-30'

-- Thrust Areas (configurable by Admin)
thrust_areas (id, name, description)

-- Goal Sheets (one per employee per cycle)
goal_sheets (id, employee_id FK, cycle_id FK, status ENUM('draft','submitted','approved','rework'), submitted_at, approved_at, approved_by FK)

-- Goals (line items within a sheet)
goals (
  id, sheet_id FK, thrust_area_id FK,
  title, description,
  uom_type ENUM('min_numeric','max_numeric','min_percent','max_percent','timeline','zero'),
  target_value, target_date,
  weightage,
  is_shared BOOL, shared_from_goal_id FK,
  is_locked BOOL,
  created_at
)

-- Quarterly Achievements
achievements (id, goal_id FK, quarter ENUM('Q1','Q2','Q3','Q4'), actual_value, actual_date, status ENUM('not_started','on_track','completed'), updated_at)

-- Manager Check-in Comments
checkin_comments (id, goal_sheet_id FK, manager_id FK, quarter, comment, created_at)

-- Audit Log
audit_log (id, entity_type, entity_id, changed_by FK, change_type, old_value JSONB, new_value JSONB, changed_at)
```

---

## 🔐 PHASE 0 — AUTH & ROLE SYSTEM

**Build first. Everything else depends on this.**

1. Implement login page with email + password. No registration flow needed — seed users via SQL.
2. JWT token must carry `{ userId, role, managerId }` payload.
3. Build a `RoleGuard` component — wraps any route and redirects if role doesn't match.
4. Seed exactly 3 demo users:
   - `employee@goalpulse.demo` / `Demo@123` → role: employee, reports to manager
   - `manager@goalpulse.demo` / `Demo@123` → role: manager
   - `admin@goalpulse.demo` / `Demo@123` → role: admin
5. Add a **role-switcher pill** in the top navbar for demo convenience — visible only in demo mode (env flag). This lets evaluators switch roles without logging out. This is a novelty UX touch for the hackathon demo.

**Git commit after this phase: `feat: auth system with role-based routing and demo switcher`**

---

## 📝 PHASE 1 — GOAL CREATION & APPROVAL

### Employee: Goal Sheet

1. Employee sees their current cycle's goal sheet. If none exists, show "Start Goal Sheet" CTA.
2. Goal creation form:
   - Thrust Area (dropdown, seeded with 5-6 areas: Revenue Growth, Cost Reduction, Customer Experience, People & Culture, Operational Excellence, Compliance & Risk)
   - Goal Title (text, required)
   - Description (textarea, optional)
   - UoM Type (dropdown: Numeric ↑, Numeric ↓, % ↑, % ↓, Timeline, Zero-based)
   - Target Value (number or date based on UoM)
   - Weightage (number, 10–100)
3. **Weightage validation (enforce strictly):**
   - Real-time running total shown as a horizontal bar (e.g., "78% of 100% allocated")
   - Cannot submit if total ≠ 100%
   - Cannot add goal if it would drop below 10% for any existing goal
   - Max 8 goals — disable "Add Goal" button at 8, show tooltip
4. On submit → sheet status changes to `submitted`. Goals become read-only for employee.
5. Show "Submitted — Awaiting Manager Approval" banner.

### Shared Goals

6. When Admin/Manager pushes a shared goal, employee sees it pre-populated on their sheet with a "Shared" badge.
7. Employee can only edit the weightage field on shared goals. Title, target, UoM are locked (grayed out, not disabled — still readable).
8. Shared goal achievements entered by the primary owner auto-sync. Recipient's sheet shows the synced value with a "Synced from [Owner Name]" tooltip.

### Manager: Approval Queue

9. Manager sees a list of all direct reports with pending goal sheets.
10. Clicking a report opens their full goal sheet in a side panel or dedicated page.
11. Manager can:
    - Approve the sheet → all goals lock
    - Return for Rework with a written reason → employee notified, can re-edit
    - Inline-edit Target Value or Weightage for any goal (with audit trail auto-generated)
12. On approval, set `is_locked = true` on all goals, set sheet status to `approved`.

### Admin: Shared Goal Push

13. Admin can select a goal template → choose a thrust area, title, target → multi-select employees → push. This creates shared goal rows on each recipient's sheet.
14. Admin can unlock any individual goal (bypasses lock):
    - Admin clicks "Unlock Goal" on any locked goal → a modal asks for a written reason.
    - On confirm: set `is_locked = false` on that goal, write an audit_log entry with `change_type = 'admin_unlock'`, `changed_by = adminId`, `old_value = { is_locked: true }`, `new_value = { is_locked: false, reason: '...' }`.
    - Goal becomes editable by the employee for that session. On next manager approval it re-locks.
    - The unlock reason must be visible in the Audit Log view.

**Git commit after Phase 1: `feat: goal creation, weightage validation, approval workflow, shared goals`**

---

## 📊 PHASE 2 — ACHIEVEMENT TRACKING & CHECK-INS

### Employee: Quarterly Updates

1. **Window enforcement is calendar-driven.** On every page load, the backend calls a `getCurrentWindow(cycleId)` helper that compares `new Date()` against the cycle's open/close dates and returns `{ phase: 'Q2', isOpen: true, closesAt: '2025-11-30' }` or `{ phase: null, isOpen: false }`. The frontend receives this in a `/api/cycles/active/window` endpoint called once at app boot and cached in context.
   - If `isOpen = false`: all achievement input fields render as read-only with a banner "Check-in window is currently closed. Next window opens [date]."
   - If `isOpen = true`: inputs are editable and the Cycle Timeline Banner shows the countdown.
   - **Never rely on frontend date logic alone** — the backend must validate the window on every achievement POST/PUT and reject with HTTP 403 if outside the window.
2. During an active check-in window, employee sees their locked goals with an "Update Achievement" panel per goal.
2. Per goal, employee enters:
   - Actual Value (number/date based on UoM)
   - Status: Not Started / On Track / Completed (radio buttons with color indicators)
3. System auto-calculates progress score per goal on save:
   - **Numeric ↑ / % ↑ (Min):** `(Actual / Target) × 100` capped at 150%
   - **Numeric ↓ / % ↓ (Max):** `(Target / Actual) × 100` capped at 150%
   - **Timeline:** if completed on or before deadline → 100%, else proportional based on overdue days
   - **Zero-based:** if actual = 0 → 100%, else 0%
4. Show a visual progress ring or bar per goal after entry.
5. Show weighted average progress score for the full sheet (for tracking, clearly labeled "Not a rating").

### Manager: Check-in Module

6. Manager sees each direct report's Q1/Q2/Q3/Q4 achievement data in a table:
   - Columns: Goal Title | Target | Actual | Status | Score
7. After reviewing, manager adds a structured Check-in Comment (textarea, required to "Mark Check-in Complete").
8. Check-in completion is tracked — manager cannot mark complete without commenting.

**Git commit after Phase 2: `feat: quarterly achievement tracking, progress score engine, manager check-in module`**

---

## 📋 PHASE 3 — REPORTING & GOVERNANCE

### Achievement Report

1. Admin/Manager can export an Achievement Report:
   - Filters: Cycle, Department, Quarter, Status
   - These filters must be wired as query params on `GET /api/reports/achievement?cycleId=&department=&quarter=&status=`. The backend SQL query must apply all four as WHERE clauses — do not filter in JavaScript after fetching all rows.
   - Columns: Employee, Goal Title, Thrust Area, UoM, Target, Actual, Score, Status, Manager
   - Export as CSV and Excel (.xlsx)
2. Use `xlsx` npm package for Excel export. Stream the file, do not build in-memory for large sets.

### Completion Dashboard

3. Admin sees a real-time table:
   - Rows: Employees
   - Columns: Goal Sheet Submitted | Approved | Q1 Check-in | Q2 | Q3 | Q4
   - Color-coded: Green = Done, Amber = Pending, Red = Overdue (based on cycle window dates)
4. Add a summary row at the top: "X of Y employees have completed Q2 check-ins"

### Audit Trail

5. Every change to a locked goal must be auto-logged via the `audit.js` middleware:
   - Triggered on any PATCH/PUT to `/goals/:id` when `is_locked = true`
   - Log: entity_id, changed_by, old JSON, new JSON, timestamp
6. Admin sees paginated audit log table with filters by date, user, goal.

**Git commit after Phase 3: `feat: achievement report export, completion dashboard, audit trail`**

---

## 📧 PHASE 4 — EMAIL NOTIFICATIONS (Good-to-Have §5.2 partial)

Use **Nodemailer** with a free SMTP provider (Gmail app password or Ethereal Email for demo/testing). Do not use SendGrid or any paid service.

Add a `notifications/` folder in the backend with a `mailer.js` utility and individual template functions.

### Trigger → Recipient → Content

| Event | Recipient | Subject | Body (plain text) |
|---|---|---|---|
| Goal sheet submitted | Manager | `[GoalPulse] [Employee Name] has submitted goals for review` | Employee name, number of goals, link to approval queue |
| Goal sheet approved | Employee | `[GoalPulse] Your goals have been approved` | Manager name, cycle name, reminder that goals are now locked |
| Goal sheet returned for rework | Employee | `[GoalPulse] Your goals need revision` | Manager's rework reason verbatim, link to goal sheet |
| Check-in window opens | All employees in cycle | `[GoalPulse] Q[N] Check-in window is now open` | Window open/close dates, link to achievement entry page |
| Check-in window closing soon (3 days before close) | Employees who haven't submitted | `[GoalPulse] Reminder: Q[N] Check-in closes in 3 days` | Close date, link |

### Implementation rules
- All email sending is **fire-and-forget** (`mailer.sendMail(...).catch(console.error)`) — never block an API response waiting for email.
- In development/demo mode, log the email content to console instead of sending (controlled by `EMAIL_ENABLED=true/false` env var). This ensures demo works even without SMTP config.
- The 3-day reminder requires a scheduled job. Use `node-cron` running daily at 08:00 to check upcoming window close dates and send reminders to employees with no achievement entry for the current quarter.
- Add email fields to the `users` table if not already present.
- Do NOT build an email preference/unsubscribe system — out of scope.

**Git commit: `feat: email notifications for goal events and check-in reminders`**

---

## 🚨 PHASE 5 — ESCALATION MODULE (Good-to-Have §5.3)

Add an `escalations/` folder in the backend. Escalation rules run via `node-cron` daily at 09:00.

### Schema additions

```sql
-- Escalation Rules (configurable by Admin)
escalation_rules (
  id, rule_type ENUM('goal_not_submitted','goal_not_approved','checkin_not_done'),
  threshold_days INT,       -- e.g. 7 = trigger after 7 days of inaction
  is_active BOOL,
  created_by FK, updated_at
)

-- Escalation Log
escalation_log (
  id, rule_id FK, target_user_id FK, target_entity_id,
  entity_type ENUM('goal_sheet','checkin'),
  escalation_level INT,     -- 1 = notify employee, 2 = notify manager, 3 = notify HR/admin
  triggered_at, resolved_at, is_resolved BOOL
)
```

### Three built-in rule types

**Rule 1 — Goal not submitted after cycle opens**
- Trigger: employee has no submitted goal sheet N days after `phase1_open`
- Level 1 (day N): email to employee — "Your goal sheet is overdue. Please submit by [date]."
- Level 2 (day N+3): email to manager — "[Employee] has not submitted goals. Please follow up."
- Level 3 (day N+7): email to Admin/HR — "Escalation: [Employee] goal sheet still not submitted."

**Rule 2 — Goal sheet not approved after submission**
- Trigger: submitted goal sheet sits unreviewed for N days
- Level 1: email to manager — "You have a pending goal sheet from [Employee] awaiting approval."
- Level 2: email to Admin/HR — "Manager [Name] has not approved [Employee]'s goals after N days."

**Rule 3 — Check-in not completed within window**
- Trigger: check-in window is open and employee has made no achievement entry after N days
- Level 1: email to employee — "Q[N] check-in is open. Please log your progress."
- Level 2: email to manager — "[Employee] has not completed Q[N] check-in."

### Admin UI for Escalation
- Admin can view and configure each rule: toggle active/inactive, set threshold_days.
- Admin sees the Escalation Log table: columns — Employee, Rule Type, Level Reached, Triggered At, Resolved.
- An escalation auto-resolves when the triggering condition is fixed (sheet submitted, approved, or check-in done). The cron job marks `is_resolved = true` and sets `resolved_at`.
- Add `EscalationLog.jsx` to the admin pages.

**Git commit: `feat: escalation module with configurable rules and admin log`**

---

## 📊 PHASE 6 — ANALYTICS MODULE (Good-to-Have §5.4 partial)

Build a dedicated `/analytics` page visible to Admin and Manager. Use **Recharts** (already in the React ecosystem, lightweight, no license issues).

### Four views on one page (tab-switched, not separate routes)

**Tab 1 — Quarter-on-Quarter Trends**
- Bar chart: X-axis = Q1/Q2/Q3/Q4, Y-axis = average weighted progress score (0–100%)
- One bar series per department, or toggle to per-employee for a selected individual
- Data from: `achievements` joined to `goals` joined to `goal_sheets` joined to `users`
- API: `GET /api/analytics/qoq?cycleId=&department=`

**Tab 2 — Completion Heatmap**
- Table-style heatmap: rows = employees, columns = Q1/Q2/Q3/Q4
- Cell color: green = completed check-in, amber = in-progress, red = not done, gray = window not open yet
- This is distinct from the Completion Dashboard (which is operational) — the heatmap is a visual summary for trend-spotting
- API: `GET /api/analytics/completion-heatmap?cycleId=`

**Tab 3 — Goal Distribution**
- Two small donut charts side-by-side:
  - Left: breakdown by Thrust Area (what % of all goals fall in each area)
  - Right: breakdown by UoM type (Numeric, %, Timeline, Zero-based)
- API: `GET /api/analytics/distribution?cycleId=`

**Tab 4 — Manager Effectiveness**
- Table: rows = managers, columns = Team Size | Goals Approved (%) | Q1 Check-ins Done (%) | Q2 Check-ins Done (%) | Avg Team Score
- Sortable by any column
- API: `GET /api/analytics/manager-effectiveness?cycleId=`

### Implementation rules
- All analytics queries run server-side SQL aggregations — never pull raw rows to the frontend and aggregate in JS.
- Every chart has a loading skeleton and an empty state ("No data yet for this quarter").
- Charts are read-only — no click-through needed for the hackathon demo.
- Do not add more than these 4 views. Keep it focused.

**Git commit: `feat: analytics module — QoQ trends, heatmap, distribution, manager effectiveness`**

---

## ✨ NOVELTY FEATURES (Build these — differentiators)

These go beyond the problem statement and will score bonus points:

### 1. Pulse Score Card (Novel UX)
- On employee dashboard, show a single "Pulse Score" — a weighted average progress across all active goals for the current quarter.
- Displayed as a large circular gauge (SVG or CSS). Color: green >80%, amber 50–80%, red <50%.
- Tagline beneath it: "Your Q2 Pulse" — feels personal, not corporate.

### 2. Smart Weightage Suggester (AI Touch — Optional if time permits)
- When an employee adds their first few goals, show a subtle "Suggest weightage distribution" button.
- This calls a backend utility that distributes remaining weightage evenly with a 10% floor, rounded to nearest 5.
- No LLM needed — pure algorithmic. But feels smart.

### 3. Goal Health Indicator (Novelty)
- Each goal card shows a small colored dot + label:
  - 🟢 Healthy — On Track, score ≥ 80%
  - 🟡 At Risk — On Track but score 50–80%
  - 🔴 Off Track — status not updated this quarter OR score < 50%
  - ⚪ Not Started
- Manager dashboard sorts by health — "At Risk" employees surface first.

### 4. Check-in Streak (Gamification — subtle)
- Employee profile shows "Check-in streak: 3 quarters in a row ✅"
- Purely cosmetic, but gives employees a sense of accountability ownership.

### 5. Cycle Timeline Banner
- A persistent slim banner at the top of all role dashboards showing:
  `"📅 Q2 Check-in window is open until 31 Oct. 4 days remaining."`
- Auto-computes from cycle dates. Disappears when window closes. Turns amber in last 7 days.

---

## ❌ WHAT NOT TO BUILD

- Do NOT build a performance rating system — this is tracking only, no appraisal scores
- Do NOT build a chat/messaging module between employees and managers
- Do NOT build user registration flows — use seeded credentials only for demo
- Do NOT build mobile apps — web browser only
- Do NOT implement Azure SSO unless everything else is complete and you have spare time
- Do NOT use heavy charting libraries just for decoration — every chart must show meaningful data
- Do NOT add animations/transitions beyond subtle hover effects — keep it fast
- Do NOT paginate with infinite scroll — standard pagination is fine and simpler
- Do NOT build a notification bell system — it's a distraction from core functionality
- Do NOT use any paid APIs or services that require billing

---

## 🚀 GIT COMMIT STRATEGY

Push after every logical unit. Suggested commit history:

```
git commit -m "init: project scaffold, folder structure, Tailwind config"
git commit -m "feat: database schema and seed data"
git commit -m "feat: auth system with JWT, role-based routing, demo switcher"
git commit -m "feat: employee goal sheet — create, validate, submit"
git commit -m "feat: weightage validation engine with real-time bar"
git commit -m "feat: manager approval queue with inline editing"
git commit -m "feat: shared goals — push, sync, read-only fields"
git commit -m "feat: quarterly achievement entry and progress score engine"
git commit -m "feat: window enforcement — calendar-driven open/close with backend guard"
git commit -m "feat: manager check-in module with comment enforcement"
git commit -m "feat: admin completion dashboard with color-coded status"
git commit -m "feat: achievement report with CSV and Excel export and server-side filters"
git commit -m "feat: audit trail middleware and admin log view with unlock reason"
git commit -m "feat: email notifications for goal events and check-in reminders"
git commit -m "feat: escalation module with configurable rules, cron job, and admin log"
git commit -m "feat: analytics module — QoQ trends, heatmap, distribution, manager effectiveness"
git commit -m "feat: pulse score card and goal health indicators"
git commit -m "feat: cycle timeline banner with live countdown"
git commit -m "fix: edge cases — zero-division in score, overdue timeline calc, shared goal weight validation"
git commit -m "chore: env config, README, architecture diagram"
git commit -m "chore: seed 3 demo roles with full Q1 data and escalation demo entries"
```

**Push to `main` after every commit. Do not batch commits. Each commit should be a working, non-broken state.**

---

## 🧪 DEMO DATA TO SEED

Seed the database so evaluators can immediately see a rich demo:

- 1 Admin user, 1 Manager, 3 Employees (manager has all 3 as direct reports)
- Current cycle: "FY 2025-26" with exact dates seeded — Q2 window is open (Oct 1–Nov 30)
- Each employee has 5 goals, all approved, Q1 achievements already logged
- Manager has completed Q1 check-ins for 2 of 3 employees (1 pending — shows dashboard value)
- 1 shared goal across all 3 employees (shows sync behavior)
- 2 audit log entries showing post-lock edits by manager (one with unlock reason visible)
- 1 active escalation entry: Employee 3 has not submitted Q2 check-in (shows escalation log)
- Escalation rules seeded: all 3 rule types active, threshold = 7 days
- Analytics seed: Q1 achievement data populated for all employees across all 4 UoM types so charts render meaningfully on first load

---

## 🔍 EDGE CASES TO HANDLE

- Weightage update on a shared goal must not break the 100% total
- If an employee has a shared goal with weight X and tries to add a new goal — validate remaining weight
- If a check-in window is closed, achievement entry fields must be read-only AND the backend must reject POST/PUT with HTTP 403
- Zero-based UoM: actual = 0 is a valid success state, not a null/empty entry — validate specifically
- Timeline UoM: if target_date is null, disable timeline score computation and show "N/A"
- Audit log must fire even when admin uses the "unlock + edit" flow — include the unlock reason in old_value
- Email: if SMTP is not configured, fall back to console.log — never throw an unhandled error that breaks the API
- Escalation cron: if an escalation is already at level 3 and still unresolved, do not create a duplicate level 3 entry — only one entry per level per entity
- Analytics: if a quarter has zero achievements logged, show 0% bar not a missing bar — empty state must still render
- Window enforcement: system date comparison must use UTC to avoid timezone-driven off-by-one on window open/close days

---

## 📐 ARCHITECTURE DIAGRAM NOTES

Include a simple diagram (draw.io or plain image) showing:
```
[Browser] → [React Frontend / Vercel]
               ↓ REST API
           [Express Backend / Railway]
               ├── routes/  (goals, checkins, reports, analytics, escalations)
               ├── jobs/    (node-cron: reminders + escalation checks)
               ├── notifications/ (Nodemailer → Ethereal SMTP)
               └──────────────────────────────
                          ↓
                  [PostgreSQL / Supabase]
```
Label: "All free-tier hosted. Zero infra cost for demo. Scales to 1000 users on paid tier."

---

## ✅ DEFINITION OF DONE

Before submitting, verify:

- [ ] Employee can create goals, validate weightage, submit sheet
- [ ] Manager can approve, return for rework, inline-edit
- [ ] Shared goal syncs achievement from owner to recipients
- [ ] Quarterly achievement can be logged during open window only (backend rejects outside window)
- [ ] Check-in window enforcement uses exact cycle dates from seed, not hardcoded logic
- [ ] Progress scores compute correctly for all 4 UoM types
- [ ] Manager can complete check-in with comment
- [ ] Admin can view completion dashboard
- [ ] Admin unlock flow writes audit log entry with reason
- [ ] CSV/Excel export works with all 4 server-side filters applied
- [ ] Audit log captures post-lock edits and unlock actions with reasons
- [ ] Email notification fires (or logs to console) on goal submission and approval
- [ ] Escalation log shows at least one seeded escalation entry in admin view
- [ ] Analytics page renders all 4 tabs with real data from seed
- [ ] Demo role-switcher works without re-login
- [ ] All 3 role journeys are completable end-to-end without errors
- [ ] README has setup instructions, demo credentials, and EMAIL_ENABLED env var note

**Novelty + UX**
- [ ] Pulse Score Card renders with correct weighted average and correct color (green/amber/red)
- [ ] Goal Health Indicator shows on every goal card for employee and manager views
- [ ] Cycle Timeline Banner shows correct window name and days remaining; turns amber at 7 days left
- [ ] Check-in Streak counter shows on employee dashboard
- [ ] Smart Weightage Suggester button distributes remaining weight with 10% floor

**Submission readiness**
- [ ] Seed data requires zero manual interaction — all features demonstrable on first login
- [ ] Architecture diagram committed to `/docs/architecture.png` in the repo
- [ ] Git history has meaningful incremental commits, not one giant initial commit
- [ ] All env vars documented in `.env.example` at repo root
