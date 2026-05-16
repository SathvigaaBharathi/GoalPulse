import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import Login from './pages/Login';
import RoleGuard from './components/RoleGuard';
import Layout from './components/Layout';

// Dummy components for now to avoid errors
const EmployeeDashboard = () => <div>Employee Dashboard</div>;
const ManagerDashboard = () => <div>Manager Dashboard</div>;
const AdminDashboard = () => <div>Admin Dashboard</div>;

function App() {
  const { user } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} 
        />
        
        {/* Protected Routes wrapped in Layout */}
        <Route element={<Layout />}>
          
          <Route path="/employee/*" element={
            <RoleGuard allowedRoles={['employee']}>
              <Routes>
                <Route path="" element={<EmployeeDashboard />} />
              </Routes>
            </RoleGuard>
          } />
          
          <Route path="/manager/*" element={
            <RoleGuard allowedRoles={['manager']}>
              <Routes>
                <Route path="" element={<ManagerDashboard />} />
              </Routes>
            </RoleGuard>
          } />
          
          <Route path="/admin/*" element={
            <RoleGuard allowedRoles={['admin']}>
              <Routes>
                <Route path="" element={<AdminDashboard />} />
              </Routes>
            </RoleGuard>
          } />
          
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
