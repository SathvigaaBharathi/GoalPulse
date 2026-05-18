import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';
import Login from './pages/Login';
import RoleGuard from './components/RoleGuard';
import Layout from './components/Layout';

import GoalSheet from './pages/employee/GoalSheet';
import ApprovalQueue from './pages/manager/ApprovalQueue';
import OrgManager from './pages/admin/OrgManager';
import CompletionDashboard from './pages/admin/CompletionDashboard';
import AchievementReport from './pages/admin/AchievementReport';
import AuditLog from './pages/admin/AuditLog';
import EscalationLog from './pages/admin/EscalationLog';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import CycleManager from './pages/admin/CycleManager';
import CheckIn from './pages/employee/CheckIn';
import QuickUpdatePage from './pages/employee/QuickUpdatePage';
import TeamCheckIn from './pages/manager/TeamCheckIn';
import CascadeView from './pages/shared/CascadeView';
import ReadinessDashboard from './pages/admin/ReadinessDashboard';

function App() {
  const { user } = useAuthStore();

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} 
        />
        
        <Route path="/quick-update" element={
          <RoleGuard allowedRoles={['employee']}>
            <QuickUpdatePage />
          </RoleGuard>
        } />

        {/* Protected Routes wrapped in Layout */}
        <Route element={<Layout />}>
          
          <Route path="/cascade" element={<CascadeView />} />

          <Route path="/employee/*" element={
            <RoleGuard allowedRoles={['employee']}>
              <Routes>
                <Route path="" element={<Navigate to="goals" replace />} />
                <Route path="goals" element={<GoalSheet />} />
                <Route path="checkin" element={<CheckIn />} />
              </Routes>
            </RoleGuard>
          } />
          
          <Route path="/manager/*" element={
            <RoleGuard allowedRoles={['manager']}>
              <Routes>
                <Route path="" element={<Navigate to="queue" replace />} />
                <Route path="queue" element={<ApprovalQueue />} />
                <Route path="checkin" element={<TeamCheckIn />} />
              </Routes>
            </RoleGuard>
          } />
          
          <Route path="/admin" element={<RoleGuard allowedRoles={['admin']} />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="readiness" element={<ReadinessDashboard />} />
            <Route path="org" element={<OrgManager />} />
            <Route path="dashboard" element={<CompletionDashboard />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="cycles" element={<CycleManager />} />
            <Route path="reports" element={<AchievementReport />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="escalations" element={<EscalationLog />} />
          </Route>
          
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
