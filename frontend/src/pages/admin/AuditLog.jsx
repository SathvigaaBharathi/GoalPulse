import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';

// Human-readable labels for each change_type
const EVENT_META = {
  sheet_submit:      { label: 'Goal Sheet Submitted',       color: 'bg-blue-50 text-blue-600 border-blue-100' },
  sheet_approve:     { label: 'Goal Sheet Approved',        color: 'bg-success/10 text-success border-success/20' },
  sheet_rework:      { label: 'Sheet Returned for Rework',  color: 'bg-orange-50 text-orange-500 border-orange-100' },
  checkin_submit:    { label: 'Quarter Check-in Submitted', color: 'bg-accent/10 text-accent border-accent/20' },
  checkin_update:    { label: 'Quarter Check-in Updated',   color: 'bg-accent/10 text-accent border-accent/20' },
  manager_comment:   { label: 'Manager Review Comment',     color: 'bg-purple-50 text-purple-600 border-purple-100' },
  manager_edit:      { label: 'Manager Edited Goal',        color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  admin_unlock:      { label: 'Admin Unlocked Goal',        color: 'bg-danger/10 text-danger border-danger/20' },
  shared_goal_push:  { label: 'Shared Goal Pushed',         color: 'bg-primary/10 text-primary border-primary/20' },
};

const parseJson = (str) => {
  try { return JSON.parse(str); } catch { return null; }
};

const PayloadSummary = ({ changeType, newValue, oldValue }) => {
  const parsed = parseJson(newValue);

  switch (changeType) {
    case 'sheet_submit':
      return <span className="text-slate-600 text-xs">Status changed <span className="font-bold">draft → submitted</span></span>;

    case 'sheet_approve':
      return <span className="text-slate-600 text-xs">Status changed <span className="font-bold">submitted → approved</span>. Goals locked.</span>;

    case 'sheet_rework':
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-600 text-xs">Returned to employee for revision</span>
          {parsed?.reason && <span className="text-xs text-slate-500 italic">"{parsed.reason}"</span>}
        </div>
      );

    case 'checkin_submit':
    case 'checkin_update':
      return parsed ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm">
            {parsed.quarter}
          </span>
          <span className="text-xs text-slate-600">
            Actual: <span className="font-bold text-primary">{parsed.actual_value ?? '—'}</span>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${
            parsed.status === 'completed' ? 'bg-success/10 text-success border-success/20' :
            parsed.status === 'on_track'  ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
            'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            {parsed.status?.replace('_', ' ')}
          </span>
        </div>
      ) : <span className="text-slate-400 text-xs">Check-in recorded</span>;

    case 'manager_comment':
      return parsed ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-600 text-xs">
            Comment on <span className="font-bold">{parsed.quarter}</span>
          </span>
          <span className="text-xs text-slate-500 italic truncate max-w-xs" title={parsed.comment}>
            "{parsed.comment}"
          </span>
        </div>
      ) : <span className="text-slate-400 text-xs">Comment added</span>;

    case 'manager_edit': {
      const before = parseJson(oldValue);
      const after = parseJson(newValue);
      const changed = after && before
        ? Object.keys(after).filter(k => after[k] !== before[k] && ['title','target_value','weightage','uom_type'].includes(k))
        : [];
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-600 text-xs">Post-approval goal edit</span>
          {changed.length > 0 && (
            <span className="text-[10px] text-slate-400 font-mono">
              Changed: {changed.map(k => `${k}: ${before[k]} → ${after[k]}`).join(' · ')}
            </span>
          )}
        </div>
      );
    }

    case 'admin_unlock':
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-danger font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-danger rounded-full"></div> Administrative Override
          </span>
          {parsed?.reason && <span className="text-xs text-slate-500 italic">"{parsed.reason}"</span>}
        </div>
      );

    case 'shared_goal_push':
      return parsed ? (
        <span className="text-xs text-slate-600">
          Pushed "<span className="font-bold">{parsed.title}</span>" to employee #{parsed.employee_id}
        </span>
      ) : <span className="text-slate-400 text-xs">Shared goal distributed</span>;

    default:
      return <span className="text-slate-400 text-xs font-mono truncate block max-w-xs">{newValue}</span>;
  }
};

const AuditLog = () => {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterUser, setFilterUser] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/admin/audit-log`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  const filtered = logs.filter(l => {
    const matchType = !filterType || l.change_type === filterType;
    const matchUser = !filterUser || l.changed_by_name.toLowerCase().includes(filterUser.toLowerCase());
    return matchType && matchUser;
  });

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">System Audit Trail</h1>
          <p className="text-muted text-sm">Comprehensive immutable record of all system configuration changes and user interactions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-6 rounded-2xl flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Event Type</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent min-w-[220px]"
          >
            <option value="">All Events</option>
            {Object.entries(EVENT_META).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1">Actor</label>
          <input
            type="text"
            placeholder="Search by name..."
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent min-w-[200px]"
          />
        </div>
        <span className="text-[10px] font-bold px-3 py-2 bg-slate-100 text-slate-500 rounded-xl uppercase tracking-widest self-end">
          {filtered.length} / {logs.length} records
        </span>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Master Transaction Log</h3>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SECURE RECORD · SHA-256</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                <th className="p-6 font-bold">Timestamp</th>
                <th className="p-6 font-bold">Actor</th>
                <th className="p-6 font-bold">Event</th>
                <th className="p-6 font-bold">Target</th>
                <th className="p-6 font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white text-sm">
              {filtered.map((log) => {
                const meta = EVENT_META[log.change_type] || { label: log.change_type, color: 'bg-slate-100 text-slate-500 border-slate-200' };
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 text-xs text-slate-500 font-medium whitespace-nowrap">
                      {new Date(log.changed_at + 'Z').toLocaleString()}
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {log.changed_by_name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-700">{log.changed_by_name}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tighter ${meta.color}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="p-6 text-slate-500 text-xs font-mono">
                      {log.entity_type} <span className="text-accent font-bold">#{log.entity_id}</span>
                    </td>
                    <td className="p-6">
                      <PayloadSummary
                        changeType={log.change_type}
                        newValue={log.new_value}
                        oldValue={log.old_value}
                      />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-20 text-center">
                    <p className="text-slate-400 font-medium italic">No transactions recorded in the current timeframe.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
