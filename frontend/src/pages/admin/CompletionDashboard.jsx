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
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Compliance Matrix</h1>
          <p className="text-muted text-sm">Monitor organizational progress across strategic goals and quarterly milestones.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl border-l-4 border-l-accent">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Q2 Participation</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-primary">{q2Completed}</span>
            <span className="text-sm font-bold text-slate-400 pb-1">/ {data.length}</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-accent h-full transition-all duration-1000" style={{ width: `${(q2Completed/data.length)*100}%` }}></div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="bg-slate-50/50 p-6 border-b border-slate-100">
           <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Employee Progress Grid</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                <th className="p-6 font-bold">Stakeholder</th>
                <th className="p-6 font-bold text-center">Base Strategy</th>
                <th className="p-6 font-bold text-center">Approval</th>
                <th className="p-6 font-bold text-center border-l border-slate-50">Q1 Sync</th>
                <th className="p-6 font-bold text-center">Q2 Sync</th>
                <th className="p-6 font-bold text-center">Q3 Sync</th>
                <th className="p-6 font-bold text-center">Q4 Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-white shadow-sm">
                        {row.employee.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-700">{row.employee}</span>
                    </div>
                  </td>
                  <td className="p-6 text-center">{getStatusIcon(row.submitted)}</td>
                  <td className="p-6 text-center">{getStatusIcon(row.approved)}</td>
                  <td className="p-6 text-center border-l border-slate-50">{getStatusIcon(row.q1)}</td>
                  <td className="p-6 text-center">{getStatusIcon(row.q2)}</td>
                  <td className="p-6 text-center">{getStatusIcon(row.q3)}</td>
                  <td className="p-6 text-center">{getStatusIcon(row.q4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompletionDashboard;
