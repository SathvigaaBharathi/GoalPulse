import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import { User, X } from 'lucide-react';

// Progress Ring Component
const ProgressRing = ({ score, size = 32 }) => {
  const normalizedScore = Math.min(Math.max(score, 0), 100);
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;
  
  let color = 'text-red-500';
  if (score >= 80) color = 'text-green-500';
  else if (score >= 50) color = 'text-amber-500';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-200" />
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`${color} transition-all duration-1000`} />
      </svg>
      <span className="absolute text-[8px] font-black">{score}%</span>
    </div>
  );
};

// Tree Node Component
const GoalNode = ({ goal, onSelect, depth = 0 }) => {
  // Styles based on depth
  let cardClass = "";
  if (depth === 0) cardClass = "bg-primary text-white p-5 border-l-4 border-accent shadow-lg"; // Navy
  else if (depth === 1) cardClass = "bg-teal-50 text-slate-800 p-4 border-l-4 border-teal-500 shadow-md"; // Teal
  else cardClass = "bg-white text-slate-800 p-3 border border-slate-200 shadow-sm"; // Compact Employee

  return (
    <div className="flex flex-col relative w-full">
      <div 
        className={`rounded-xl cursor-pointer hover:-translate-y-0.5 transition-transform ${cardClass}`}
        onClick={() => onSelect(goal)}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold truncate ${depth === 0 ? 'text-lg' : depth === 1 ? 'text-md' : 'text-sm'}`}>
              {goal.title}
            </h3>
            <div className={`mt-2 flex items-center gap-3 text-xs ${depth === 0 ? 'text-white/80' : 'text-slate-500'}`}>
              <span className="flex items-center gap-1 font-medium"><User size={12}/> {goal.ownerName}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${depth === 0 ? 'bg-white/20' : 'bg-slate-200'}`}>{goal.ownerRole}</span>
              <span className="truncate max-w-[120px]">&bull; {goal.thrustArea}</span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <ProgressRing score={goal.progressScore} size={depth === 0 ? 40 : 32} />
          </div>
        </div>
      </div>
      
      {/* Children Container */}
      {goal.children && goal.children.length > 0 && (
        <div className="ml-6 mt-4 pl-6 border-l-2 border-dashed border-teal-300 flex flex-col gap-4 relative">
          {goal.children.map(child => (
            <div key={child.id} className="relative">
              {/* Horizontal connector line */}
              <div className="absolute -left-6 top-6 w-6 border-t-2 border-dashed border-teal-300"></div>
              <GoalNode goal={child} onSelect={onSelect} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CascadeView = () => {
  const { token, user } = useAuthStore();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);

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

  useEffect(() => {
    if (!selectedCycleId) return;
    const fetchGoals = async () => {
      setLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await axios.get(`${apiUrl}/api/goals/cascade?cycleId=${selectedCycleId}`, { headers: { Authorization: `Bearer ${token}` } });
        
        // Build tree
        const flat = res.data;
        const idMap = {};
        flat.forEach(g => {
          idMap[g.id] = { ...g, children: [] };
        });

        const roots = [];
        flat.forEach(g => {
          if (g.parentGoalId && idMap[g.parentGoalId]) {
            idMap[g.parentGoalId].children.push(idMap[g.id]);
          } else {
            roots.push(idMap[g.id]);
          }
        });

        setTreeData(roots);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGoals();
  }, [selectedCycleId, token]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-up relative">
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Goal Alignment Cascade</h1>
          <p className="text-muted text-sm">Visualizing strategic connectivity from organization to individual.</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-slate-600">Cycle Context:</label>
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="border-slate-200 rounded-xl shadow-sm text-sm p-3 bg-white focus:ring-2 focus:ring-accent outline-none transition-all cursor-pointer min-w-[200px]"
          >
            {cycles.map(c => (
              <option key={c.id} value={c.id}>Cycle #{c.id}: {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card p-8 rounded-3xl min-h-[500px]">
        {loading ? (
          <div className="text-center py-20 animate-pulse text-slate-400 font-medium">Constructing organizational tree...</div>
        ) : treeData.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No aligned goals found for this cycle.</div>
        ) : (
          <div className="space-y-8">
            {treeData.map(root => (
              <GoalNode key={root.id} goal={root} onSelect={setSelectedGoal} />
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedGoal && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedGoal(null)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform animate-slide-left p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-800">{selectedGoal.title}</h2>
                <div className="mt-2 flex gap-2">
                  <span className="px-2 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-bold uppercase tracking-wider">{selectedGoal.thrustArea}</span>
                </div>
              </div>
              <button onClick={() => setSelectedGoal(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Ownership</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex justify-center items-center text-white font-bold text-lg shadow-sm">
                    {selectedGoal.ownerName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-700">{selectedGoal.ownerName}</div>
                    <div className="text-xs text-slate-500 capitalize">{selectedGoal.ownerRole}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center">
                    <span className="text-3xl font-black text-primary">{selectedGoal.progressScore}%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Progress</span>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center">
                    <span className="text-xl font-bold text-slate-700 font-mono">{selectedGoal.targetValue || 'N/A'}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Target</span>
                 </div>
              </div>

              {user.role !== 'employee' && (
                <div className="p-4 bg-accent/5 border border-accent/10 rounded-2xl text-sm">
                   <p className="text-slate-600">
                     <span className="font-bold text-accent block mb-1">Administrative Note</span>
                     To link or unlink this goal in the cascade hierarchy, please use the Goal Matrix (Org Governance).
                   </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CascadeView;
