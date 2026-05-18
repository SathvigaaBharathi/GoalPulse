import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import { User, X } from 'lucide-react';
import toast from 'react-hot-toast';

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
            <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${depth === 0 ? 'text-white/80' : 'text-slate-500'}`}>
              <span className="flex items-center gap-1 font-medium"><User size={12}/> {goal.ownerName}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${depth === 0 ? 'bg-white/20' : 'bg-slate-200'}`}>{goal.ownerRole}</span>
              <span className="truncate max-w-[120px]">&bull; {goal.thrustArea}</span>
              {goal.ownerDept && <span className="font-bold text-slate-400 capitalize">({goal.ownerDept})</span>}
            </div>

            {/* Cross-department dependency tag */}
            {goal.isCrossDept && (
              <div className="mt-2 flex">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full shadow-sm">
                  🔗 Depends on: {goal.parentThrustArea || 'Strategic Objective'} &middot; <span className="capitalize">{goal.parentOwnerDept || 'Other Dept'}</span>
                </span>
              </div>
            )}

            {/* Parent goal with cross-dept dependent children count */}
            {goal.crossDeptChildrenCount > 0 && (
              <div className="mt-2 flex">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full shadow-sm">
                  ← {goal.crossDeptChildrenCount} cross-dept goal{goal.crossDeptChildrenCount > 1 ? 's' : ''} depend{goal.crossDeptChildrenCount === 1 ? 's' : ''} on this
                </span>
              </div>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <ProgressRing score={goal.progressScore} size={depth === 0 ? 40 : 32} />
          </div>
        </div>
      </div>
      
      {/* Children Container */}
      {goal.children && goal.children.length > 0 && (
        <div className="ml-6 mt-4 pl-6 flex flex-col gap-4 relative">
          {goal.children.map((child, idx) => {
            const isLast = idx === goal.children.length - 1;
            const isCross = child.isCrossDept;
            return (
              <div key={child.id} className="relative">
                {/* Vertical connector line segment for this child */}
                <div 
                  className={`absolute -left-6 top-0 bottom-0 ${isLast ? 'h-6' : 'h-full'} ${
                    isCross 
                      ? 'connector-cross-dept' 
                      : 'connector-vertical border-l-2 border-dashed'
                  }`}
                />
                
                {/* Horizontal connector line segment to this child */}
                <div 
                  className={`absolute -left-6 top-6 w-6 border-t-2 ${
                    isCross 
                      ? 'border-dashed border-amber-500' 
                      : 'border-dashed border-teal-300'
                  }`}
                />
                <GoalNode goal={child} onSelect={onSelect} depth={depth + 1} />
              </div>
            );
          })}
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

  // New states for Feature 3
  const [flatGoalsList, setFlatGoalsList] = useState([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newParentId, setNewParentId] = useState('');
  const [isCrossConfirmOpen, setIsCrossConfirmOpen] = useState(false);
  const [crossConfirmData, setCrossConfirmData] = useState(null);
  const [savingLink, setSavingLink] = useState(false);

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

  useEffect(() => {
    fetchCycles();
  }, [token]);

  const fetchGoals = async () => {
    if (!selectedCycleId) return;
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/goals/cascade?cycleId=${selectedCycleId}`, { headers: { Authorization: `Bearer ${token}` } });
      
      // Build tree
      const flat = res.data;
      setFlatGoalsList(flat);
      
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

  useEffect(() => {
    fetchGoals();
  }, [selectedCycleId, token]);

  // Exclude selected goal itself
  const candidateGoals = flatGoalsList.filter(g => selectedGoal && g.id !== selectedGoal.id);

  const handleSaveLink = (e) => {
    if (e) e.preventDefault();
    
    if (newParentId) {
      const selectedParent = flatGoalsList.find(g => g.id === Number(newParentId));
      if (selectedParent && selectedParent.ownerDept !== selectedGoal.ownerDept) {
        setCrossConfirmData({
          parentTitle: selectedParent.title,
          parentDept: selectedParent.ownerDept
        });
        setIsCrossConfirmOpen(true);
        return;
      }
    }
    
    executeLinkParent(newParentId);
  };

  const executeLinkParent = async (parentId) => {
    setSavingLink(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const payload = { parentGoalId: parentId ? Number(parentId) : null };
      await axios.post(`${apiUrl}/api/goals/${selectedGoal.id}/link-parent`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Parent goal link updated successfully!');
      setShowLinkModal(false);
      setIsCrossConfirmOpen(false);
      setSelectedGoal(null); // close drawer to refresh
      fetchGoals();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update parent link');
    } finally {
      setSavingLink(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-up relative">
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-sans">Goal Alignment Cascade</h1>
          <p className="text-muted text-sm">Visualizing strategic connectivity from organization to individual.</p>
        </div>

        {/* Cascade Legend */}
        <div className="flex items-center gap-6 text-xs bg-white/80 border border-slate-200/60 p-3 rounded-2xl shadow-sm font-sans">
          <div className="flex items-center gap-2">
            <span className="w-8 border-t-2 border-teal-500 inline-block"></span>
            <span className="font-bold text-slate-600">Same department</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 border-t-2 border-dashed border-amber-500 inline-block"></span>
            <span className="font-bold text-slate-600">Cross-department dependency</span>
          </div>
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
                  {selectedGoal.ownerDept && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize">{selectedGoal.ownerDept}</span>
                  )}
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
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="p-4 bg-accent/5 border border-accent/10 rounded-2xl text-xs">
                     <p className="text-slate-600 leading-relaxed">
                       <span className="font-bold text-accent block mb-1">Administrative Linker</span>
                       You can adjust the hierarchical parent goal link for this objective inside the organization cascade.
                     </p>
                  </div>
                  <button
                    onClick={() => {
                      setNewParentId(selectedGoal.parentGoalId || '');
                      setIsCrossConfirmOpen(false);
                      setShowLinkModal(true);
                    }}
                    className="w-full bg-accent text-white hover:bg-accent-hover py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 active:scale-95"
                  >
                    🔗 Link Parent Goal
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Link Parent Modal */}
      {showLinkModal && selectedGoal && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"></div>
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-6 relative font-sans">
              <button 
                onClick={() => { setShowLinkModal(false); setIsCrossConfirmOpen(false); }}
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X size={18} />
              </button>
              
              <div>
                <h3 className="text-xl font-black text-slate-800">Link Parent Goal</h3>
                <p className="text-xs text-slate-400 mt-1">Select a high-level strategic alignment goal for this objective.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Goal</div>
                <div className="font-bold text-slate-700 text-sm">{selectedGoal.title}</div>
                <div className="text-xs text-slate-500 capitalize">{selectedGoal.ownerName} &bull; {selectedGoal.ownerDept || 'General'}</div>
              </div>

              {!isCrossConfirmOpen ? (
                <form onSubmit={handleSaveLink} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Parent Goal Selection</label>
                    <select
                      value={newParentId}
                      onChange={(e) => setNewParentId(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-accent text-sm"
                    >
                      <option value="">-- No Parent (Root Strategic Goal) --</option>
                      {candidateGoals.map(g => (
                        <option key={g.id} value={g.id}>
                          [{g.ownerDept?.toUpperCase() || 'ORG'}] {g.title} ({g.ownerName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowLinkModal(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingLink}
                      className="flex-1 bg-accent text-white hover:bg-accent-hover py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-accent/20"
                    >
                      {savingLink ? 'Updating Link...' : 'Link Parent'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6 animate-fade-up">
                  <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex gap-4">
                    <span className="text-2xl shrink-0">⚠️</span>
                    <div className="text-sm">
                      <h4 className="font-extrabold text-amber-900 mb-1">Cross-department dependency</h4>
                      <p className="text-amber-800 leading-relaxed">
                        &ldquo;{crossConfirmData?.parentTitle}&rdquo; belongs to <span className="font-extrabold capitalize">{crossConfirmData?.parentDept}</span>.
                        This will be shown as a horizontal dependency in the cascade view.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setIsCrossConfirmOpen(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingLink}
                      onClick={() => executeLinkParent(newParentId)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
                    >
                      {savingLink ? 'Linking...' : 'Confirm Link'}
                    </button>
                  </div>
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
