import React from 'react';

const StatusBadge = ({ status }) => {
  const map = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    submitted: { label: 'Submitted (Awaiting Review)', color: 'bg-warning/20 text-warning border-warning/30' },
    approved: { label: 'Approved', color: 'bg-success/20 text-success border-success/30' },
    rework: { label: 'Needs Rework', color: 'bg-danger/20 text-danger border-danger/30' },
  };

  const config = map[status] || { label: status, color: 'bg-gray-100' };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
