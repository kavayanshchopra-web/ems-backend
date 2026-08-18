// OmniFlow WhatsApp CRM - Popup Logic
document.addEventListener('DOMContentLoaded', () => {
  const gatewayInput = document.getElementById('gateway-input');
  const staffInput = document.getElementById('staff-name-input');
  const saveBtn = document.getElementById('save-btn');

  chrome.storage.local.get(['omniflow_gateway', 'omniflow_staff_name'], (res) => {
    if (res.omniflow_gateway) gatewayInput.value = res.omniflow_gateway;
    if (res.omniflow_staff_name) staffInput.value = res.omniflow_staff_name;
  });

  saveBtn.addEventListener('click', () => {
    const gateway = gatewayInput.value.trim() || 'https://retention-ellen-beijing-motorcycles.trycloudflare.com';
    const staffName = staffInput.value.trim() || 'Sales Staff';

    chrome.storage.local.set({
      omniflow_gateway: gateway,
      omniflow_staff_name: staffName
    }, () => {
      saveBtn.innerText = '✅ Saved!';
      setTimeout(() => { saveBtn.innerText = 'Save Configuration'; }, 1500);
    });
  });
});
