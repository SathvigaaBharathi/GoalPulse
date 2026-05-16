import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import { Check, Clock, X } from 'lucide-react';

const CompletionDashboard = () => {
  const { token } = useAuthStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatrix = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/reports/completion`, { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatrix();
  }, [token]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const getStatusIcon = (status) => {
    if (status) return <Check className="text-success mx-auto" size={18} />;
    return <Clock className="text-warning mx-auto" size={18} />;
  };

  const q2Completed = data.filter(d => d.q2).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary">Completion Dashboard</h1>
      
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-sm font-medium text-gray-700">
        Summary: {q2Completed} of {data.length} employees have completed Q2 check-ins.
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <th className="p-4 font-semibold">Employee</th>
              <th className="p-4 font-semibold text-center">Submitted</th>
              <th className="p-4 font-semibold text-center">Approved</th>
              <th className="p-4 font-semibold text-center border-l">Q1 Check-in</th>
              <th className="p-4 font-semibold text-center">Q2 Check-in</th>
              <th className="p-4 font-semibold text-center">Q3 Check-in</th>
              <th className="p-4 font-semibold text-center">Q4 Check-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-sm text-gray-800">{row.employee}</td>
                <td className="p-4">{getStatusIcon(row.submitted)}</td>
                <td className="p-4">{getStatusIcon(row.approved)}</td>
                <td className="p-4 border-l">{getStatusIcon(row.q1)}</td>
                <td className="p-4">{getStatusIcon(row.q2)}</td>
                <td className="p-4">{getStatusIcon(row.q3)}</td>
                <td className="p-4">{getStatusIcon(row.q4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompletionDashboard;
