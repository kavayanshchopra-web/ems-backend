// OmniFlow Universal Telephony & Dialer Integration - Smart Location Guard Edition
(function () {
  'use strict';

  var CONFIG = {
    API_BASE: 'https://api.employeemanagementsystems.com',
    LOCAL_BRIDGE: 'http://127.0.0.1:9876',
    DEFAULT_DID: '918031496345',
    DEFAULT_EXT: '2MaqwezO',
    DEFAULT_MOBILE: '6283513686'
  };

  // Pre-authorized locations where EMS App is installed
  var KNOWN_INSTALLED_LOCATIONS = [
    '1g4rrRuP0ubwpF6vqWka' // Best Digital Marketing... Ludhiana, PB
  ];

  var verifiedLocationsCache = {};

  function getCurrentLocationId() {
    try {
      var path = window.location.pathname || '';
      var m = path.match(/\/location\/([a-zA-Z0-9_-]+)/);
      if (m && m[1]) return m[1];
      var search = window.location.search || '';
      var sm = search.match(/[?&]location_?id=([a-zA-Z0-9_-]+)/i);
      if (sm && sm[1]) return sm[1];
      var hash = window.location.hash || '';
      var hm = hash.match(/\/location\/([a-zA-Z0-9_-]+)/);
      if (hm && hm[1]) return hm[1];
    } catch (e) {}
    return null;
  }

  function checkLocationAuthorized(locId, callback) {
    if (!locId) {
      callback(false);
      return;
    }
    // Instant match with known installed locations
    if (KNOWN_INSTALLED_LOCATIONS.indexOf(locId) !== -1) {
      callback(true);
      return;
    }
    if (typeof verifiedLocationsCache[locId] !== 'undefined') {
      callback(verifiedLocationsCache[locId]);
      return;
    }
    // Dynamic server check for newly installed locations
    try {
      fetch(CONFIG.API_BASE + '/api/ghl/check-active-location?locationId=' + encodeURIComponent(locId))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var isAllowed = !!(data && data.active);
          verifiedLocationsCache[locId] = isAllowed;
          callback(isAllowed);
        })
        .catch(function () {
          callback(false);
        });
    } catch (err) {
      callback(false);
    }
  }

  var callingMode = 'mobile_to_mobile';
  var agentMobile = CONFIG.DEFAULT_MOBILE;
  var agentExtension = CONFIG.DEFAULT_EXT;
  var activeCallNumber = '';
  var activeContactName = 'Customer';
  var activeCallState = 'IDLE';
  var callTimerInterval = null;
  var callSeconds = 0;
  var showKeypad = true;
  var showSettings = false;

  function playDTMF(digit) {
    try {
      var dtmfFreqs = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
      };
      if (typeof AudioContext === 'undefined') return;
      var ctx = new AudioContext();
      var freqs = dtmfFreqs[digit] || [700, 1200];
      var osc1 = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var gain = ctx.createGain();
      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];
      gain.gain.value = 0.06;
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      setTimeout(function () {
        osc1.stop();
        osc2.stop();
        ctx.close();
      }, 90);
    } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById('of-exact-ems-styles')) return;
    var style = document.createElement('style');
    style.id = 'of-exact-ems-styles';
    style.textContent = [
      '.of-ems-call-badge { display: inline-flex !important; align-items: center !important; justify-content: center !important; padding: 2px 7px !important; margin-left: 8px !important; border-radius: 6px !important; background: #ecfdf5 !important; border: 1px solid #10b981 !important; color: #047857 !important; cursor: pointer !important; font-size: 11px !important; font-weight: 800 !important; line-height: 1.2 !important; vertical-align: middle !important; transition: all 0.15s ease !important; box-shadow: 0 1px 2px rgba(16, 185, 129, 0.15) !important; text-decoration: none !important; user-select: none !important; z-index: 99 !important; }',
      '.of-ems-call-badge:hover { background: #059669 !important; color: #ffffff !important; transform: scale(1.1) !important; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4) !important; }',
      '.of-ems-top-inline-btn { position: relative !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 5px !important; height: 32px !important; padding: 0 13px !important; border-radius: 16px !important; background: linear-gradient(135deg, #059669 0%, #047857 100%) !important; border: 1px solid #047857 !important; color: #ffffff !important; font-size: 12px !important; font-weight: 700 !important; cursor: pointer !important; box-shadow: 0 1px 4px rgba(5, 150, 105, 0.3) !important; font-family: inherit !important; transition: all 0.15s ease !important; margin: 0 5px !important; flex-shrink: 0 !important; vertical-align: middle !important; }',
      '.of-ems-top-inline-btn:hover { background: linear-gradient(135deg, #047857 0%, #064e3b 100%) !important; transform: translateY(-1px) !important; box-shadow: 0 3px 8px rgba(5, 150, 105, 0.45) !important; }',
      '.of-ems-modal-backdrop { position: fixed !important; inset: 0 !important; background: rgba(15, 23, 42, 0.65) !important; backdrop-filter: blur(6px) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 99999999 !important; padding: 20px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; }',
      '.of-ems-modal-card { background: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 24px !important; width: 410px !important; max-width: 95vw !important; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25) !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; }',
      '.of-ems-key-btn { background: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 12px !important; padding: 10px 0 !important; font-size: 18px !important; font-weight: 700 !important; color: #1e293b !important; cursor: pointer !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important; }',
      '.of-ems-key-btn:hover { background: #f8fafc !important; border-color: #cbd5e1 !important; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  function formatTimer(sec) {
    var mins = Math.floor(sec / 60);
    var s = sec % 60;
    return (mins < 10 ? '0' : '') + mins + ':' + (s < 10 ? '0' : '') + s;
  }

  function openDialerModal(initialNumber, initialName, autoDial) {
    activeCallNumber = String(initialNumber || '').replace(/[^\d+]/g, '');
    activeContactName = initialName || 'Customer';

    var backdrop = document.getElementById('of-ems-dialer-container');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'of-ems-dialer-container';
      backdrop.className = 'of-ems-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    renderDialerUI(backdrop);

    if (autoDial && activeCallNumber) {
      setTimeout(function () {
        initiateCall(activeCallNumber, activeContactName);
      }, 200);
    }
  }

  function closeDialerModal() {
    var backdrop = document.getElementById('of-ems-dialer-container');
    if (backdrop) backdrop.remove();
    if (activeCallState !== 'IDLE' && activeCallState !== 'ENDED') {
      endCall();
    }
  }

  function renderDialerUI(container) {
    var isMobileMode = callingMode === 'mobile_to_mobile';
    var initialChar = (activeContactName || 'C')[0].toUpperCase();

    var keys = ['1','2','3','4','5','6','7','8','9','*','0','#'];
    var keysHtml = '';
    for (var i = 0; i < keys.length; i++) {
      keysHtml += '<button class="of-ems-key-btn" data-key="' + keys[i] + '">' + keys[i] + '</button>';
    }

    var settingsHtml = '';
    if (showSettings) {
      settingsHtml = '<div style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e2e8f0;display:flex;gap:8px;font-size:11px;">' +
        '<div style="flex:1;"><label style="color:#64748b;font-size:10px;display:block;">Mobile:</label><input id="of-set-agent-mob" type="text" value="' + agentMobile + '" style="width:100%;padding:4px;border:1px solid #cbd5e1;border-radius:6px;" /></div>' +
        '<div style="flex:1;"><label style="color:#64748b;font-size:10px;display:block;">Ext:</label><input id="of-set-agent-ext" type="text" value="' + agentExtension + '" style="width:100%;padding:4px;border:1px solid #cbd5e1;border-radius:6px;" /></div>' +
      '</div>';
    }

    var callActionBtnHtml = '';
    if (activeCallState === 'IDLE' || activeCallState === 'ENDED') {
      callActionBtnHtml = '<button id="of-main-call-now-btn" type="button" style="width:100%;padding:13px;border-radius:12px;background:linear-gradient(135deg, #059669 0%, #047857 100%);color:#ffffff;border:none;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(5,150,105,0.35);">' +
        '<span>📞</span><span>Call Now (' + (isMobileMode ? '📱 Mobile' : '💻 Softphone') + ')</span>' +
      '</button>';
    } else {
      callActionBtnHtml = '<button id="of-main-end-call-btn" type="button" style="width:100%;padding:13px;border-radius:12px;background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);color:#ffffff;border:none;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(239,68,68,0.35);">' +
        '<span>🛑</span><span>End Call</span>' +
      '</button>';
    }

    var statusText = 'Ready to Call';
    var statusBg = '#f1f5f9';
    var statusColor = '#475569';
    if (activeCallState === 'CONNECTED') {
      statusText = '🟢 Connected (' + formatTimer(callSeconds) + ')';
      statusBg = '#dcfce7';
      statusColor = '#166534';
    } else if (activeCallState === 'RINGING') {
      statusText = '📲 Ringing Device...';
      statusBg = '#dbeafe';
      statusColor = '#1e40af';
    } else if (activeCallState === 'DIALING') {
      statusText = '⏳ Dialing...';
      statusBg = '#fef3c7';
      statusColor = '#92400e';
    }

    container.innerHTML = '<div class="of-ems-modal-card" onclick="event.stopPropagation()">' +
      '<div style="background:linear-gradient(135deg, #064e3b 0%, #0f766e 100%);padding:16px 20px;color:#ffffff;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;"><span style="font-size:18px;">📞</span></div>' +
          '<div>' +
            '<div style="font-size:14px;font-weight:800;display:flex;align-items:center;gap:6px;">' +
              '<span>Cloud Live Call</span>' +
              '<span style="font-size:10px;background:' + (isMobileMode ? '#2563eb' : '#059669') + ';padding:2px 8px;border-radius:10px;color:#ffffff;font-weight:800;">' + (isMobileMode ? '📱 Mobile SIM Active' : '💻 Softphone App') + '</span>' +
            '</div>' +
            '<div style="font-size:11px;color:#a7f3d0;display:flex;align-items:center;gap:4px;">' +
              '<span style="width:6px;height:6px;border-radius:50%;background:#34d399;display:inline-block;"></span> Virtual DID: ' + CONFIG.DEFAULT_DID +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<button id="of-btn-settings-toggle" type="button" style="background:' + (showSettings ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)') + ';border:none;color:#ffffff;width:30px;height:30px;border-radius:8px;cursor:pointer;">⚙️</button>' +
          '<button id="of-btn-modal-close" type="button" style="background:rgba(255,255,255,0.15);border:none;color:#ffffff;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;">✕</button>' +
        '</div>' +
      '</div>' +
      '<div style="background:#eff6ff;padding:10px 16px;border-bottom:1px solid #dbeafe;display:flex;flex-direction:column;gap:6px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:11px;font-weight:800;color:#1e3a8a;">📞 Receive Call On:</span><span style="font-size:10px;color:#3b82f6;font-weight:600;">Click to switch</span></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<button id="of-btn-mode-mobile" type="button" style="padding:8px;border-radius:8px;border:' + (isMobileMode ? '2.5px solid #2563eb' : '1px solid #cbd5e1') + ';background:' + (isMobileMode ? '#2563eb' : '#ffffff') + ';color:' + (isMobileMode ? '#ffffff' : '#64748b') + ';font-weight:800;font-size:11.5px;cursor:pointer;">📱 Mobile (' + agentMobile + ')</button>' +
          '<button id="of-btn-mode-softphone" type="button" style="padding:8px;border-radius:8px;border:' + (!isMobileMode ? '2.5px solid #0d9488' : '1px solid #cbd5e1') + ';background:' + (!isMobileMode ? '#0d9488' : '#ffffff') + ';color:' + (!isMobileMode ? '#ffffff' : '#64748b') + ';font-weight:800;font-size:11.5px;cursor:pointer;">💻 Softphone (' + agentExtension + ')</button>' +
        '</div>' +
      '</div>' +
      settingsHtml +
      '<div style="padding:20px;display:flex;flex-direction:column;align-items:center;background:#ffffff;">' +
        '<div style="position:relative;width:72px;height:72px;border-radius:50%;background:#a7f3d0;color:#065f46;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;margin-bottom:10px;">' +
          initialChar +
          '<span style="position:absolute;bottom:2px;right:2px;width:14px;height:14px;border-radius:50%;background:' + (activeCallState === 'CONNECTED' ? '#10b981' : activeCallState === 'RINGING' ? '#3b82f6' : '#94a3b8') + ';border:2.5px solid #ffffff;"></span>' +
        '</div>' +
        '<div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:2px;">' + (activeContactName || 'Customer') + '</div>' +
        '<input id="of-main-phone-input" type="text" value="' + activeCallNumber + '" placeholder="No Number" style="font-size:15px;font-weight:700;color:#0f766e;font-family:monospace;border:none;background:none;text-align:center;outline:none;margin-bottom:8px;width:100%;" />' +
        '<div style="margin-bottom:14px;"><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;background:' + statusBg + ';color:' + statusColor + ';">' + statusText + '</span></div>' +
        callActionBtnHtml +
        '<div style="margin-top:12px;"><button id="of-toggle-keypad" type="button" style="background:none;border:none;color:#64748b;font-size:11.5px;font-weight:600;cursor:pointer;text-decoration:underline;">' + (showKeypad ? '# Hide Dialpad' : '# Show Dialpad') + '</button></div>' +
        (showKeypad ? '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;width:100%;margin-top:12px;">' + keysHtml + '</div>' : '') +
      '</div>' +
    '</div>';

    container.querySelector('#of-btn-modal-close').onclick = closeDialerModal;
    container.onclick = function (e) { if (e.target === container) closeDialerModal(); };

    container.querySelector('#of-btn-mode-mobile').onclick = function () {
      callingMode = 'mobile_to_mobile';
      renderDialerUI(container);
    };

    container.querySelector('#of-btn-mode-softphone').onclick = function () {
      callingMode = 'extension_to_mobile';
      renderDialerUI(container);
    };

    container.querySelector('#of-btn-settings-toggle').onclick = function () {
      showSettings = !showSettings;
      renderDialerUI(container);
    };

    if (showSettings) {
      var mobIn = container.querySelector('#of-set-agent-mob');
      if (mobIn) mobIn.onchange = function (e) { agentMobile = e.target.value; };
      var extIn = container.querySelector('#of-set-agent-ext');
      if (extIn) extIn.onchange = function (e) { agentExtension = e.target.value; };
    }

    var phoneIn = container.querySelector('#of-main-phone-input');
    phoneIn.oninput = function (e) { activeCallNumber = e.target.value; };

    var toggleK = container.querySelector('#of-toggle-keypad');
    if (toggleK) {
      toggleK.onclick = function () {
        showKeypad = !showKeypad;
        renderDialerUI(container);
      };
    }

    var keyBtns = container.querySelectorAll('.of-ems-key-btn');
    for (var kIdx = 0; kIdx < keyBtns.length; kIdx++) {
      (function (b) {
        b.onclick = function () {
          var k = b.getAttribute('data-key');
          playDTMF(k);
          activeCallNumber += k;
          phoneIn.value = activeCallNumber;
        };
      })(keyBtns[kIdx]);
    }

    var callBtn = container.querySelector('#of-main-call-now-btn');
    if (callBtn) {
      callBtn.onclick = function () { initiateCall(activeCallNumber, activeContactName); };
    }

    var endBtn = container.querySelector('#of-main-end-call-btn');
    if (endBtn) {
      endBtn.onclick = endCall;
    }
  }

  function initiateCall(rawNumber, contactName) {
    var cleanNumber = String(rawNumber || activeCallNumber).replace(/[^\d+]/g, '');
    if (!cleanNumber || cleanNumber.length < 5) {
      alert('Please enter a valid phone number');
      return;
    }

    activeCallNumber = cleanNumber;
    activeCallState = 'DIALING';
    callSeconds = 0;

    var container = document.getElementById('of-ems-dialer-container');
    if (container) renderDialerUI(container);

    if (callingMode === 'extension_to_mobile') {
      try {
        fetch(CONFIG.LOCAL_BRIDGE + '/dial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: cleanNumber })
        }).catch(function () {});
      } catch (err) {}
    }

    fetch(CONFIG.API_BASE + '/api/calls/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: cleanNumber,
        contactName: contactName || activeContactName || 'Customer',
        callingMode: callingMode,
        agentExtension: agentExtension,
        agentMobile: agentMobile
      })
    }).then(function (r) { return r.json(); }).then(function (resData) {
      if (resData.success) {
        activeCallState = 'RINGING';
        if (container) renderDialerUI(container);

        setTimeout(function () {
          activeCallState = 'CONNECTED';
          if (container) renderDialerUI(container);
          clearInterval(callTimerInterval);
          callTimerInterval = setInterval(function () {
            callSeconds++;
            if (container) renderDialerUI(container);
          }, 1000);
        }, 3000);
      } else {
        alert(resData.error || 'Failed to dispatch call');
        activeCallState = 'IDLE';
        if (container) renderDialerUI(container);
      }
    }).catch(function () {
      if (callingMode === 'extension_to_mobile') {
        activeCallState = 'CONNECTED';
        if (container) renderDialerUI(container);
      } else {
        activeCallState = 'IDLE';
        if (container) renderDialerUI(container);
      }
    });
  }

  function endCall() {
    activeCallState = 'ENDED';
    clearInterval(callTimerInterval);

    if (callingMode === 'extension_to_mobile') {
      try { fetch(CONFIG.LOCAL_BRIDGE + '/hangup', { method: 'POST' }).catch(function () {}); } catch (e) {}
    }

    var container = document.getElementById('of-ems-dialer-container');
    if (container) renderDialerUI(container);

    setTimeout(function () {
      activeCallState = 'IDLE';
      if (container) renderDialerUI(container);
    }, 1500);
  }

  function injectTopDialerButton() {
    if (document.getElementById('of-ems-top-dialer')) return;

    var allEls = document.querySelectorAll('button, a, div[role="button"]');
    var topBarElements = [];
    for (var i = 0; i < allEls.length; i++) {
      var rect = allEls[i].getBoundingClientRect();
      if (rect.top >= 0 && rect.top < 65 && rect.width > 0) {
        topBarElements.push(allEls[i]);
      }
    }

    var topAskAi = null;
    var topBell = null;
    for (var j = 0; j < topBarElements.length; j++) {
      var el = topBarElements[j];
      if (el.textContent && el.textContent.indexOf('Ask AI') !== -1) {
        topAskAi = el;
      }
      if ((el.innerHTML && el.innerHTML.indexOf('bell') !== -1) || (el.className && String(el.className).indexOf('orange') !== -1)) {
        topBell = el;
      }
    }

    var btn = document.createElement('button');
    btn.id = 'of-ems-top-dialer';
    btn.className = 'of-ems-top-inline-btn';
    btn.type = 'button';
    btn.innerHTML = '<span>📞</span><span>Dialer</span>';
    btn.onclick = function (e) {
      e.stopPropagation();
      e.preventDefault();
      openDialerModal('', 'Direct Dial', false);
    };

    if (topAskAi && topAskAi.parentElement) {
      topAskAi.parentElement.insertBefore(btn, topAskAi.nextSibling);
    } else if (topBell && topBell.parentElement) {
      topBell.parentElement.insertBefore(btn, topBell);
    } else if (topBarElements.length > 0) {
      topBarElements[0].parentElement.appendChild(btn);
    }
  }

  function scanAndInjectPhoneButtons() {
    var allElements = document.querySelectorAll('span, div, p, a, td');

    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      if (el.closest('.of-ems-modal-card') || el.closest('#of-ems-top-dialer')) continue;
      if (el.getAttribute('data-of-done') === 'true' || el.querySelector('.of-ems-call-badge') || (el.nextElementSibling && el.nextElementSibling.classList.contains('of-ems-call-badge'))) continue;
      if (el.children.length > 2) continue;

      var text = (el.innerText || el.textContent || '').trim();
      if (!text || text.length > 28) continue;

      var match = text.match(/(\+?\d{1,4}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/);
      if (match && match[0]) {
        var cleanNumber = match[0].replace(/\D/g, '');
        if (cleanNumber.length >= 7 && cleanNumber.length <= 15) {
          if (text.indexOf('2026') !== -1 || text.indexOf('PM') !== -1 || text.indexOf('AM') !== -1 || text.indexOf('Sep') !== -1) continue;

          el.setAttribute('data-of-done', 'true');

          var parentRow = el.closest('tr, [role="row"], [class*="row"], [class*="item"]') || el.parentElement;
          var contactName = 'Customer';
          if (parentRow) {
            var nameEl = parentRow.querySelector('a, strong, [class*="name"]');
            if (nameEl && nameEl !== el) {
              contactName = (nameEl.innerText || nameEl.textContent || '').trim();
            }
          }

          (function (num, name) {
            var badge = document.createElement('span');
            badge.className = 'of-ems-call-badge';
            badge.title = '📞 Call ' + num + ' via Telephony';
            badge.innerHTML = '📞';
            badge.onclick = function (e) {
              e.stopPropagation();
              e.preventDefault();
              openDialerModal(num, name, true);
            };
            el.appendChild(badge);
          })(cleanNumber, contactName);
        }
      }
    }
  }

  function removeElements() {
    var btn = document.getElementById('of-ems-top-dialer');
    if (btn) btn.remove();
    var badges = document.querySelectorAll('.of-ems-call-badge');
    for (var b = 0; b < badges.length; b++) {
      badges[b].remove();
    }
  }

  // --- SMART LOCATION GUARD CONTROLLER ---
  function runLocationGuardCycle() {
    var locId = getCurrentLocationId();
    if (!locId) return;

    checkLocationAuthorized(locId, function (isAuthorized) {
      if (isAuthorized) {
        injectStyles();
        injectTopDialerButton();
        scanAndInjectPhoneButtons();
      } else {
        removeElements();
      }
    });
  }

  // Initial Run
  runLocationGuardCycle();

  // Watch for page navigation / SPA tab switching
  var observer = new MutationObserver(function () {
    runLocationGuardCycle();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('popstate', runLocationGuardCycle);
})();
