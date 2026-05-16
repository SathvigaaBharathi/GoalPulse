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
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary">Audit Log</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <th className="p-4 font-semibold">Time</th>
              <th className="p-4 font-semibold">User</th>
              <th className="p-4 font-semibold">Action</th>
              <th className="p-4 font-semibold">Entity</th>
              <th className="p-4 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{new Date(log.changed_at).toLocaleString()}</td>
                <td className="p-4 text-sm font-medium text-gray-800">{log.changed_by_name}</td>
                <td className="p-4 text-sm">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{log.change_type}</span>
                </td>
                <td className="p-4 text-sm">{log.entity_type} #{log.entity_id}</td>
                <td className="p-4 text-xs">
                  <div className="max-w-xs truncate" title={log.new_value}>
                    {log.change_type === 'admin_unlock' ? (
                      <span className="text-danger font-semibold">Reason: {JSON.parse(log.new_value).reason}</span>
                    ) : (
                      <span className="text-gray-500">Updated: {log.new_value}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLog;
