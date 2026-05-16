import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';

const AuditLog = () => {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/admin/audit-log`, { headers: { Authorization: `Bearer ${token}` } });
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
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">System Audit Trail</h1>
          <p className="text-muted text-sm">Comprehensive immutable record of all system configuration changes and user interactions.</p>
        </div>
      </div>
      
      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
           <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Master Transaction Log</h3>
           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SECURE RECORD ENCRYPTED: SHA-256</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                <th className="p-6 font-bold">Timestamp</th>
                <th className="p-6 font-bold">Actor</th>
                <th className="p-6 font-bold">Protocol</th>
                <th className="p-6 font-bold">Target Instance</th>
                <th className="p-6 font-bold">Payload Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6 text-xs text-slate-500 font-medium whitespace-nowrap">{new Date(log.changed_at).toLocaleString()}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                        {log.changed_by_name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-700">{log.changed_by_name}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="bg-primary/5 text-primary px-3 py-1 rounded-full text-[10px] font-bold border border-primary/10 uppercase tracking-tighter">
                      {log.change_type}
                    </span>
                  </td>
                  <td className="p-6 text-slate-500 text-xs font-mono bg-slate-50/50">
                    {log.entity_type} <span className="text-accent font-bold">#{log.entity_id}</span>
                  </td>
                  <td className="p-6">
                    <div className="max-w-xs overflow-hidden" title={log.new_value}>
                      {log.change_type === 'admin_unlock' ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-danger font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                            <div className="w-1 h-1 bg-danger rounded-full"></div> Administrative Override
                          </span>
                          <span className="text-xs text-slate-600 italic">"{JSON.parse(log.new_value).reason}"</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs font-medium truncate block">Value: {log.new_value}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-20 text-center">
                    <p className="text-slate-400 font-medium italic">No transactions recorded in the current timeframe.</p>
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

export default AuditLog;
