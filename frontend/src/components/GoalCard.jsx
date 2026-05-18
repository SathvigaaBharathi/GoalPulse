import React, { useState } from 'react';
import { Lock, Unlock, Zap, Edit2 } from 'lucide-react';

const GoalCard = ({ goal, onUpdate, isManagerView, isEditable }) => {
  const [editing, setEditing] = useState(false);
  const [weightage, setWeightage] = useState(goal.weightage);
  const [target, setTarget] = useState(goal.target_value);

  const handleSave = () => {
    onUpdate(goal.id, { weightage: Number(weightage), target_value: Number(target) });
    setEditing(false);
  };

  return (
    <div className={`p-4 rounded-xl border ${goal.is_shared ? 'border-accent bg-accent/5' : 'border-gray-200 bg-white'} shadow-sm relative group`}>
      {goal.is_shared && (
        <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
          <Zap size={10} /> Shared
        </span>
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">{goal.thrust_area_name}</span>
          <h3 className="text-lg font-bold text-primary mt-1">{goal.title}</h3>
        </div>
        {goal.is_locked ? <Lock size={16} className="text-gray-400" /> : <Unlock size={16} className="text-gray-400" />}
      </div>
      
      <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
      
      <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-3">
        <div>
          <span className="block text-xs text-gray-500 mb-1">Target</span>
          {editing && (isManagerView || (!goal.is_shared && !goal.is_locked)) ? (
            <input 
              type="number" 
              value={target} 
              onChange={e => setTarget(e.target.value)}
              className="w-full text-sm p-1 border rounded"
            />
          ) : (
            <span className="text-sm font-semibold">
              {goal.target_value || goal.target_date || 'N/A'} <span className="text-xs font-normal text-gray-400">({goal.uom_type})</span>
              {goal.score_cap < 150 && (
                <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm ml-2">
                  Capped at {goal.score_cap}%
                </span>
              )}
            </span>
          )}
        </div>
        
        <div>
          <span className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            Weightage
            <span 
              className="cursor-help text-gray-400 hover:text-primary transition-colors"
              title="This is a progress indicator only. It does not represent a performance rating or appraisal score."
            >
              ⓘ
            </span>
          </span>
          {editing && (isManagerView || (!goal.is_locked)) ? (
            <input 
              type="number" 
              value={weightage} 
              onChange={e => setWeightage(e.target.value)}
              className="w-full text-sm p-1 border rounded"
              min="10" max="100"
            />
          ) : (
            <span className="text-sm font-semibold">{goal.weightage}%</span>
          )}
        </div>
        
        <div className="flex items-end justify-end">
          {!editing && isEditable && (
            <button onClick={() => setEditing(true)} className="text-accent hover:text-primary transition-colors">
              <Edit2 size={16} />
            </button>
          )}
          {editing && (
            <button onClick={handleSave} className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-[#152a46]">
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalCard;
