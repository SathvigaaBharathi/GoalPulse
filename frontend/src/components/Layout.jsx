import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import RoleSwitcher from './RoleSwitcher';
import CycleTimelineBanner from './CycleTimelineBanner';
import { Activity, LogOut, LayoutDashboard, Target, Calendar, BarChart3, ShieldCheck, AlertCircle, FileText, Settings, Network, Zap, Bell, Check } from 'lucide-react';
import axios from 'axios';

const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('goalpulse_token');
      if (!token) return;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/goals/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out read notifications
      setNotifications(res.data.filter(n => !n.is_read));
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleDismissNotif = async (id) => {
    try {
      const token = localStorage.getItem('goalpulse_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/goals/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Dispatch custom event to sync with other notification-displaying components
      window.dispatchEvent(new Event('notification-dismissed'));
    } catch (err) {
      console.error('Failed to dismiss notification', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);

    const handleDismissEvent = () => {
      fetchNotifications();
    };
    window.addEventListener('notification-dismissed', handleDismissEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notification-dismissed', handleDismissEvent);
    };
  }, [user.role]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
              
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors relative"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                      {notifications.length}
                    </span>
                  )}
                </button>
                
                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <span className="font-bold text-sm text-slate-700">Notifications</span>
                      {notifications.length > 0 && (
                        <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded font-semibold">
                          {notifications.length} New
                        </span>
                      )}
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                          <p className="text-sm">All caught up! 🎉</p>
                          <p className="text-xs text-slate-400 mt-1 font-normal">No new in-app alerts.</p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          let dotColor = 'bg-slate-400';
                          if (n.type === 'nudge') dotColor = 'bg-rose-500';
                          else if (n.type === 'goal_submitted') dotColor = 'bg-blue-500';
                          else if (n.type === 'goal_approved') dotColor = 'bg-emerald-500';
                          else if (n.type === 'goal_rework') dotColor = 'bg-amber-500';
                          else if (n.type === 'shared_goal') dotColor = 'bg-purple-500';
                          else if (n.type === 'escalation') dotColor = 'bg-red-500';
                          
                          return (
                            <div key={n.id} className="p-3 hover:bg-slate-50/50 flex gap-3 items-start transition-colors">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                              <div className="flex-1 text-left">
                                <p className="text-xs font-semibold text-slate-700 leading-normal">{n.message}</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-normal">
                                  {n.created_at ? new Date(n.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDismissNotif(n.id)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
                                title="Dismiss"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

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
            <button onClick={() => navigate('/cascade')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname === '/cascade' ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
              <Network size={16}/> Goal Tree
            </button>
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
                <button onClick={() => navigate('/admin/readiness')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname === '/admin/readiness' ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Zap size={16}/> Org Readiness
                </button>
                <button onClick={() => navigate('/admin/dashboard')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname === '/admin/dashboard' ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <LayoutDashboard size={16}/> Health Matrix
                </button>
                <button onClick={() => navigate('/admin/analytics')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname === '/admin/analytics' ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <BarChart3 size={16}/> Intelligence
                </button>
                <button onClick={() => navigate('/admin/reports')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname === '/admin/reports' ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <FileText size={16}/> Reports
                </button>
                <button onClick={() => navigate('/admin/cycles')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname === '/admin/cycles' ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Settings size={16}/> Cycle Manager
                </button>
                <button onClick={() => navigate('/admin/org')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname === '/admin/org' ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Activity size={16}/> Org Governance
                </button>
                <button onClick={() => navigate('/admin/escalations')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname === '/admin/escalations' ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
                  <AlertCircle size={16}/> Compliance
                </button>
                <button onClick={() => navigate('/admin/audit')} className={`nav-item flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all ${location.pathname === '/admin/audit' ? 'text-accent active' : 'text-slate-500 hover:text-slate-700'}`}>
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
