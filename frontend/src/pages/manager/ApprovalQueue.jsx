import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import GoalCard from '../../components/GoalCard';
import { RotateCcw, CheckCircle, Clock, CheckCircle2 } from 'lucide-react';

const ApprovalQueue = () => {
  const { token } = useAuthStore();
  const [tab, setTab] = useState('pending'); // 'pending' | 'approved'
  const [pendingSheets, setPendingSheets] = useState([]);
  const [approvedSheets, setApprovedSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const headers = { Authorization: `Bearer ${token}` };

  const [notifications, setNotifications] = useState([]);

  const fetchAll = async () => {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        axios.get(`${apiUrl}/api/goals/queue`, { headers }),
        axios.get(`${apiUrl}/api/goals/approved-sheets`, { headers }),
      ]);
      setPendingSheets(pendingRes.data);
      setApprovedSheets(approvedRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSheetDetails = async (sheetId) => {
    try {
      const res = await axios.get(`${apiUrl}/api/goals/sheet/${sheetId}`, { headers });
      setSelectedSheet(res.data.sheet);
      setGoals(res.data.goals);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/goals/notifications`, { headers });
      setNotifications(res.data.filter(n => n.type === 'nudge' && !n.is_read));
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  const handleDismissNudge = async (id) => {
    try {
      await axios.put(`${apiUrl}/api/goals/notifications/${id}/read`, {}, { headers });
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Nudge acknowledged');
    } catch (err) {
      toast.error('Failed to dismiss notification');
    }
  };

  useEffect(() => { 
    fetchAll(); 
    fetchNotifications();
  }, []);

  const handleUpdateGoal = async (id, updates) => {
    try {
      await axios.put(`${apiUrl}/api/goals/${id}`, updates, { headers });
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
      await axios.post(`${apiUrl}/api/goals/sheet/${selectedSheet.id}/approve`, {}, { headers });
      toast.success('Goal sheet approved and locked!');
      setSelectedSheet(null);
      setGoals([]);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRework = async () => {
    if (!reworkReason.trim()) return toast.error('Please provide a reason');
    setSubmitting(true);
    try {
      await axios.post(`${apiUrl}/api/goals/sheet/${selectedSheet.id}/rework`, { reason: reworkReason }, { headers });
      const wasApproved = selectedSheet.status === 'approved';
      toast.success(wasApproved ? 'Sheet recalled and returned for revision.' : 'Sheet returned for rework. Employee notified.');
      setShowReworkModal(false);
      setReworkReason('');
      setSelectedSheet(null);
      setGoals([]);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to return for rework');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  const activeSheets = tab === 'pending' ? pendingSheets : approvedSheets;
  const totalWeight = goals.reduce((sum, g) => sum + g.weightage, 0);
  const isApprovedView = selectedSheet?.status === 'approved';

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)]">
      {/* Nudge Banner */}
      {notifications.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-xl flex items-center justify-between gap-4 animate-bounce-subtle shadow-lg shadow-rose-200/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center text-2xl shadow-lg shadow-rose-500/20">⚡</div>
            <div>
              <h4 className="text-rose-900 font-black text-sm uppercase tracking-tighter">Admin Nudge Received</h4>
              <p className="text-rose-800 text-xs font-medium max-w-2xl">{notifications[0].message}</p>
            </div>
          </div>
          <button 
            onClick={() => handleDismissNudge(notifications[0].id)}
            className="bg-rose-900 text-white text-[10px] px-3 py-2 rounded-lg font-black uppercase hover:bg-rose-800 transition-all active:scale-95"
          >
            Acknowledge
          </button>
        </div>
      )}

      <div className="bg-blue-50/80 text-blue-800 p-4 rounded-lg border border-blue-100 flex gap-3 text-sm shadow-sm shrink-0">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
          <p className="font-semibold mb-1 text-blue-900">Manager Approval Workflow</p>
          <p>Review pending submissions or recall approved sheets for revision. Recalling an approved sheet unlocks it for the employee to edit and resubmit.</p>
        </div>
      </div>

      <div className="flex gap-6 h-full overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 shrink-0">
            <button
              onClick={() => { setTab('pending'); setSelectedSheet(null); setGoals([]); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${tab === 'pending' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Clock size={14} />
              Pending
              {pendingSheets.length > 0 && (
                <span className="bg-warning text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingSheets.length}</span>
              )}
            </button>
            <button
              onClick={() => { setTab('approved'); setSelectedSheet(null); setGoals([]); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${tab === 'approved' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <CheckCircle2 size={14} />
              Approved
              {approvedSheets.length > 0 && (
                <span className="bg-success text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{approvedSheets.length}</span>
              )}
            </button>
          </div>

          {/* Sheet list */}
          <div className="overflow-y-auto flex-1 divide-y">
            {activeSheets.map(s => (
              <button
                key={s.id}
                onClick={() => fetchSheetDetails(s.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedSheet?.id === s.id ? 'bg-blue-50 border-l-4 border-accent' : ''}`}
              >
                <div className="font-semibold text-sm">{s.employee_name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.cycle_name}</div>
              </button>
            ))}
            {activeSheets.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                {tab === 'pending' ? 'No pending sheets' : 'No approved sheets'}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-y-auto">
          {selectedSheet ? (
            <div>
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-xl font-bold">
                    {isApprovedView ? 'Approved Sheet' : 'Goal Sheet Review'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Total weightage: <span className={`font-bold ${totalWeight === 100 ? 'text-success' : 'text-danger'}`}>{totalWeight}%</span>
                    {totalWeight !== 100 && !isApprovedView && <span className="text-danger ml-2">(must be 100% to approve)</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReworkModal(true)}
                    className="flex items-center gap-2 border border-warning text-warning px-4 py-2 rounded-lg font-medium hover:bg-warning/5 transition-colors text-sm"
                  >
                    <RotateCcw size={15} />
                    {isApprovedView ? 'Recall for Revision' : 'Return for Rework'}
                  </button>
                  {!isApprovedView && (
                    <button
                      onClick={handleApprove}
                      disabled={totalWeight !== 100 || submitting}
                      className="flex items-center gap-2 bg-success text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-[#1b9e4b] transition-colors text-sm"
                    >
                      <CheckCircle size={15} /> Approve Sheet
                    </button>
                  )}
                </div>
              </div>

              {isApprovedView && (
                <div className="mb-4 p-3 bg-success/5 border border-success/20 rounded-lg text-xs text-success font-medium flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  This sheet is approved and goals are locked. Use "Recall for Revision" to send it back to the employee.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {goals.map(g => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onUpdate={handleUpdateGoal}
                    isEditable={!isApprovedView}
                    isManagerView={true}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Select a sheet from the {tab === 'pending' ? 'queue' : 'list'} to review
            </div>
          )}
        </div>
      </div>

      {/* Rework / Recall Modal */}
      {showReworkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-1">
              {isApprovedView ? 'Recall Sheet for Revision' : 'Return for Rework'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {isApprovedView
                ? 'This will unlock the sheet and notify the employee to revise and resubmit. Provide a clear reason.'
                : 'Provide a reason so the employee knows what to fix. They will be notified by email.'}
            </p>
            <textarea
              value={reworkReason}
              onChange={e => setReworkReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-warning outline-none min-h-[120px]"
              placeholder="e.g. Please revise the weightage for Goal 2 and clarify the target metric..."
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowReworkModal(false); setReworkReason(''); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRework}
                disabled={submitting || !reworkReason.trim()}
                className="flex items-center gap-2 bg-warning text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-yellow-600 transition-colors text-sm"
              >
                <RotateCcw size={15} />
                {submitting ? 'Sending...' : isApprovedView ? 'Recall & Notify' : 'Return for Rework'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
