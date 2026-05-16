import React from 'react';

const WeightageValidator = ({ goals }) => {
  const total = goals.reduce((sum, g) => sum + (Number(g.weightage) || 0), 0);
  const isValid = total === 100;
  
  let colorClass = 'bg-accent';
  if (total > 100) colorClass = 'bg-danger';
  else if (total < 100) colorClass = 'bg-warning';
  else colorClass = 'bg-success';

  // --- FEATURE 4: Thrust Area Balance Warning ---
  const thrustWeightage = goals.reduce((acc, g) => {
    const name = g.thrust_area_name || 'Unassigned';
    acc[name] = (acc[name] || 0) + g.weightage;
    return acc;
  }, {});

  const maxAreaEntry = Object.entries(thrustWeightage).sort((a, b) => b[1] - a[1])[0];
  const warnings = [];

  if (maxAreaEntry && maxAreaEntry[1] >= 60) {
    warnings.push(`${maxAreaEntry[1]}% of your goals are in "${maxAreaEntry[0]}". Consider diversifying across other thrust areas for a balanced profile.`);
  }

  if (Object.keys(thrustWeightage).length < 2 && goals.length >= 3) {
    warnings.push('All your goals are in one thrust area. Consider adding goals in other areas.');
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-primary">Weightage Allocation</span>
          <span className={`text-sm font-bold ${isValid ? 'text-success' : (total > 100 ? 'text-danger' : 'text-warning')}`}>
            {total}% / 100%
          </span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${colorClass}`} 
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
        {!isValid && (
          <p className="text-xs mt-2 text-gray-500">
            Total weightage must be exactly 100% to submit your goal sheet.
          </p>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 animate-fade-in">
          <div className="text-amber-500 text-lg">⚖️</div>
          <div>
            <h4 className="text-amber-900 font-bold text-xs uppercase tracking-wider mb-1">Thrust Area Balance</h4>
            {warnings.map((w, i) => (
              <p key={i} className="text-amber-800 text-xs leading-relaxed">
                {w} Goals across multiple thrust areas support well-rounded development.
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightageValidator;
