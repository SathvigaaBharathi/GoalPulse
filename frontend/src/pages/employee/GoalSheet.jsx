import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import GoalCard from '../../components/GoalCard';
import WeightageValidator from '../../components/WeightageValidator';
import StatusBadge from '../../components/StatusBadge';
import { Plus } from 'lucide-react';

const GoalSheet = () => {
  const { token } = useAuthStore();
  const [data, setData] = useState({ sheet: null, goals: [], thrustAreas: [] });
  const [loading, setLoading] = useState(true);
  
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

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/goals`, newGoal, { headers: { Authorization: `Bearer ${token}` } });
      setShowForm(false);
      setNewGoal({ title: '', description: '', thrust_area_id: '', uom_type: 'max_numeric', target_value: '', target_date: '', weightage: 10 });
      fetchSheet();
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
      toast.success('Goal sheet submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit sheet');
    }
  };

  const handleAutoDistribute = async () => {
    if (data.goals.length === 0) return;
    
    // Calculate even distribution with rounding
    const baseWeight = Math.floor(100 / data.goals.length);
    let remainder = 100 % data.goals.length;
    
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      // Execute all PUT requests in parallel
      await Promise.all(data.goals.map((g, index) => {
        const weight = baseWeight + (index < remainder ? 1 : 0);
        return axios.put(`${apiUrl}/api/goals/${g.id}`, { weightage: weight }, { headers: { Authorization: `Bearer ${token}` } });
      }));
      toast.success('Weightage automatically distributed to 100%!');
      await fetchSheet();
    } catch (err) {
      toast.error('Failed to distribute weightage automatically');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!data.sheet) return <div className="p-8 text-center text-red-500">Error loading sheet</div>;

  const isEditable = data.sheet.status === 'draft' || data.sheet.status === 'rework';
  const totalWeight = data.goals.reduce((sum, g) => sum + g.weightage, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Goal Sheet</h1>
          <p className="text-gray-500 text-sm mt-1">Set and track your OKRs for the current cycle.</p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={data.sheet.status} />
          {isEditable && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleAutoDistribute}
                disabled={data.goals.length === 0}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                title="Automatically divide 100% equally among all goals"
              >
                ✨ Auto-Distribute
              </button>
              <button 
                onClick={handleSubmitSheet}
                disabled={totalWeight !== 100}
                className="bg-accent hover:bg-[#00a892] text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Submit for Approval
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditable && (
        <div className="mb-6 bg-blue-50/80 text-blue-800 p-4 rounded-lg border border-blue-100 flex gap-3 text-sm shadow-sm">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <p className="font-semibold mb-1 text-blue-900">How to submit your goals</p>
            <p>Add your goals below and assign a weightage percentage to each. The total weightage must equal exactly 100% before the "Submit for Approval" button will unlock.</p>
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
