import React from 'react';

const WeightageValidator = ({ goals }) => {
  const total = goals.reduce((sum, g) => sum + (Number(g.weightage) || 0), 0);
  const isValid = total === 100;
  
  let colorClass = 'bg-accent';
  if (total > 100) colorClass = 'bg-danger';
  else if (total < 100) colorClass = 'bg-warning';
  else colorClass = 'bg-success';

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-primary">Weightage Allocation</span>
        <span className={`text-sm font-bold ${isValid ? 'text-success' : (total > 100 ? 'text-danger' : 'text-warning')}`}>
          {total}% / 100%
        </span>
      </div>
      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${colorClass}`} 
          style={{ width: \`\${Math.min(total, 100)}%\` }}
        />
      </div>
      {!isValid && (
        <p className="text-xs mt-2 text-gray-500">
          Total weightage must be exactly 100% to submit your goal sheet.
        </p>
      )}
    </div>
  );
};

export default WeightageValidator;
