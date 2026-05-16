const templates = {
  goalSheetSubmitted: (employeeName, goalCount) => ({
    subject: `[GoalPulse] ${employeeName} has submitted goals for review`,
    text: `Employee ${employeeName} has submitted ${goalCount} goals for your approval. Please review them in your Approval Queue.`
  }),
  
  goalSheetApproved: (managerName, cycleName) => ({
    subject: `[GoalPulse] Your goals have been approved`,
    text: `Your manager ${managerName} has approved your goal sheet for ${cycleName}. Your goals are now locked.`
  }),
  
  goalSheetRework: (managerName, reason) => ({
    subject: `[GoalPulse] Your goals need revision`,
    text: `Your manager ${managerName} has returned your goal sheet for rework. Reason: "${reason}". Please review and resubmit.`
  }),
  
  checkinWindowOpen: (quarter, openDate, closeDate) => ({
    subject: `[GoalPulse] ${quarter} Check-in window is now open`,
    text: `The check-in window for ${quarter} is now open. You can log your progress from ${openDate} until ${closeDate}.`
  }),
  
  checkinReminder: (quarter, closeDate) => ({
    subject: `[GoalPulse] Reminder: ${quarter} Check-in closes soon`,
    text: `Reminder: The check-in window for ${quarter} closes on ${closeDate}. Please submit your updates soon.`
  })
};

module.exports = templates;
