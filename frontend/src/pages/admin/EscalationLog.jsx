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
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary">Escalation Log</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <th className="p-4 font-semibold">Time Triggered</th>
              <th className="p-4 font-semibold">Employee</th>
              <th className="p-4 font-semibold">Rule Type</th>
              <th className="p-4 font-semibold">Level</th>
              <th className="p-4 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{new Date(log.triggered_at).toLocaleString()}</td>
                <td className="p-4 text-sm font-medium text-gray-800">{log.target_user}</td>
                <td className="p-4 text-sm">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">{log.rule_type.replace(/_/g, ' ')}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${log.escalation_level === 3 ? 'bg-danger/20 text-danger' : log.escalation_level === 2 ? 'bg-warning/20 text-warning' : 'bg-blue-100 text-blue-700'}`}>
                    Level {log.escalation_level}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {log.is_resolved ? (
                    <span className="inline-flex items-center gap-1 text-success text-xs font-medium"><CheckCircle size={14}/> Resolved</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-danger text-xs font-medium"><AlertTriangle size={14}/> Active</span>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">No escalations logged.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EscalationLog;
