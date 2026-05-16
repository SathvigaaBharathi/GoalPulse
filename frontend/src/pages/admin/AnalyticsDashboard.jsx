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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Analytics Overview</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Performance Cycle:</label>
          <select 
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm text-sm p-2 bg-white"
          >
            {cycles.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.is_active ? '(Active)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading charts...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Check-in Completion Trends */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-primary mb-6">Check-in Completion (Active Goals)</h2>
            <div className="h-72 flex items-center justify-center">
              {data.completionByQuarter.reduce((acc, curr) => acc + curr.submitted + curr.pending, 0) === 0 ? (
                <div className="text-center text-gray-400">
                  <p className="font-semibold mb-1">No data available</p>
                  <p className="text-sm">Goals must be submitted and approved to appear here.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.completionByQuarter}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Legend />
                    <Bar dataKey="submitted" name="Submitted" stackId="a" fill="#00a892" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="pending" name="Pending" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Goal Status Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-primary mb-6">Current Goal Status (Latest Quarter)</h2>
            <div className="h-72 flex items-center justify-center">
              {data.distribution.length === 1 && data.distribution[0].name === 'No Data' ? (
                <div className="text-center text-gray-400">
                  <p className="font-semibold mb-1">No check-ins logged</p>
                  <p className="text-sm">Employees need to complete a quarterly check-in first.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
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
