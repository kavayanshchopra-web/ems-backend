// OmniFlow WhatsApp CRM - Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[OmniFlow] WhatsApp CRM Extension Installed Successfully.');
  chrome.storage.local.get(['omniflow_gateway', 'omniflow_token'], (res) => {
    if (!res.omniflow_gateway) {
      chrome.storage.local.set({
        omniflow_gateway: 'https://app.employeemanagementsystems.com',
        omniflow_user: { name: 'Staff User', role: 'staff' }
      });
    }
  });
});

// Follow-up Alarm Notification Listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('followup_')) {
    const contactPhone = alarm.name.replace('followup_', '');
    chrome.storage.local.get([`alarm_data_${contactPhone}`], (data) => {
      const details = data[`alarm_data_${contactPhone}`] || {};
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `⏰ Follow-up Reminder: ${details.name || contactPhone}`,
        message: details.note || 'You have a scheduled customer follow-up right now on WhatsApp!',
        priority: 2
      });
    });
  }
});
