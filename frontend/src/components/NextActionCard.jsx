import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import { Clock, AlertCircle, Hourglass, Edit, CheckCircle, ChevronRight, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

const URGENCY_STYLES = {
  high:   { border: 'border-l-red-500',   bg: 'bg-red-50/60',    text: 'text-red-700',   dot: 'bg-red-500'   },
  medium: { border: 'border-l-amber-500', bg: 'bg-amber-50/60',  text: 'text-amber-700', dot: 'bg-amber-500' },
  low:    { border: 'border-l-teal-400',  bg: 'bg-teal-50/40',   text: 'text-teal-700',  dot: 'bg-teal-400'  },
  none:   { border: 'border-l-green-500', bg: 'bg-green-50/40',  text: 'text-green-700', dot: 'bg-green-500' },
};

const TYPE_ICONS = {
  submit_goals:     <Clock size={22} />,
  rework_required:  <AlertCircle size={22} />,
  waiting_approval: <Hourglass size={22} />,
  checkin_pending:  <Edit size={22} />,
  all_clear:        <CheckCircle size={22} />,
};

const NextActionCard = ({ refreshKey = 0 }) => {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [action, setAction] = useState(null);
  const [nudging, setNudging] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/employee/next-action`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAction(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, [token, refreshKey]);

  const handleNudge = async (e) => {
    e.stopPropagation();
    setNudging(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/employee/nudge-manager`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Nudge sent to your manager!');
    } catch (err) {
      toast.error('Failed to send nudge');
    } finally {
      setNudging(false);
    }
  };

  if (!action) return null;

  const style = URGENCY_STYLES[action.urgency] || URGENCY_STYLES.none;
  const icon = TYPE_ICONS[action.type];
  const isClickable = !!action.cta && !!action.ctaRoute;

  return (
    <div
      onClick={() => isClickable && navigate(action.ctaRoute)}
      className={`
        w-full border-l-4 ${style.border} ${style.bg}
        rounded-xl p-5 flex items-center gap-4 shadow-sm
        transition-all duration-200
        ${isClickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.005]' : 'cursor-default'}
        mb-6
      `}
    >
      {/* Icon */}
      <div className={`shrink-0 ${style.text} p-2 rounded-lg bg-white/60`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 leading-snug">{action.message}</p>
        {action.detail && (
          <p className="text-xs text-slate-500 mt-0.5">{action.detail}</p>
        )}
        {action.type === 'waiting_approval' && action.waitingDays >= 5 && (
          <button
            onClick={handleNudge}
            disabled={nudging}
            className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary underline underline-offset-2 transition-colors"
          >
            <Bell size={12} />
            {nudging ? 'Sending...' : "If your manager hasn't responded, you can nudge them."}
          </button>
        )}
      </div>

      {/* CTA */}
      {action.cta && (
        <div className={`shrink-0 flex items-center gap-1.5 text-sm font-bold ${style.text} whitespace-nowrap`}>
          {action.cta}
          <ChevronRight size={16} />
        </div>
      )}
    </div>
  );
};

export default NextActionCard;
