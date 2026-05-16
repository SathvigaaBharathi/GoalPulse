import { UserCircle } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const RoleSwitcher = () => {
  const { user, switchRole } = useAuthStore();
  const navigate = useNavigate();

  // Hide in production if we want, but required for hackathon demo
  const isDemo = import.meta.env.VITE_DEMO_MODE !== 'false';
  
  if (!user || !isDemo) return null;

  const handleSwitch = async (e) => {
    const newRole = e.target.value;
    
    // Map role to demo email
    let email = 'employee@goalpulse.demo';
    if (newRole === 'admin') email = 'admin@goalpulse.demo';
    else if (newRole === 'manager') email = 'manager@goalpulse.demo';

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      // Automatically login with the demo password
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Demo@123' })
      });
      const data = await res.json();
      
      if (res.ok) {
        // Use the store's login method to update both user and token
        useAuthStore.getState().login(data.user, data.token);
        
        // Navigate to the new role's dashboard
        if (newRole === 'admin') navigate('/admin');
        else if (newRole === 'manager') navigate('/manager');
        else navigate('/employee');
        
        // Force reload to clear any stale state
        window.location.reload();
      } else {
        alert('Demo user not found');
      }
    } catch (err) {
      console.error('Failed to switch role', err);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
      <UserCircle size={16} className="text-white" />
      <span className="text-xs font-medium text-white mr-1">Demo View:</span>
      <select
        value={user.role}
        onChange={handleSwitch}
        className="bg-transparent text-white text-xs font-bold focus:outline-none appearance-none cursor-pointer"
        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
      >
        <option value="employee" className="text-gray-800">Employee</option>
        <option value="manager" className="text-gray-800">Manager</option>
        <option value="admin" className="text-gray-800">Admin</option>
      </select>
    </div>
  );
};

export default RoleSwitcher;
