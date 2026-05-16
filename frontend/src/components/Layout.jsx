import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import RoleSwitcher from './RoleSwitcher';
import CycleTimelineBanner from './CycleTimelineBanner';
import { Activity, LogOut, LayoutDashboard, Target, Calendar, BarChart3, ShieldCheck, AlertCircle, FileText, Settings } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="bg-primary text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Activity className="text-accent" size={24} />
              <span className="font-bold text-xl tracking-tight">GoalPulse</span>
              <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent border border-accent/30 hidden sm:inline-block">
                {user.role.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <RoleSwitcher />
              
              <div className="hidden md:flex flex-col items-end mr-4 border-r border-white/20 pr-4">
                <span className="text-sm font-medium leading-none">{user.name}</span>
                <span className="text-xs text-white/70 mt-1">{user.department || 'N/A'}</span>
              </div>
              
              <button 
                onClick={handleLogout}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 -mb-px overflow-x-auto no-scrollbar">
            {user.role === 'employee' && (
              <>
                <button onClick={() => navigate('/employee/goals')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/employee/goals') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Target size={16}/> My Strategic Goals
                </button>
                <button onClick={() => navigate('/employee/checkin')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/employee/checkin') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Calendar size={16}/> Quarterly Check-In
                </button>
              </>
            )}
            {user.role === 'manager' && (
              <>
                <button onClick={() => navigate('/manager/queue')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/manager/queue') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <ShieldCheck size={16}/> Approval Queue
                </button>
                <button onClick={() => navigate('/manager/checkin')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/manager/checkin') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Activity size={16}/> Team Pulse
                </button>
              </>
            )}
            {user.role === 'admin' && (
              <>
                <button onClick={() => navigate('/admin/dashboard')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/admin/dashboard') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <LayoutDashboard size={16}/> Health Matrix
                </button>
                <button onClick={() => navigate('/admin/analytics')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/admin/analytics') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <BarChart3 size={16}/> Intelligence
                </button>
                <button onClick={() => navigate('/admin/reports')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/admin/reports') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <FileText size={16}/> Reports
                </button>
                <button onClick={() => navigate('/admin/cycles')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/admin/cycles') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Settings size={16}/> Cycle Manager
                </button>
                <button onClick={() => navigate('/admin/org')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/admin/org') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Activity size={16}/> Org Governance
                </button>
                <button onClick={() => navigate('/admin/escalations')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/admin/escalations') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <AlertCircle size={16}/> Compliance
                </button>
                <button onClick={() => navigate('/admin/audit')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname.includes('/admin/audit') ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <ShieldCheck size={16}/> Audit Trail
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <CycleTimelineBanner />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
