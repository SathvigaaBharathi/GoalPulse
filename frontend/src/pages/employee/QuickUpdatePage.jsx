import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import useCycleStore from '../../store/useCycleStore';
import ViewModeToggler from '../../components/ViewModeToggler';
import { CheckCircle2, ChevronRight, AlertCircle, Home } from 'lucide-react';

const QuickUpdatePage = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { window: cycleWindow, fetchWindow } = useCycleStore();
  
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  
  // Current card state
  const [actualValue, setActualValue] = useState('');
  const [status, setStatus] = useState('not_started');

  useEffect(() => {
    fetchWindow();
  }, []);

  const fetchGoals = async () => {
    try {
      const currentQ = cycleWindow.phase;
      if (!currentQ || !currentQ.startsWith('Q') || !cycleWindow.isOpen) {
        setLoading(false);
        return;
      }
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/goals/sheet`, { headers: { Authorization: `Bearer ${token}` } });
      const { goals: allGoals, achievements } = res.data;
      
      // Filter to goals where current quarter achievement is missing or status is 'not_started'
      const filtered = allGoals.filter(g => {
        const ach = achievements.find(a => a.goal_id === g.id && a.quarter === currentQ);
        return !ach || ach.status === 'not_started';
      });
      
      setGoals(filtered);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cycleWindow.phase) {
      fetchGoals();
    }
  }, [cycleWindow]);

  // Sync state when index changes
  useEffect(() => {
    if (goals.length > 0 && index < goals.length) {
      setActualValue('');
      setStatus('not_started');
    }
  }, [index, goals]);

  const handleSaveAndNext = async (e) => {
    e.preventDefault();
    const currentGoal = goals[index];
    const currentQ = cycleWindow.phase;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const payload = {
        goal_id: currentGoal.id,
        quarter: currentQ,
        actual_value: actualValue !== '' ? Number(actualValue) : null,
        actual_date: new Date().toISOString().split('T')[0],
        status: status
      };

      await axios.post(`${apiUrl}/api/checkins/achievements`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Achievement saved!');

      if (index + 1 >= goals.length) {
        setDone(true);
      } else {
        setIndex(index + 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-gray-500 font-medium">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading goals...
        </div>
      </div>
    );
  }

  const isWindowOpen = cycleWindow.isOpen;
  const currentQ = cycleWindow.phase;

  if (!isWindowOpen || !currentQ || !currentQ.startsWith('Q')) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col justify-between p-6 text-center quick-update-container" style={{ padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }}>
        <div className="flex justify-end pt-4">
          <ViewModeToggler />
        </div>
        <div className="my-auto max-w-sm mx-auto px-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-primary mb-3">No Active Check-in Window</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            No active check-in window right now. Check back when the next window opens.
          </p>
        </div>
        <div className="pb-8">
          <button
            onClick={() => {
              localStorage.setItem('goalpulse_view_mode', 'web');
              navigate('/employee/goals');
            }}
            className="w-full max-w-sm mx-auto py-3 bg-primary text-white font-bold rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Home size={18} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (goals.length === 0 || done) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col justify-between p-6 text-center quick-update-container" style={{ padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }}>
        <div className="flex justify-end pt-4 text-slate-800">
          <ViewModeToggler />
        </div>
        <div className="my-auto max-w-sm mx-auto px-4">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 size={44} />
          </div>
          <h2 className="text-2xl font-black text-primary mb-3">All Goals Updated</h2>
          <p className="text-sm text-gray-500 font-medium">Your check-in is complete.</p>
        </div>
        <div className="pb-8">
          <button
            onClick={() => {
              localStorage.setItem('goalpulse_view_mode', 'web');
              navigate('/employee/goals');
            }}
            className="w-full max-w-sm mx-auto py-3.5 bg-primary text-white font-bold rounded-xl active:scale-[0.98] transition-transform shadow-lg shadow-primary/10"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const goal = goals[index];

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col justify-between p-6 quick-update-container" style={{ padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }}>
      {/* Top Header Row */}
      <div className="flex justify-between items-center py-2 border-b border-gray-100 shrink-0">
        <span className="text-sm font-bold text-primary tracking-wide">
          Goal {index + 1} of {goals.length}
        </span>
        <ViewModeToggler />
      </div>

      {/* Main Goal Card Content */}
      <div className="flex-1 my-auto py-8 max-w-md mx-auto w-full flex flex-col justify-center">
        {/* Thrust Area Tag */}
        <div className="mb-2">
          <span className="inline-block bg-[#00C2A8]/10 text-[#00C2A8] text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {goal.thrust_area_name || 'Strategic Area'}
          </span>
        </div>

        {/* Goal Title */}
        <h1 className="text-[18px] font-extrabold text-primary leading-snug mb-2">
          {goal.title}
        </h1>

        {/* Goal Description (Optional/Short) */}
        {goal.description && (
          <p className="text-xs text-gray-400 mb-6 line-clamp-2">
            {goal.description}
          </p>
        )}

        {/* Target Info */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 mb-6 text-sm text-gray-500 font-medium">
          Target: <span className="text-primary font-bold">{goal.target_value || goal.target_date}</span> ({goal.uom_type})
        </div>

        <form onSubmit={handleSaveAndNext} className="space-y-6">
          {/* Numeric Actual Input Wrapper */}
          <div className="border border-gray-200 rounded-xl p-4 text-center focus-within:border-accent transition-colors shadow-sm">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Your Actual
            </label>
            <input
              required
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={actualValue}
              onChange={e => setActualValue(e.target.value)}
              className="w-full text-center text-[32px] font-black text-primary bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-gray-200"
              placeholder="0"
            />
          </div>

          {/* Status Buttons Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              How is this going?
            </label>
            <div className="flex gap-2">
              {/* Not Started */}
              <button
                type="button"
                onClick={() => setStatus('not_started')}
                style={{ height: '48px' }}
                className={`flex-1 rounded-xl text-[13px] font-bold border transition-all duration-150 flex items-center justify-center gap-1.5 ${
                  status === 'not_started'
                    ? 'bg-slate-500 text-white border-slate-500 shadow-md shadow-slate-500/10'
                    : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
                }`}
              >
                <span>⚪</span> Not Started
              </button>

              {/* On Track */}
              <button
                type="button"
                onClick={() => setStatus('on_track')}
                style={{ height: '48px' }}
                className={`flex-1 rounded-xl text-[13px] font-bold border transition-all duration-150 flex items-center justify-center gap-1.5 ${
                  status === 'on_track'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10'
                    : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
                }`}
              >
                <span>🟡</span> On Track
              </button>

              {/* Completed / Done */}
              <button
                type="button"
                onClick={() => setStatus('completed')}
                style={{ height: '48px' }}
                className={`flex-1 rounded-xl text-[13px] font-bold border transition-all duration-150 flex items-center justify-center gap-1.5 ${
                  status === 'completed'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10'
                    : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
                }`}
              >
                <span>🟢</span> Done
              </button>
            </div>
          </div>

          {/* Action teal button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-accent hover:bg-[#00a892] text-white font-bold rounded-xl active:scale-[0.98] transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              Save & Next <ChevronRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickUpdatePage;
