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
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-up">
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Cycle Management</h1>
          <p className="text-muted text-sm">Configure performance evaluation timelines and quarterly check-ins.</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-slate-600">Active Database Context:</label>
          <select 
            value={selectedCycleId}
            onChange={handleSelectCycle}
            className="border-slate-200 rounded-xl shadow-sm text-sm p-3 bg-white focus:ring-2 focus:ring-accent outline-none transition-all cursor-pointer min-w-[240px]"
          >
            <option value="new">+ Create New Performance Cycle</option>
            {cycles.map(c => (
              <option key={c.id} value={c.id}>Cycle #{c.id}: {c.name} {c.is_active ? '● ACTIVE' : ''}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="glass-card p-8 rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
          {selectedCycleId !== 'new' && (
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
              ID: {selectedCycleId}
            </span>
          )}
        </div>

        <div className="mb-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg shadow-blue-900/20 flex gap-4 items-start relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
             <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          </div>
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p className="font-bold text-lg mb-1">
              {selectedCycleId === 'new' ? 'Initialize New Performance Cycle' : `Modify Cycle Configuration: ${formData.name}`}
            </p>
            <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
              {selectedCycleId === 'new' 
                ? 'Defining a new cycle will automatically sunset previous active cycles. Ensure all dates follow chronological order.' 
                : 'Warning: Modifying dates for an active cycle will immediately re-calibrate access windows for all employees and managers.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Cycle Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. FY 2026-27" className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:border-accent focus:ring-4 focus:ring-accent/10 rounded-2xl transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Fiscal Year Label</label>
              <input type="text" name="year" value={formData.year} onChange={handleChange} required placeholder="e.g. 2026" className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:border-accent focus:ring-4 focus:ring-accent/10 rounded-2xl transition-all outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
              <h3 className="font-bold text-primary flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">01</span>
                Phase 1: Strategic Goal Setting
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Opens On</label><input type="date" name="phase1_open" value={formData.phase1_open} onChange={handleChange} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none" /></div>
                <div><label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Closes On</label><input type="date" name="phase1_close" value={formData.phase1_close} onChange={handleChange} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none" /></div>
              </div>
            </div>

            <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10 space-y-4">
              <h3 className="font-bold text-accent flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs">02</span>
                Quarter 01 Check-in Window
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Opens On</label><input type="date" name="q1_open" value={formData.q1_open} onChange={handleChange} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none" /></div>
                <div><label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Closes On</label><input type="date" name="q1_close" value={formData.q1_close} onChange={handleChange} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none" /></div>
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-xs">03</span>
                Quarter 02 Check-in Window
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Opens On</label><input type="date" name="q2_open" value={formData.q2_open} onChange={handleChange} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none" /></div>
                <div><label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Closes On</label><input type="date" name="q2_close" value={formData.q2_close} onChange={handleChange} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none" /></div>
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-xs">04</span>
                Quarter 03 Check-in Window
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Opens On</label><input type="date" name="q3_open" value={formData.q3_open} onChange={handleChange} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none" /></div>
                <div><label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Closes On</label><input type="date" name="q3_close" value={formData.q3_close} onChange={handleChange} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none" /></div>
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 lg:col-span-2">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-xs">05</span>
                Quarter 04 Check-in Window
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Opens On</label><input type="date" name="q4_open" value={formData.q4_open} onChange={handleChange} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none" /></div>
                <div><label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Closes On</label><input type="date" name="q4_close" value={formData.q4_close} onChange={handleChange} required className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none" /></div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex justify-end">
            <button type="submit" disabled={loading} className={selectedCycleId === 'new' ? 'btn-accent' : 'btn-primary'}>
              {loading ? (selectedCycleId === 'new' ? 'Creating...' : 'Updating...') : (selectedCycleId === 'new' ? 'Deploy New Cycle' : 'Commit Configuration Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CycleManager;
