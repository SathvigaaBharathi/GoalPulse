import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const ROLES = [
  { value: 'employee', label: 'Employee', email: 'employee@goalpulse.demo' },
  { value: 'manager',  label: 'Manager',  email: 'manager@goalpulse.demo'  },
  { value: 'admin',    label: 'Admin',    email: 'admin@goalpulse.demo'    },
];

const RoleSwitcher = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(null);

  const isDemo = import.meta.env.VITE_DEMO_MODE !== 'false';
  if (!user || !isDemo) return null;

  const handleSwitch = async (role) => {
    if (role.value === user.role || switching) return;
    setSwitching(role.value);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: role.email, password: 'Demo@123' })
      });
      const data = await res.json();

      if (res.ok) {
        useAuthStore.getState().login(data.user, data.token);
        navigate(`/${role.value}`);
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch role', err);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-1.5 py-1.5 rounded-full border border-white/20">
      <Shuffle size={13} className="text-white/60 ml-1.5 shrink-0" />
      {ROLES.map((role) => {
        const isActive = user.role === role.value;
        const isLoading = switching === role.value;
        return (
          <button
            key={role.value}
            onClick={() => handleSwitch(role)}
            disabled={isActive || !!switching}
            className={`
              px-3 py-1 rounded-full text-xs font-bold transition-all duration-200
              ${isActive
                ? 'bg-white text-primary shadow-sm cursor-default'
                : 'text-white/70 hover:text-white hover:bg-white/15 cursor-pointer'
              }
              ${isLoading ? 'opacity-60' : ''}
            `}
          >
            {isLoading ? '...' : role.label}
          </button>
        );
      })}
    </div>
  );
};

export default RoleSwitcher;
