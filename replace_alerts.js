const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/pages/manager/TeamCheckIn.jsx',
  'frontend/src/pages/manager/ApprovalQueue.jsx',
  'frontend/src/pages/employee/GoalSheet.jsx',
  'frontend/src/pages/employee/CheckIn.jsx',
  'frontend/src/pages/admin/OrgManager.jsx',
  'frontend/src/pages/admin/AchievementReport.jsx',
  'frontend/src/components/RoleSwitcher.jsx'
];

files.forEach(file => {
  const filePath = path.join('d:/GoalPulse', file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes("import toast from 'react-hot-toast';")) {
    content = content.replace("import { useState", "import toast from 'react-hot-toast';\nimport { useState");
    if (!content.includes("import toast")) {
       // if useState wasn't found, try 'react'
       content = content.replace("import React", "import toast from 'react-hot-toast';\nimport React");
    }
  }

  // Replace alert('...successfully...') or similar with toast.success
  content = content.replace(/alert\('([^']+)'\)/g, (match, msg) => {
    if (msg.toLowerCase().includes('success') || msg.toLowerCase().includes('saved') || msg.toLowerCase().includes('completed')) {
      return `toast.success('${msg}')`;
    }
    return `toast.error('${msg}')`;
  });

  // Replace alert(err...) with toast.error
  content = content.replace(/alert\((err[^)]+)\)/g, "toast.error($1)");
  
  // Replace return alert(...) with toast.error and return
  content = content.replace(/return alert\('([^']+)'\)/g, "{ toast.error('$1'); return; }");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
