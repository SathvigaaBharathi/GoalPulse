import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import { Clock, AlertCircle, Hourglass, Edit, CheckCircle, ArrowRight, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

const URGENCY_STYLES = {
  high:   { border: 'border-l-red-500',   bg: 'bg-red-50/60',    text: 'text-red-700',   badge: 'bg-red-500 text-white'   },
  medium: { border: 'border-l-amber-500', bg: 'bg-amber-50/60',  text: 'text-amber-700', badge: 'bg-amber-500 text-white' },
  low:    { border: 'border-l-teal-400',  bg: 'bg-teal-50/40',   text: 'text-teal-700',  badge: 'bg-teal-500 text-white'  },
  none:   { border: 'border-l-green-500', bg: 'bg-green-50/40',  text: 'text-green-700', badge: 'bg-green-500 text-white' },
};

const TYPE_ICONS = {
  submit_goals:     <Clock size={20} />,
  rework_required:  <AlertCircle size={20} />,
  waiting_approval: <Hourglass size={20} />,
  checkin_pending:  <Edit size={20} />,
  all_clear:        <CheckCircle size={20} />,
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
      className={`w-full border-l-4 ${style.border} ${style.bg} rounded-xl p-5 flex items-center gap-4 shadow-sm mb-6`}
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
            {nudging ? 'Sending...' : "Manager hasn't responded? Nudge them."}
          </button>
        )}
      </div>

      {/* CTA — only shown when there's an action to take, not for rework (banner on goal sheet handles that) */}
      {isClickable && action.type !== 'rework_required' && (
        <button
          onClick={() => navigate(action.ctaRoute)}
          className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ${style.badge} transition-opacity hover:opacity-90 whitespace-nowrap`}
        >
          {action.cta}
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
};

export default NextActionCard;
