// OmniFlow WhatsApp Web CRM - Content Script
(function () {
  let activePhone = null;
  let activeName = null;
  let dockMounted = false;
  let currentContactData = {};

  const DEFAULT_API = 'https://retention-ellen-beijing-motorcycles.trycloudflare.com';

  console.log('[OmniFlow] WhatsApp Web CRM Injected & Ready.');

  function init() {
    createDock();
    observeChatHeader();
  }

  // Create & Inject Floating CRM Dock
  function createDock() {
    if (document.getElementById('omniflow-sidebar-dock')) return;

    const dock = document.createElement('div');
    dock.id = 'omniflow-sidebar-dock';
    dock.innerHTML = `
      <div class="of-header">
        <div class="of-header-title">
          <span>⚡ OmniFlow CRM</span>
        </div>
        <div class="of-status-badge">
          <span class="of-status-dot"></span> Cloud Synced
        </div>
      </div>

      <div class="of-body" id="of-dock-body">
        <div class="of-card" id="of-contact-card">
          <div class="of-contact-profile">
            <div class="of-contact-avatar" id="of-avatar">?</div>
            <div class="of-contact-info">
              <div class="of-contact-name" id="of-name">Select a WhatsApp Chat</div>
              <div class="of-contact-phone" id="of-phone">No chat active</div>
            </div>
          </div>
        </div>

        <!-- CRM Lead Pipeline -->
        <div class="of-card">
          <div class="of-card-title">Lead Stage & Pipeline</div>
          <select class="of-select" id="of-stage-select">
            <option value="new">🟢 New Lead</option>
            <option value="contacted">🔵 Contacted</option>
            <option value="interested">🟡 Interested / Hot</option>
            <option value="proposal">🟣 Proposal Sent</option>
            <option value="won">🏆 Closed Won</option>
          </select>

          <label style="font-size: 10px; color: #8696a0; margin-top: 8px; display: block;">Deal Value (₹ / $):</label>
          <input type="number" class="of-input" id="of-deal-value" placeholder="e.g. 50000" />
        </div>

        <!-- Follow-up Scheduler -->
        <div class="of-card">
          <div class="of-card-title">⏰ Set Follow-up Alarm</div>
          <input type="datetime-local" class="of-input" id="of-followup-time" />
          <input type="text" class="of-input" id="of-followup-note" placeholder="Follow-up topic..." />
          <button class="of-btn" id="of-btn-set-followup">Schedule Follow-up</button>
        </div>

        <!-- Notes & Tags -->
        <div class="of-card">
          <div class="of-card-title">Lead Notes</div>
          <textarea class="of-textarea" id="of-notes" placeholder="Add interaction summary..."></textarea>
          <button class="of-btn" id="of-btn-save-crm">💾 Save to OmniFlow Cloud</button>
        </div>

        <!-- Quick Reply Vault -->
        <div class="of-card">
          <div class="of-card-title">⚡ 1-Click Quick Replies</div>
          <div id="of-quick-replies-list">
            <button class="of-quick-reply-btn" data-text="Hello! Thank you for contacting us. How can we help you today?">👋 Greeting & Welcome</button>
            <button class="of-quick-reply-btn" data-text="Here is our product catalog and pricing breakdown: https://employeemanagementsystems.com">📄 Catalog & Pricing</button>
            <button class="of-quick-reply-btn" data-text="Can we schedule a quick 5-minute phone call to finalize the requirements?">📞 Request Phone Call</button>
          </div>
        </div>
      </div>
    `;

    const toggleTab = document.createElement('div');
    toggleTab.id = 'omniflow-toggle-tab';
    toggleTab.innerText = '⚡ OMNIFLOW CRM';
    toggleTab.onclick = () => {
      dock.classList.toggle('collapsed');
    };

    document.body.appendChild(dock);
    document.body.appendChild(toggleTab);
    dockMounted = true;

    bindEvents();
  }

  function bindEvents() {
    // Save CRM details
    document.getElementById('of-btn-save-crm')?.addEventListener('click', saveCRMDetails);

    // Schedule Follow-up
    document.getElementById('of-btn-set-followup')?.addEventListener('click', scheduleFollowUp);

    // Quick replies injection
    document.querySelectorAll('.of-quick-reply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        insertTextIntoWhatsAppInput(text);
      });
    });
  }

  // Insert text into WhatsApp Web active composer
  function insertTextIntoWhatsAppInput(text) {
    const inputEl = document.querySelector('footer div[contenteditable="true"]');
    if (!inputEl) return;
    inputEl.focus();
    document.execCommand('insertText', false, text);
  }

  // Observe active chat header for contact changes
  function observeChatHeader() {
    setInterval(() => {
      // Find active chat header element
      const headerTitle = document.querySelector('#main header span[dir="auto"], #main header [title]');
      if (!headerTitle) return;

      const contactName = headerTitle.getAttribute('title') || headerTitle.innerText || '';
      
      // Try to extract phone number from title or subtitle
      const subTitleEl = document.querySelector('#main header span[class*="matched-text"], #main header div[class*="copyable-text"]');
      let phone = subTitleEl ? subTitleEl.innerText.replace(/[^0-9+]/g, '') : '';
      if (!phone && contactName.startsWith('+')) {
        phone = contactName.replace(/[^0-9+]/g, '');
      }

      if (contactName && (contactName !== activeName || phone !== activePhone)) {
        activeName = contactName;
        activePhone = phone || contactName;
        updateDockUI(activeName, activePhone);
      }
    }, 1500);
  }

  // Update Dock UI when chat switches
  function updateDockUI(name, phone) {
    const nameEl = document.getElementById('of-name');
    const phoneEl = document.getElementById('of-phone');
    const avatarEl = document.getElementById('of-avatar');

    if (nameEl) nameEl.innerText = name;
    if (phoneEl) phoneEl.innerText = phone || 'WhatsApp DM';
    if (avatarEl) avatarEl.innerText = (name || 'C')[0].toUpperCase();

    // Fetch existing details from storage / Cloud
    chrome.storage.local.get([`crm_${phone || name}`], (res) => {
      const data = res[`crm_${phone || name}`] || {};
      const stageEl = document.getElementById('of-stage-select');
      const notesEl = document.getElementById('of-notes');
      const dealEl = document.getElementById('of-deal-value');

      if (stageEl && data.stage) stageEl.value = data.stage;
      if (notesEl && data.notes) notesEl.value = data.notes;
      if (dealEl && data.dealValue) dealEl.value = data.dealValue;
    });
  }

  // Save CRM to local and Cloud API
  async function saveCRMDetails() {
    if (!activePhone && !activeName) {
      alert('Please open a WhatsApp chat first!');
      return;
    }

    const stage = document.getElementById('of-stage-select')?.value || 'new';
    const notes = document.getElementById('of-notes')?.value || '';
    const dealValue = document.getElementById('of-deal-value')?.value || '';
    const key = `crm_${activePhone || activeName}`;

    const payload = {
      name: activeName,
      phone: activePhone,
      stage,
      notes,
      dealValue,
      updatedAt: new Date().toISOString()
    };

    // Save locally
    chrome.storage.local.set({ [key]: payload }, () => {
      const btn = document.getElementById('of-btn-save-crm');
      if (btn) {
        btn.innerText = '✅ Saved & Synced!';
        setTimeout(() => { btn.innerText = '💾 Save to OmniFlow Cloud'; }, 2000);
      }
    });

    // Sync to Cloud API
    chrome.storage.local.get(['omniflow_gateway', 'omniflow_token'], async (res) => {
      const gateway = res.omniflow_gateway || DEFAULT_API;
      try {
        await fetch(`${gateway}/api/contacts/crm-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(res.omniflow_token ? { 'Authorization': `Bearer ${res.omniflow_token}` } : {})
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('[OmniFlow] Cloud sync queued:', err.message);
      }
    });
  }

  // Schedule follow-up
  function scheduleFollowUp() {
    const timeVal = document.getElementById('of-followup-time')?.value;
    const noteVal = document.getElementById('of-followup-note')?.value || 'Follow-up with customer';

    if (!timeVal) {
      alert('Please select a date and time for the follow-up!');
      return;
    }

    const scheduledTime = new Date(timeVal).getTime();
    const now = Date.now();
    const delayMinutes = (scheduledTime - now) / (1000 * 60);

    if (delayMinutes <= 0) {
      alert('Please select a future time!');
      return;
    }

    const phone = activePhone || activeName || 'lead';
    chrome.alarms.create(`followup_${phone}`, { delayInMinutes: delayMinutes });
    chrome.storage.local.set({
      [`alarm_data_${phone}`]: {
        name: activeName,
        phone: activePhone,
        note: noteVal,
        time: timeVal
      }
    });

    alert(`⏰ Follow-up scheduled for ${new Date(timeVal).toLocaleString()}!`);
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
