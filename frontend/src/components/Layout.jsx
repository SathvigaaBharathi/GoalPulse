import { Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import RoleSwitcher from './RoleSwitcher';
import { Activity, LogOut } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
