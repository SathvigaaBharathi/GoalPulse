import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const CycleManager = () => {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('new');
  const [formData, setFormData] = useState({
    name: '',
    year: '',
    phase1_open: '', phase1_close: '',
    q1_open: '', q1_close: '',
    q2_open: '', q2_close: '',
    q3_open: '', q3_close: '',
    q4_open: '', q4_close: ''
  });

  const fetchCycles = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/cycles`, { headers: { Authorization: `Bearer ${token}` } });
      setCycles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const handleSelectCycle = (e) => {
    const id = e.target.value;
    setSelectedCycleId(id);
    if (id === 'new') {
      setFormData({
        name: '', year: '', phase1_open: '', phase1_close: '',
        q1_open: '', q1_close: '', q2_open: '', q2_close: '',
        q3_open: '', q3_close: '', q4_open: '', q4_close: ''
      });
    } else {
      const cycle = cycles.find(c => c.id.toString() === id);
      if (cycle) {
        setFormData({ ...cycle });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      if (selectedCycleId === 'new') {
        await axios.post(`${apiUrl}/api/cycles`, formData, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('New Performance Cycle created and activated successfully!');
        setSelectedCycleId('new');
        setFormData({
          name: '', year: '', phase1_open: '', phase1_close: '',
          q1_open: '', q1_close: '', q2_open: '', q2_close: '',
          q3_open: '', q3_close: '', q4_open: '', q4_close: ''
        });
      } else {
        await axios.put(`${apiUrl}/api/cycles/${selectedCycleId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Performance Cycle updated successfully!');
      }
      fetchCycles();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save cycle');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Cycle Management</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Select Cycle:</label>
          <select 
            value={selectedCycleId}
            onChange={handleSelectCycle}
            className="border-gray-300 rounded-lg shadow-sm text-sm p-2 bg-white"
          >
            <option value="new">+ Create New Cycle</option>
            {cycles.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.is_active ? '(Active)' : ''}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-6 bg-blue-50/80 text-blue-800 p-4 rounded-lg border border-blue-100 flex gap-3 text-sm shadow-sm">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <p className="font-semibold mb-1 text-blue-900">
              {selectedCycleId === 'new' ? 'Define New Performance Window' : `Editing: ${formData.name}`}
            </p>
            <p>
              {selectedCycleId === 'new' 
                ? 'Creating a new cycle will automatically set it as active.' 
                : 'Modifying dates will immediately affect employee access windows.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Cycle Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. FY 2026-27" className="w-full p-2.5 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fiscal Year</label>
              <input type="text" name="year" value={formData.year} onChange={handleChange} required placeholder="e.g. 2026" className="w-full p-2.5 border rounded-lg" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-lg mb-4">Phase 1: Goal Setting</h3>
            <div className="grid grid-cols-2 gap-6">
              <div><label className="block text-sm text-gray-600 mb-1">Open Date</label><input type="date" name="phase1_open" value={formData.phase1_open} onChange={handleChange} required className="w-full p-2.5 border rounded-lg" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Close Date</label><input type="date" name="phase1_close" value={formData.phase1_close} onChange={handleChange} required className="w-full p-2.5 border rounded-lg" /></div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-lg mb-4">Quarterly Check-ins</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div><label className="block text-sm text-gray-600 mb-1">Q1 Open</label><input type="date" name="q1_open" value={formData.q1_open} onChange={handleChange} required className="w-full p-2.5 border rounded-lg" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Q1 Close</label><input type="date" name="q1_close" value={formData.q1_close} onChange={handleChange} required className="w-full p-2.5 border rounded-lg" /></div>
              
              <div><label className="block text-sm text-gray-600 mb-1">Q2 Open</label><input type="date" name="q2_open" value={formData.q2_open} onChange={handleChange} required className="w-full p-2.5 border rounded-lg" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Q2 Close</label><input type="date" name="q2_close" value={formData.q2_close} onChange={handleChange} required className="w-full p-2.5 border rounded-lg" /></div>
              
              <div><label className="block text-sm text-gray-600 mb-1">Q3 Open</label><input type="date" name="q3_open" value={formData.q3_open} onChange={handleChange} required className="w-full p-2.5 border rounded-lg" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Q3 Close</label><input type="date" name="q3_close" value={formData.q3_close} onChange={handleChange} required className="w-full p-2.5 border rounded-lg" /></div>
              
              <div><label className="block text-sm text-gray-600 mb-1">Q4 Open</label><input type="date" name="q4_open" value={formData.q4_open} onChange={handleChange} required className="w-full p-2.5 border rounded-lg" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Q4 Close</label><input type="date" name="q4_close" value={formData.q4_close} onChange={handleChange} required className="w-full p-2.5 border rounded-lg" /></div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={loading} className="bg-primary hover:bg-[#152a46] text-white px-6 py-2.5 rounded-lg font-medium shadow-md">
              {loading ? (selectedCycleId === 'new' ? 'Creating...' : 'Updating...') : (selectedCycleId === 'new' ? 'Create & Activate Cycle' : 'Update Cycle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CycleManager;
