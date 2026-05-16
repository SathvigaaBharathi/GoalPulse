import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#1b9e4b', '#eab308', '#e2e8f0']; // success, warning, gray

const AnalyticsDashboard = () => {
  const { token } = useAuthStore();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [data, setData] = useState({ completionByQuarter: [], distribution: [] });
  const [loading, setLoading] = useState(true);

  // Fetch cycles on mount
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/analytics/cycles`, { headers: { Authorization: `Bearer ${token}` } });
        setCycles(res.data);
        if (res.data.length > 0) {
          const active = res.data.find(c => c.is_active) || res.data[0];
          setSelectedCycleId(active.id.toString());
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCycles();
  }, [token]);

  // Fetch data when cycle changes
  useEffect(() => {
    if (!selectedCycleId) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/analytics/overview?cycleId=${selectedCycleId}`, { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedCycleId, token]);

  if (!selectedCycleId) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Intelligence Dashboard</h1>
          <p className="text-muted text-sm">Real-time performance analytics and goal distribution metrics.</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-slate-600">Active View Context:</label>
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="border-slate-200 rounded-xl shadow-sm text-sm p-3 bg-white focus:ring-2 focus:ring-accent outline-none transition-all cursor-pointer min-w-[240px]"
          >
            {cycles.map(c => (
              <option key={c.id} value={c.id}>Cycle #{c.id}: {c.name} {c.is_active ? '● ACTIVE' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading charts...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Check-in Completion Trends */}
          <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-all"></div>
            <h2 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
              <div className="p-2 bg-accent/10 text-accent rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg></div>
              Check-in Completion Funnel
            </h2>
            <div className="h-72 flex items-center justify-center">
              {data.completionByQuarter.reduce((acc, curr) => acc + curr.submitted + curr.pending, 0) === 0 ? (
                <div className="text-center">
                  <div className="p-4 bg-slate-50 rounded-full inline-block mb-3 text-slate-300"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg></div>
                  <p className="font-bold text-slate-400">Zero Target Activity</p>
                  <p className="text-xs text-slate-400">Approved goals are required for trend analysis.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.completionByQuarter}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', color: '#64748b' }} />
                    <Bar dataKey="submitted" name="Completed Tasks" stackId="a" fill="#00C2A8" radius={[0, 0, 8, 8]} barSize={40} />
                    <Bar dataKey="pending" name="Awaiting Input" stackId="a" fill="#F1F5F9" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Goal Status Distribution */}
          <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
            <h2 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg></div>
              Portfolio Health
            </h2>
            <div className="h-72 flex items-center justify-center">
              {data.distribution.length === 1 && data.distribution[0].name === 'No Data' ? (
                <div className="text-center">
                  <div className="p-4 bg-slate-50 rounded-full inline-block mb-3 text-slate-300"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg></div>
                  <p className="font-bold text-slate-400">Awaiting Logged Data</p>
                  <p className="text-xs text-slate-400">Status health requires at least one quarterly check-in.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
