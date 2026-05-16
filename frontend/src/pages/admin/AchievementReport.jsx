import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import useAuthStore from '../../store/useAuthStore';
import { Download } from 'lucide-react';

const AchievementReport = () => {
  const { token } = useAuthStore();
  const [filters, setFilters] = useState({ cycleId: '', department: '', quarter: '', status: '' });
  const [cycles, setCycles] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/analytics/cycles`, { headers: { Authorization: `Bearer ${token}` } });
        setCycles(res.data);
        if (res.data.length > 0) {
          const active = res.data.find(c => c.is_active) || res.data[0];
          setFilters(f => ({ ...f, cycleId: active.id.toString() }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCycles();
  }, [token]);


  const fetchPreview = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const params = new URLSearchParams(filters);
      const res = await fetch(`${apiUrl}/api/reports/achievement?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPreviewData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [filters, token]);

  const handleExport = (format) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const params = new URLSearchParams({ ...filters, export: format });
    // In a real app we'd fetch via axios and trigger download blob if we need Auth header.
    // For simplicity, we can do it via a fetch request and create an object URL.
    
    fetch(`${apiUrl}/api/reports/achievement?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `achievement_report.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => toast.error('Export failed'));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Performance Reports</h1>
          <p className="text-muted text-sm">Generate and export granular achievement data for organizational review.</p>
        </div>
      </div>
      
      <div className="glass-card p-8 rounded-3xl">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
           <div className="p-2 bg-primary/10 text-primary rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg></div>
           Intelligence Filters
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Reporting Cycle</label>
            <select 
              value={filters.cycleId} 
              onChange={e => setFilters({...filters, cycleId: e.target.value})} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none text-sm transition-all"
            >
              {cycles.map(c => (
                <option key={c.id} value={c.id}>Cycle #{c.id}: {c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Functional Unit</label>
            <input 
              type="text" placeholder="e.g. Engineering" 
              value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none text-sm transition-all" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Quarterly Period</label>
            <select value={filters.quarter} onChange={e => setFilters({...filters, quarter: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none text-sm transition-all">
              <option value="">All Quarters</option>
              <option value="Q1">Quarter 01</option>
              <option value="Q2">Quarter 02</option>
              <option value="Q3">Quarter 03</option>
              <option value="Q4">Quarter 04</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Goal Status</label>
            <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none text-sm transition-all">
              <option value="">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="on_track">On Track</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-6 border-t border-slate-100">
          <button onClick={() => handleExport('csv')} className="btn-primary flex items-center gap-2">
            <Download size={18} /> Download CSV
          </button>
          <button onClick={() => handleExport('excel')} className="btn-accent flex items-center gap-2">
            <Download size={18} /> Export Formatted Excel
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex justify-between items-center">
           <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Real-time Data Preview</h2>
           <span className="text-[10px] font-bold px-3 py-1 bg-slate-200 text-slate-600 rounded-full uppercase tracking-widest">
             {loading ? 'Refreshing...' : `${previewData.length} RECORDS MATCHED`}
           </span>
        </div>
        
        <div className="p-2">
          {loading ? (
            <div className="p-20 text-center text-slate-400 animate-pulse font-medium">Synchronizing reporting engine...</div>
          ) : previewData.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-slate-400 font-medium">No achievement data matches the selected intelligence criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-separate border-spacing-0">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4 border-b border-slate-100">Stakeholder</th>
                    <th className="px-6 py-4 border-b border-slate-100">Strategic Goal</th>
                    <th className="px-6 py-4 border-b border-slate-100">Period</th>
                    <th className="px-6 py-4 border-b border-slate-100">Milestone</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-right">Magnitude</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {previewData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-white shadow-sm">
                             {row.employee.charAt(0)}
                           </div>
                           <span className="font-bold text-slate-700">{row.employee}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <p className="text-xs text-slate-600 font-medium truncate max-w-xs">{row.goal_title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-white text-slate-600 px-3 py-1 rounded-full text-[10px] font-black border border-slate-200 shadow-sm">{row.quarter}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-tighter ${
                          row.status === 'completed' ? 'bg-success/10 text-success border-success/20' : 
                          row.status === 'on_track' ? 'bg-warning/10 text-warning border-warning/20' : 
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-primary font-mono">{row.actual_value !== null ? row.actual_value : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <div className="p-6 bg-slate-50/30 border-t border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Showing 10 of {previewData.length} records. Please utilize Export for full visibility.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AchievementReport;
