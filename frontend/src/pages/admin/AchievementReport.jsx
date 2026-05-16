import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import useAuthStore from '../../store/useAuthStore';
import { Download } from 'lucide-react';

const AchievementReport = () => {
  const { token } = useAuthStore();
  const [filters, setFilters] = useState({ cycleId: '1', department: '', quarter: '', status: '' });
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);


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
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary">Achievement Report</h1>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Export Filters</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Cycle ID</label>
            <input type="text" value={filters.cycleId} onChange={e => setFilters({...filters, cycleId: e.target.value})} className="w-full p-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <input type="text" placeholder="e.g. Engineering" value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})} className="w-full p-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quarter</label>
            <select value={filters.quarter} onChange={e => setFilters({...filters, quarter: e.target.value})} className="w-full p-2 border rounded text-sm">
              <option value="">All</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full p-2 border rounded text-sm">
              <option value="">All</option>
              <option value="not_started">Not Started</option>
              <option value="on_track">On Track</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => handleExport('csv')} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded hover:bg-[#152a46] transition-colors font-medium">
            <Download size={18} /> Export CSV
          </button>
          <button onClick={() => handleExport('excel')} className="flex items-center gap-2 bg-success text-white px-4 py-2 rounded hover:bg-[#1b9e4b] transition-colors font-medium">
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4 border-b pb-2">Live Data Preview</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading preview...</p>
        ) : previewData.length === 0 ? (
          <p className="text-gray-500 text-sm">No achievements match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Employee</th>
                  <th className="px-4 py-3">Goal</th>
                  <th className="px-4 py-3">Quarter</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-lg">Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewData.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">{row.employee}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-xs">{row.goal_title}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-bold border border-gray-200">{row.quarter}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        row.status === 'completed' ? 'bg-success/10 text-success border-success/20' : 
                        row.status === 'on_track' ? 'bg-warning/10 text-warning-dark border-warning/20' : 
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {row.status === 'completed' ? 'Completed' : row.status === 'on_track' ? 'On Track' : 'Not Started'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{row.actual_value !== null ? row.actual_value : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 10 && (
              <p className="text-center text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                Showing top 10 rows. Export to view all {previewData.length} records.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementReport;
