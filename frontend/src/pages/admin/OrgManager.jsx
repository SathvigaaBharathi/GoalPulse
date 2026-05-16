import { useState } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';

const OrgManager = () => {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [pushData, setPushData] = useState({
    employeeIds: '3,4,5', // Hardcoded for demo
    thrust_area_id: '2',
    title: 'Shared Organization Goal',
    description: 'Mandatory cost reduction goal for all engineers',
    uom_type: 'min_percent',
    target_value: '10',
    target_date: ''
  });

  const handlePush = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const payload = {
        ...pushData,
        employeeIds: pushData.employeeIds.split(',').map(n => Number(n.trim()))
      };
      await axios.post(`${apiUrl}/api/goals/push-shared`, payload, { headers: { Authorization: `Bearer ${token}` } });
      alert('Shared goal pushed successfully!');
    } catch (err) {
      alert('Failed to push shared goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Organization Manager</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold mb-4 border-b pb-2">Push Shared Goal</h2>
        
        <div className="mb-6 bg-blue-50/80 text-blue-800 p-4 rounded-lg border border-blue-100 flex gap-3 text-sm shadow-sm">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <p className="font-semibold mb-1 text-blue-900">What does this do?</p>
            <p>This tool injects a mandatory top-down goal directly into the goal sheets of selected employees. It bypasses the standard draft/approval process and instantly adds a locked goal (with 10% weightage) to their active cycle.</p>
          </div>
        </div>
        <form onSubmit={handlePush} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employee IDs (comma separated for demo)</label>
            <input 
              type="text" value={pushData.employeeIds} onChange={e => setPushData({...pushData, employeeIds: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Goal Title</label>
            <input 
              type="text" value={pushData.title} onChange={e => setPushData({...pushData, title: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <button 
            type="submit" disabled={loading}
            className="bg-accent text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Pushing...' : 'Push to Employees'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
        <h2 className="text-lg font-bold mb-4 border-b pb-2">Developer Tools</h2>
        <p className="text-sm text-gray-600 mb-4">Trigger the daily cron job manually for demo purposes (sends emails and processes escalations).</p>
        <button 
          onClick={async () => {
            try {
              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
              await axios.post(`${apiUrl}/api/dev/trigger-cron`, {}, { headers: { Authorization: `Bearer ${token}` } });
              alert('Cron jobs triggered successfully!');
            } catch (e) {
              alert('Failed to trigger cron');
            }
          }}
          className="bg-primary hover:bg-[#152a46] text-white px-4 py-2 rounded font-medium transition-colors"
        >
          Run Daily Cron Jobs
        </button>
      </div>
    </div>
  );
};

export default OrgManager;
