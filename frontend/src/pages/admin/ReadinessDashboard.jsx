import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const ReadinessDashboard = () => {
  const { token } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/admin/readiness`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load readiness data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleNudge = async (managerId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/admin/nudge/${managerId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Manager nudged successfully!');
    } catch (err) {
      toast.error('Failed to send nudge');
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400">Loading Org Readiness...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Error loading dashboard</div>;

  const getReadinessColor = (percent) => {
    if (percent >= 80) return 'text-emerald-500 border-emerald-500';
    if (percent >= 50) return 'text-amber-500 border-amber-500';
    return 'text-rose-500 border-rose-500';
  };

  const worstDept = data.departmentBreakdown[0];
  const urgentCount = data.urgentAttention.length;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen pb-20">
      {/* Section 1: Headline Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className={`w-24 h-24 rounded-full border-8 flex items-center justify-center mb-4 ${getReadinessColor(data.overallReadiness.readinessPercent)}`}>
            <span className="text-2xl font-bold">{data.overallReadiness.readinessPercent}%</span>
          </div>
          <p className="text-slate-500 font-medium uppercase tracking-wider text-xs">Org Readiness</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="text-5xl font-black text-slate-800 mb-2">{data.daysUntilWindowCloses}</div>
          <p className="text-slate-500 font-medium uppercase tracking-wider text-xs">Days left in {data.currentWindow.toUpperCase()}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="text-5xl font-black text-rose-500 mb-2">{urgentCount}</div>
          <p className="text-slate-500 font-medium uppercase tracking-wider text-xs">Urgent Actions Needed</p>
        </div>
      </div>

      {/* Section 2: Department Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Department Readiness</h2>
          <span className="text-xs text-slate-400 font-medium">WORST PERFORMING FIRST</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Approved</th>
                <th className="px-6 py-4">Readiness</th>
                <th className="px-6 py-4">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.departmentBreakdown.map((dept, idx) => (
                <tr key={dept.dept} className={idx === 0 && dept.readiness < 60 ? 'bg-rose-50/50' : ''}>
                  <td className="px-6 py-4 font-bold text-slate-700">{dept.dept}</td>
                  <td className="px-6 py-4 text-slate-600">{dept.total}</td>
                  <td className="px-6 py-4 text-slate-600">{dept.approved}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${dept.readiness >= 80 ? 'text-emerald-600' : dept.readiness >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {dept.readiness}%
                    </span>
                  </td>
                  <td className="px-6 py-4 w-48">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${dept.readiness >= 80 ? 'bg-emerald-500' : dept.readiness >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${dept.readiness}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {worstDept && worstDept.readiness < 60 && (
          <div className="p-4 bg-slate-800 text-white text-sm font-medium">
             💡 <span className="text-slate-300">{worstDept.dept} is {worstDept.readiness}% ready — {worstDept.atRisk} employees still pending. {data.currentWindow.toUpperCase()} closes in {data.daysUntilWindowCloses} days.</span>
          </div>
        )}
      </div>

      {/* Section 3: Thrust Area Coverage */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Thrust Area Coverage</h2>
        <div className="space-y-6">
          {data.thrustAreaCoverage.map(area => {
            const totalGoals = data.thrustAreaCoverage.reduce((sum, a) => sum + a.goalCount, 0);
            const percentOfTotal = totalGoals > 0 ? (area.goalCount / totalGoals) * 100 : 0;
            return (
              <div key={area.area} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700">{area.area}</span>
                    {percentOfTotal < 10 && area.goalCount > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tight">Under-represented</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{area.goalCount} goals • {area.avgWeight}% avg weight</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-lg overflow-hidden flex">
                   <div 
                    className="h-full bg-primary transition-all duration-1000"
                    style={{ width: `${Math.max(5, percentOfTotal)}%` }}
                   />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Urgent Attention List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Urgent Attention Required</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Issue</th>
                <th className="px-6 py-4">Pending</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.urgentAttention.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 font-bold text-slate-700">{item.name}</td>
                  <td className="px-6 py-4 text-xs">
                    <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-full font-medium">{item.issue}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{item.daysPending} days</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleNudge(item.managerId)}
                      className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-700 transition-colors"
                    >
                      Nudge Manager
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5: Manager Bottleneck */}
      {data.managerSummary.some(m => m.pendingApprovals >= 2 && m.avgApprovalDays > 5) ? (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-2xl flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-3xl shrink-0">🐢</div>
          <div>
            <h3 className="text-amber-900 font-black text-xl mb-1">Bottleneck Warning</h3>
            {data.managerSummary.filter(m => m.pendingApprovals >= 2 && m.avgApprovalDays > 5).map(m => (
              <p key={m.name} className="text-amber-800 font-medium">
                <span className="font-bold underline">{m.name}</span> has {m.pendingApprovals} pending approvals with an average delay of {m.avgApprovalDays} days.
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 font-bold text-center">
          ✅ All managers are maintaining healthy approval cycles this window.
        </div>
      )}
    </div>
  );
};

export default ReadinessDashboard;
