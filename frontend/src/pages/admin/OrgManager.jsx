import toast from 'react-hot-toast';
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
      toast.success('Shared goal pushed successfully!');
    } catch (err) {
      toast.error('Failed to push shared goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Organization Governance</h1>
          <p className="text-muted text-sm">Deploy strategic mandates and manage system-wide automation.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div>
          
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
             <div className="p-2 bg-accent/10 text-accent rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></div>
             Deploy Strategic Mandate
          </h2>
          
          <div className="mb-8 bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 flex gap-4 text-sm">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-lg shadow-blue-600/20">!</div>
            <div>
              <p className="font-bold text-blue-900 mb-1">What is a Shared Goal?</p>
              <p className="text-blue-800/70 leading-relaxed">This tool bypasses the standard employee-driven goal setting. Use it to push mandatory KPIs (e.g., "Reduce cloud costs by 15%") directly into the sheets of selected staff. These goals appear as **locked** entries with a fixed 10% weightage.</p>
            </div>
          </div>

          <form onSubmit={handlePush} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Target Stakeholders (ID String)</label>
              <input 
                type="text" value={pushData.employeeIds} onChange={e => setPushData({...pushData, employeeIds: e.target.value})}
                placeholder="e.g. 101, 102, 105"
                className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:border-accent focus:ring-4 focus:ring-accent/10 rounded-2xl transition-all outline-none text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Mandatory Goal Title</label>
              <input 
                type="text" value={pushData.title} onChange={e => setPushData({...pushData, title: e.target.value})}
                placeholder="e.g. Security Compliance Certification"
                className="w-full p-4 bg-slate-50 border-transparent focus:bg-white focus:border-accent focus:ring-4 focus:ring-accent/10 rounded-2xl transition-all outline-none text-sm"
              />
            </div>
            
            <button 
              type="submit" disabled={loading}
              className="btn-accent w-full"
            >
              {loading ? 'Propagating Goal...' : 'Propagate to Employees'}
            </button>
          </form>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 rounded-3xl bg-primary text-white shadow-primary/30">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
               <div className="p-2 bg-white/10 rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
               Automation Hub
            </h2>
            <p className="text-blue-100 text-xs leading-relaxed mb-6">In production, these jobs run daily at midnight. Use the manual trigger below to simulate the system processing:
              <ul className="mt-3 space-y-2 list-disc ml-4 opacity-80">
                <li>Automated Email Notifications</li>
                <li>Escalation Engine Processing</li>
                <li>Goal Health Recalculation</li>
              </ul>
            </p>
            <button 
              onClick={async () => {
                try {
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                  await axios.post(`${apiUrl}/api/dev/trigger-cron`, {}, { headers: { Authorization: `Bearer ${token}` } });
                  toast.success('System automation cycles completed!');
                } catch (e) {
                  toast.error('Automation cycle failed');
                }
              }}
              className="w-full bg-white text-primary hover:bg-blue-50 py-3 rounded-2xl font-bold text-sm transition-all shadow-xl active:scale-95"
            >
              Run Automation Sync
            </button>
          </div>

          <div className="glass-card p-8 rounded-3xl border-slate-100">
             <h3 className="font-bold text-slate-800 mb-2">Governance Note</h3>
             <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-wider">All actions taken in this manager are recorded in the system audit log for regulatory compliance and transparency.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgManager;
