import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function ViewModeToggler() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mode, setMode] = useState(
    localStorage.getItem('goalpulse_view_mode') || 'web'
  );

  useEffect(() => {
    // Sync local state in case user navigates back and forth via other buttons
    if (location.pathname === '/quick-update') {
      setMode('mobile');
      localStorage.setItem('goalpulse_view_mode', 'mobile');
    } else {
      setMode('web');
      localStorage.setItem('goalpulse_view_mode', 'web');
    }
  }, [location.pathname]);

  const switchTo = (newMode) => {
    setMode(newMode);
    localStorage.setItem('goalpulse_view_mode', newMode);
    if (newMode === 'mobile') {
      navigate('/quick-update');
    } else {
      navigate('/employee/goals');
    }
  };

  return (
    <div className="view-toggle">
      <button
        type="button"
        className={mode === 'web' ? 'active' : ''}
        onClick={() => switchTo('web')}
      >
        🖥 Web View
      </button>
      <button
        type="button"
        className={mode === 'mobile' ? 'active' : ''}
        onClick={() => switchTo('mobile')}
      >
        📱 Mobile View
      </button>
    </div>
  );
}

export default ViewModeToggler;
