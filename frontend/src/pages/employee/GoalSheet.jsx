import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import GoalCard from '../../components/GoalCard';
import WeightageValidator from '../../components/WeightageValidator';
import StatusBadge from '../../components/StatusBadge';
import { Plus } from 'lucide-react';
import NextActionCard from '../../components/NextActionCard';

const GoalSheet = () => {
  const { token } = useAuthStore();
  const [data, setData] = useState({ sheet: null, goals: [], thrustAreas: [] });
  const [loading, setLoading] = useState(true);
  const [actionRefreshKey, setActionRefreshKey] = useState(0);
  const [reworkReason, setReworkReason] = useState(null);

  const bumpAction = () => setActionRefreshKey(k => k + 1);
  
  // New goal form state
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '', description: '', thrust_area_id: '', uom_type: 'max_numeric', target_value: '', target_date: '', weightage: 10
  });

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

  useEffect(() => {
    if (data.sheet?.status !== 'rework') { setReworkReason(null); return; }
    const fetchReason = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/employee/next-action`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.type === 'rework_required') setReworkReason(res.data.detail);
      } catch {}
    };
    fetchReason();
  }, [data.sheet?.status, token]);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/goals`, newGoal, { headers: { Authorization: `Bearer ${token}` } });
      setShowForm(false);
      setNewGoal({ title: '', description: '', thrust_area_id: '', uom_type: 'max_numeric', target_value: '', target_date: '', weightage: 10 });
      fetchSheet();
      bumpAction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add goal');
    }
  };

  const handleUpdateGoal = async (id, updates) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.put(`${apiUrl}/api/goals/${id}`, updates, { headers: { Authorization: `Bearer ${token}` } });
      fetchSheet();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update goal');
    }
  };

  const handleSubmitSheet = async () => {
    const totalWeight = data.goals.reduce((sum, g) => sum + g.weightage, 0);
    if (totalWeight !== 100) return toast.error('Weightage must be 100%');
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/goals/sheet/submit`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchSheet();
      bumpAction();
      toast.success('Goal sheet submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit sheet');
    }
  };

  const handleAutoRebalance = async () => {
    if (data.goals.length === 0) return;
    
    // 1. Identify which goals are editable
    // Employees can only rebalance goals that aren't shared or locked
    const lockedGoals = data.goals.filter(g => g.is_shared || g.is_locked);
    const editableGoals = data.goals.filter(g => !(g.is_shared || g.is_locked));
    
    const reservedWeight = lockedGoals.reduce((sum, g) => sum + g.weightage, 0);
    const targetForEditable = Math.max(0, 100 - reservedWeight);

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // 2. Distribute weight
      if (editableGoals.length > 0) {
        const baseWeight = Math.floor(targetForEditable / editableGoals.length);
        let remainder = targetForEditable % editableGoals.length;

        await Promise.all(editableGoals.map((g, index) => {
          const weight = baseWeight + (index < remainder ? 1 : 0);
          return axios.put(`${apiUrl}/api/goals/${g.id}`, { weightage: weight }, { headers: { Authorization: `Bearer ${token}` } });
        }));
      }

      // 3. If sheet was approved, it needs to be re-submitted because weights changed
      if (data.sheet.status === 'approved') {
        await axios.post(`${apiUrl}/api/goals/sheet/submit`, {}, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Weights rebalanced and sheet re-submitted for approval!');
      } else {
        toast.success('Weights rebalanced to 100%!');
      }

      await fetchSheet();
      bumpAction();
    } catch (err) {
      console.error('Rebalance error:', err);
      toast.error('Failed to rebalance: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center min-h-[400px] flex items-center justify-center animate-pulse text-slate-400">Loading your goal sheet...</div>;
  if (!data.sheet) return <div className="p-8 text-center text-red-500">Error loading sheet</div>;

  const isEditable = data.sheet.status === 'draft' || data.sheet.status === 'rework' || data.sheet.status === 'submitted';
  const totalWeight = data.goals.reduce((sum, g) => sum + g.weightage, 0);
  const hasSharedGoals = data.goals.some(g => g.is_shared);

  return (
    <div>
      <NextActionCard refreshKey={actionRefreshKey} />

      {/* Rework feedback banner */}
      {data.sheet.status === 'rework' && (
        <div className="mb-6 flex gap-3 p-4 rounded-xl border-2 border-orange-300 bg-orange-50 shadow-sm">
          {/* ... (rework banner content remains same) ... */}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Goal Sheet</h1>
          <p className="text-gray-500 text-sm mt-1">Set and track your OKRs for the current cycle.</p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={data.sheet.status} />
          <div className="flex items-center gap-2">
            {isEditable && totalWeight !== 100 && (
              <button 
                onClick={handleAutoRebalance}
                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm bg-orange-500 text-white hover:bg-orange-600"
                title="Automatically adjust regular goals to fit shared goals into 100%"
              >
                ⚖️ Fix Imbalance
              </button>
            )}
            {(data.sheet.status === 'draft' || data.sheet.status === 'rework') && (
              <button 
                onClick={handleSubmitSheet}
                disabled={totalWeight !== 100}
                className="bg-accent hover:bg-[#00a892] text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md disabled:opacity-50 disabled:shadow-none active:scale-95"
              >
                Submit for Approval
              </button>
            )}
          </div>
        </div>
      </div>

      {isEditable && (
        <div className={`mb-6 p-4 rounded-xl border flex gap-3 text-sm shadow-sm transition-colors ${totalWeight !== 100 ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
          <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${totalWeight !== 100 ? 'text-orange-500' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <p className="font-bold mb-1">
              {totalWeight !== 100 ? 'Weightage Imbalance Detected' : 'Goal Sheet Readiness'}
            </p>
            <p>
              {totalWeight !== 100 
                ? `The total weightage is currently ${totalWeight}%. ${hasSharedGoals ? 'Mandatory shared goals have been added and need to be accommodated.' : ''} Click "Fix Imbalance" to automatically adjust your regular goals.`
                : 'Your goal weightage is perfectly balanced at 100%. You can now submit your sheet to your manager for approval.'
              }
            </p>
          </div>
        </div>
      )}

      <WeightageValidator goals={data.goals} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {data.goals.map(g => (
          <GoalCard 
            key={g.id} 
            goal={g} 
            onUpdate={handleUpdateGoal} 
            isEditable={isEditable} 
            isManagerView={false} 
          />
        ))}
        
        {isEditable && data.goals.length < 8 && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="h-full min-h-[200px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:text-accent hover:border-accent hover:bg-accent/5 transition-all"
          >
            <Plus size={32} className="mb-2" />
            <span className="font-medium">Add Goal</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-2xl mx-auto">
          <h3 className="text-lg font-bold mb-4">Create New Goal</h3>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Thrust Area</label>
              <select 
                required
                value={newGoal.thrust_area_id} 
                onChange={e => setNewGoal({...newGoal, thrust_area_id: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="">Select an area...</option>
                {data.thrustAreas.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input 
                required type="text"
                value={newGoal.title}
                onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="E.g., Increase Q3 Sales"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Measurement Type</label>
                <select 
                  value={newGoal.uom_type} 
                  onChange={e => setNewGoal({...newGoal, uom_type: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="max_numeric">Numeric (Max)</option>
                  <option value="min_numeric">Numeric (Min)</option>
                  <option value="max_percent">Percent (Max)</option>
                  <option value="min_percent">Percent (Min)</option>
                  <option value="timeline">Timeline</option>
                  <option value="zero">Zero-based</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Weightage (%)</label>
                <input 
                  required type="number" min="10" max="100"
                  value={newGoal.weightage}
                  onChange={e => setNewGoal({...newGoal, weightage: Number(e.target.value)})}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Target</label>
              {newGoal.uom_type === 'timeline' ? (
                <input 
                  required type="date"
                  value={newGoal.target_date}
                  onChange={e => setNewGoal({...newGoal, target_date: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              ) : (
                <input 
                  required type="number"
                  value={newGoal.target_value}
                  onChange={e => setNewGoal({...newGoal, target_value: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Target value"
                />
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded font-medium">Save Goal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default GoalSheet;
