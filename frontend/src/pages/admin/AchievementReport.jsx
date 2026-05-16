import { useState } from 'react';
import useAuthStore from '../../store/useAuthStore';
import { Download } from 'lucide-react';

const AchievementReport = () => {
  const { token } = useAuthStore();
  const [filters, setFilters] = useState({ cycleId: '1', department: '', quarter: '', status: '' });

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
      a.download = `achievement_report.\${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => alert('Export failed'));
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
    </div>
  );
};

export default AchievementReport;
