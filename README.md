# GoalPulse

GoalPulse is a full-stack goal setting and tracking portal built for a hackathon. It allows organizations to manage objective-driven check-ins dynamically throughout performance cycles.

## Features
- **Role-Based Access Control**: Admin, Manager, and Employee dashboards.
- **Dynamic Goal Sheets**: Configurable measurement types (timeline, percentages, numeric).
- **Approval Workflow**: Managers review, rework, or approve goal sheets.
- **Strict Window Enforcement**: Calendar-driven check-in phases restricting inputs.
- **Escalation Rules**: Configurable multi-level automated escalations for missed deadlines.
- **Reporting & Analytics**: Real-time completion matrix, distribution charts, and Excel/CSV export.
- **Audit Logs**: Traceability of all edits to locked goals.

## Architecture
See `/docs/architecture.png` for a high-level system diagram.

- **Frontend**: React (Vite), TailwindCSS, Zustand, Recharts, Lucide React.
- **Backend**: Node.js, Express, better-sqlite3, JWT Authentication, node-cron, nodemailer.

## Quick Start (Demo Mode)

### Prerequisites
- Node.js v18+

### 1. Setup Backend
```bash
cd backend
npm install
npm run seed  # Generates DB and pre-populates demo users, cycle, and goals
npm run dev
```
The backend will run on `http://localhost:5000`.

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

### 3. Demo Roles
You can easily switch roles using the **Role Switcher** widget located in the top navigation bar. The following demo accounts are available:
- `admin@goalpulse.demo` (Admin)
- `manager@goalpulse.demo` (Manager)
- `alice@goalpulse.demo` (Employee)

### 4. Development Tools
- **Cron Jobs**: Run the daily chron job instantly via the **Developer Tools** section in the Admin's Org Manager page to test email notifications and escalations.

## Phases Completed
1. Goal Creation & Approval
2. Achievement Tracking & Check-ins
3. Reporting & Governance
4. Email Notifications
5. Escalation Module
6. Analytics Module
