import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import GoalCard from '../../components/GoalCard';
import { RotateCcw, CheckCircle } from 'lucide-react';

const ApprovalQueue = () => {
  const { token } = useAuthStore();
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchQueue = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/goals/queue`, { headers: { Authorization: `Bearer ${token}` } });
      setSheets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSheetDetails = async (sheetId) => {
    try {
      const res = await axios.get(`${apiUrl}/api/goals/sheet/${sheetId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedSheet(res.data.sheet);
      setGoals(res.data.goals);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleUpdateGoal = async (id, updates) => {
    try {
      await axios.put(`${apiUrl}/api/goals/${id}`, updates, { headers: { Authorization: `Bearer ${token}` } });
      fetchSheetDetails(selectedSheet.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update goal');
    }
  };

  const handleApprove = async () => {
    const totalWeight = goals.reduce((sum, g) => sum + g.weightage, 0);
    if (totalWeight !== 100) return toast.error('Total weightage must be 100%');
    setSubmitting(true);
    try {
      await axios.post(`${apiUrl}/api/goals/sheet/${selectedSheet.id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Goal sheet approved and locked!');
      setSelectedSheet(null);
      setGoals([]);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRework = async () => {
    if (!reworkReason.trim()) return toast.error('Please provide a reason for rework');
    setSubmitting(true);
    try {
      await axios.post(`${apiUrl}/api/goals/sheet/${selectedSheet.id}/rework`, { reason: reworkReason }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Sheet returned for rework. Employee has been notified.');
      setShowReworkModal(false);
      setReworkReason('');
      setSelectedSheet(null);
      setGoals([]);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to return for rework');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  const totalWeight = goals.reduce((sum, g) => sum + g.weightage, 0);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)]">
      <div className="bg-blue-50/80 text-blue-800 p-4 rounded-lg border border-blue-100 flex gap-3 text-sm shadow-sm shrink-0">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
          <p className="font-semibold mb-1 text-blue-900">Manager Approval Workflow</p>
          <p>Review goal sheets submitted by your direct reports. You can edit targets and weightages inline before approving, or return the sheet for rework with a reason.</p>
        </div>
      </div>

      <div className="flex gap-6 h-full overflow-hidden">
        {/* Sidebar List */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
          <div className="p-4 border-b bg-gray-50 sticky top-0">
            <h2 className="font-bold text-lg">Approval Queue</h2>
            <p className="text-xs text-gray-500">{sheets.length} pending sheet{sheets.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y">
            {sheets.map(s => (
              <button
                key={s.id}
                onClick={() => fetchSheetDetails(s.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedSheet?.id === s.id ? 'bg-blue-50 border-l-4 border-accent' : ''}`}
              >
                <div className="font-semibold">{s.employee_name}</div>
                <div className="text-xs text-gray-500">{s.cycle_name}</div>
              </button>
            ))}
            {sheets.length === 0 && <div className="p-8 text-center text-gray-500">No pending sheets</div>}
          </div>
        </div>

        {/* Main Detail View */}
        <div className="w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-y-auto">
          {selectedSheet ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold">Goal Sheet Review</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Total weightage: <span className={`font-bold ${totalWeight === 100 ? 'text-success' : 'text-danger'}`}>{totalWeight}%</span>
                    {totalWeight !== 100 && <span className="text-danger ml-2">(must be 100% to approve)</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReworkModal(true)}
                    className="flex items-center gap-2 border border-warning text-warning px-4 py-2 rounded font-medium hover:bg-warning/5 transition-colors"
                  >
                    <RotateCcw size={16} /> Return for Rework
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={totalWeight !== 100 || submitting}
                    className="flex items-center gap-2 bg-success text-white px-4 py-2 rounded font-medium disabled:opacity-50 hover:bg-[#1b9e4b] transition-colors"
                  >
                    <CheckCircle size={16} /> Approve Sheet
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6">
                {goals.map(g => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onUpdate={handleUpdateGoal}
                    isEditable={true}
                    isManagerView={true}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a sheet from the queue to review
            </div>
          )}
        </div>
      </div>

      {/* Rework Modal */}
      {showReworkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-2">Return for Rework</h3>
            <p className="text-sm text-gray-600 mb-4">Provide a reason so the employee knows what to fix. They will be notified by email.</p>
            <textarea
              value={reworkReason}
              onChange={e => setReworkReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-warning focus:border-transparent outline-none min-h-[120px]"
              placeholder="e.g. Please revise the weightage for Goal 2 and add more specific targets..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowReworkModal(false); setReworkReason(''); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRework}
                disabled={submitting || !reworkReason.trim()}
                className="flex items-center gap-2 bg-warning text-white px-4 py-2 rounded font-medium disabled:opacity-50 hover:bg-yellow-600 transition-colors"
              >
                <RotateCcw size={16} /> {submitting ? 'Sending...' : 'Return for Rework'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
