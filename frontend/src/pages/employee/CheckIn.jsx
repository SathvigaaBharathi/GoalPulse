import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import useCycleStore from '../../store/useCycleStore';
import { Target, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

const CheckIn = () => {
  const { token } = useAuthStore();
  const { window } = useCycleStore();
  const [data, setData] = useState({ sheet: null, goals: [], achievements: [] });
  const [loading, setLoading] = useState(true);

  const fetchSheet = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/goals/sheet`, { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheet();
  }, []);

  const handleSaveAchievement = async (goalId, updates) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const payload = {
        goal_id: goalId,
        quarter: window.phase, // e.g. Q1
        ...updates
      };
      await axios.post(`${apiUrl}/api/checkins/achievements`, payload, { headers: { Authorization: `Bearer ${token}` } });
      fetchSheet(); // Refresh
      alert('Achievement saved!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!data.sheet || data.sheet.status !== 'approved') {
    return <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-200">
      <AlertCircle className="mx-auto mb-2 text-warning" size={32} />
      Your goals must be approved before you can log check-ins.
    </div>;
  }

  const isWindowOpen = window.isOpen;
  const currentQ = window.phase; // e.g. 'Q1'
  
  if (!currentQ || !currentQ.startsWith('Q')) {
    return <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-200 text-gray-500">
      We are not currently in a check-in phase.
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary">{currentQ} Check-In</h1>
          <p className="text-gray-500 text-sm mt-1">Log your progress for the current quarter.</p>
        </div>
      </div>

      {!isWindowOpen && (
        <div className="bg-gray-100 border border-gray-200 text-gray-600 p-4 rounded-lg flex gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <span>The check-in window is currently closed. You can view past data but cannot make edits.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {data.goals.map(goal => {
          const achievement = data.achievements.find(a => a.goal_id === goal.id && a.quarter === currentQ) || {};
          
          return (
            <div key={goal.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">{goal.thrust_area_name}</span>
                <h3 className="text-lg font-bold text-primary mt-1">{goal.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
                <div className="flex gap-4 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div><span className="text-gray-500">Target:</span> <strong>{goal.target_value || goal.target_date || 'N/A'}</strong> ({goal.uom_type})</div>
                  <div><span className="text-gray-500">Weight:</span> <strong>{goal.weightage}%</strong></div>
                </div>
              </div>
              
              <div className="w-full md:w-72 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <AchievementForm 
                  goal={goal} 
                  achievement={achievement} 
                  isEditable={isWindowOpen}
                  onSave={(updates) => handleSaveAchievement(goal.id, updates)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AchievementForm = ({ goal, achievement, isEditable, onSave }) => {
  const [actualValue, setActualValue] = useState(achievement.actual_value || '');
  const [actualDate, setActualDate] = useState(achievement.actual_date || '');
  const [status, setStatus] = useState(achievement.status || 'not_started');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      actual_value: actualValue === '' ? null : Number(actualValue), 
      actual_date: actualDate || null, 
      status 
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-semibold text-gray-700">Actual Progress</label>
      </div>
      
      {goal.uom_type === 'timeline' ? (
        <input 
          type="date" disabled={!isEditable} required
          value={actualDate} onChange={e => setActualDate(e.target.value)}
          className="w-full p-2 border rounded text-sm disabled:bg-gray-100"
        />
      ) : goal.uom_type === 'zero' ? (
        <input 
          type="number" disabled={!isEditable} required placeholder="0"
          value={actualValue} onChange={e => setActualValue(e.target.value)}
          className="w-full p-2 border rounded text-sm disabled:bg-gray-100"
        />
      ) : (
        <input 
          type="number" disabled={!isEditable} required placeholder="Enter value"
          value={actualValue} onChange={e => setActualValue(e.target.value)}
          className="w-full p-2 border rounded text-sm disabled:bg-gray-100"
        />
      )}

      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
        <div className="flex flex-col gap-2">
          <label className={`flex items-center gap-2 text-sm cursor-pointer ${!isEditable ? 'opacity-70' : ''}`}>
            <input type="radio" name={`status-${goal.id}`} value="not_started" checked={status === 'not_started'} onChange={() => setStatus('not_started')} disabled={!isEditable} />
            <Circle size={14} className="text-gray-400" /> Not Started
          </label>
          <label className={`flex items-center gap-2 text-sm cursor-pointer ${!isEditable ? 'opacity-70' : ''}`}>
            <input type="radio" name={`status-${goal.id}`} value="on_track" checked={status === 'on_track'} onChange={() => setStatus('on_track')} disabled={!isEditable} />
            <Target size={14} className="text-warning" /> On Track
          </label>
          <label className={`flex items-center gap-2 text-sm cursor-pointer ${!isEditable ? 'opacity-70' : ''}`}>
            <input type="radio" name={`status-${goal.id}`} value="completed" checked={status === 'completed'} onChange={() => setStatus('completed')} disabled={!isEditable} />
            <CheckCircle2 size={14} className="text-success" /> Completed
          </label>
        </div>
      </div>

      {isEditable && (
        <button type="submit" className="w-full mt-2 bg-primary hover:bg-[#152a46] text-white py-1.5 rounded text-sm font-medium transition-colors">
          Save Progress
        </button>
      )}
    </form>
  );
};

export default CheckIn;
