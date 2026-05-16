import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const EscalationLog = () => {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/admin/escalation-log`, { headers: { Authorization: `Bearer ${token}` } });
        setLogs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Escalation Governance</h1>
          <p className="text-muted text-sm">Monitor system-triggered policy violations and compliance alerts.</p>
        </div>
        <div className="flex gap-2">
           <div className="px-4 py-2 bg-danger/10 text-danger rounded-xl text-xs font-bold flex items-center gap-2 border border-danger/20">
             <div className="w-2 h-2 rounded-full bg-danger animate-pulse"></div>
             {logs.filter(l => !l.is_resolved).length} ACTIVE ESCALATIONS
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><AlertTriangle size={20}/></div>
            <h3 className="font-bold text-slate-800">Level 1: Advisory</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">Automatic nudge sent to the Employee when a deadline is missed by 24 hours. Intended as a system reminder.</p>
        </div>
        <div className="glass-card p-6 rounded-2xl border-l-4 border-l-warning">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 text-warning rounded-lg"><AlertTriangle size={20}/></div>
            <h3 className="font-bold text-slate-800">Level 2: Management</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">Direct notification sent to the Reporting Manager. Triggered if the violation persists for more than 72 hours.</p>
        </div>
        <div className="glass-card p-6 rounded-2xl border-l-4 border-l-danger">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 text-danger rounded-lg"><AlertTriangle size={20}/></div>
            <h3 className="font-bold text-slate-800">Level 3: Executive</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">Formal HR/Skip-level report generated. Triggered for critical missed milestones or repeated policy bypasses.</p>
        </div>
      </div>
      
      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
           <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Active Violation Log</h3>
           <div className="text-[10px] font-bold text-slate-400">TOTAL RECORDS: {logs.length}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                <th className="p-6 font-bold">Timeline</th>
                <th className="p-6 font-bold">Target Stakeholder</th>
                <th className="p-6 font-bold">Violation Category</th>
                <th className="p-6 font-bold">Severity</th>
                <th className="p-6 font-bold text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6 text-xs text-slate-500 font-medium">{new Date(log.triggered_at).toLocaleString()}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                        {log.target_user.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{log.target_user}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 uppercase tracking-tight">
                      {log.rule_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${log.escalation_level === 3 ? 'bg-danger text-white shadow-lg shadow-danger/30' : log.escalation_level === 2 ? 'bg-warning text-white shadow-lg shadow-warning/30' : 'bg-primary text-white shadow-lg shadow-primary/30'}`}>
                      LEVEL {log.escalation_level}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    {log.is_resolved ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-full text-[10px] font-bold border border-success/20">
                        <CheckCircle size={12}/> RESOLVED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-danger/10 text-danger rounded-full text-[10px] font-bold border border-danger/20 animate-pulse">
                        <AlertTriangle size={12}/> PENDING ACTION
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <div className="p-4 bg-slate-50 rounded-full text-slate-300"><CheckCircle size={40}/></div>
                       <p className="text-slate-400 font-medium">Compliance health is optimal. No active escalations found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EscalationLog;
