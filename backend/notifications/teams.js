/**
 * Sends a Microsoft Teams adaptive card notification when a team member submits/updates goals.
 * Preserves deep-links for managers to navigate directly to the relevant dashboard.
 */
async function sendTeamsNotification(event, data) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  const frontendUrl = process.env.VITE_REDIRECT_URI || 'http://localhost:5173';
  
  let title = '';
  let text = '';
  let facts = [];
  let actionUrl = `${frontendUrl}/manager/queue`;

  if (event === 'goal_submit') {
    title = '🎯 Goal Sheet Submitted';
    text = `An employee has submitted a new goal sheet for review.`;
    facts = [
      { name: 'Employee', value: data.employeeName },
      { name: 'Department', value: data.department || 'General' },
      { name: 'Goal Count', value: `${data.goalCount}` },
      { name: 'Active Cycle', value: data.cycleName || 'Current Cycle' }
    ];
    actionUrl = `${frontendUrl}/manager/queue`;
  } else if (event === 'goal_update') {
    title = '📈 Achievements Updated';
    text = `A team member has updated their quarterly goal achievements.`;
    facts = [
      { name: 'Employee', value: data.employeeName },
      { name: 'Quarter', value: data.quarter },
      { name: 'Status', value: data.status || 'Updated' }
    ];
    actionUrl = `${frontendUrl}/manager/checkins`;
  } else {
    return;
  }

  // Create standard MS Teams Adaptive Card JSON payload
  const cardPayload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.2',
          body: [
            {
              type: 'TextBlock',
              text: title,
              weight: 'bolder',
              size: 'medium',
              color: 'accent'
            },
            {
              type: 'TextBlock',
              text: text,
              wrap: true
            },
            {
              type: 'FactSet',
              facts: facts
            }
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View in GoalPulse',
              url: actionUrl
            }
          ]
        }
      }
    ]
  };

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardPayload)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log(`[Teams Notification] Successfully dispatched adaptive card webhook for event: ${event}`);
    } catch (err) {
      console.error(`[Teams Notification] Webhook POST failed:`, err.message);
    }
  } else {
    console.log('\n=================== MOCK MICROSOFT TEAMS NOTIFICATION ===================');
    console.log(`Event: ${event.toUpperCase()}`);
    console.log(`Card Title: ${title}`);
    console.log(`Card Description: ${text}`);
    console.log('Facts Grid:');
    facts.forEach(f => console.log(`  - ${f.name}: ${f.value}`));
    console.log(`Deep Link URL: ${actionUrl}`);
    console.log('Adaptive Card JSON Payload Schema:');
    console.log(JSON.stringify(cardPayload, null, 2));
    console.log('=========================================================================\n');
  }
}

module.exports = { sendTeamsNotification };
