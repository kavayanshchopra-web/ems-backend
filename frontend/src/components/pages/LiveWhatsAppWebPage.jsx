import React, { useState, useRef, useEffect } from 'react';
import { 
  Laptop, 
  Users, 
  Plus, 
  Phone, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  Check, 
  UserPlus, 
  Trash2, 
  MessageSquare, 
  Bell,
  Smartphone,
  PhoneCall
} from 'lucide-react';
// SimBridge removed

export default function LiveWhatsAppWebPage({
  authUser,
  sessions = [],
  contacts = [],
  activeContact,
  setActiveContact,
  setActiveTab
}) {
  const activeTenant = String(authUser?.tenantId || authUser?.companyId || (typeof window !== 'undefined' && window.__omniflow_tenant) || 'default_tenant');

  // Load saved custom staff list from tenant-scoped storage with legacy fallback
  const [customStaffList, setCustomStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem(`omniflow_custom_staff_${activeTenant}`) || localStorage.getItem('omniflow_custom_staff_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'primary', name: 'Primary Account', phone: 'Scan QR to connect', status: 'idle' }
    ];
  });

  const [selectedStaffId, setSelectedStaffId] = useState(() => {
    return localStorage.getItem(`omniflow_selected_staff_id_${activeTenant}`) || localStorage.getItem('omniflow_selected_staff_id') || 'primary';
  });

  // Track live unread message counts per staff account
  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      const saved = localStorage.getItem(`omniflow_staff_unreads_${activeTenant}`) || localStorage.getItem('omniflow_staff_unreads');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [frameKey, setFrameKey] = useState(Date.now());
  const [activeCall, setActiveCall] = useState(null);

  const iframeRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter backend sessions strictly to active tenant
  const validTenantSessions = (sessions || []).filter(s => {
    if (!s) return false;
    if (activeTenant !== '1' && activeTenant !== 'default_tenant') {
      const sTenant = String(s.tenant_id || s.tenantId || '');
      return sTenant === activeTenant;
    }
    return true;
  });

  // Combine backend sessions with local custom staff list
  const staffAccounts = validTenantSessions.length > 0
    ? validTenantSessions.map((s, idx) => ({
        id: s.id || `staff_${idx + 1}`,
        name: s.name || `Staff ${idx + 1}`,
        phone: s.phone_number || s.phone || `Account ${idx + 1}`,
        status: s.status === 'connected' ? 'connected' : 'idle'
      }))
    : customStaffList;

  const currentStaff = (staffAccounts || []).find(s => s && s.id === selectedStaffId) || (staffAccounts && staffAccounts[0]) || null;

  // Listen to webview title change to capture live WhatsApp unread count e.g. "(26) WhatsApp"
  useEffect(() => {
    const webview = iframeRef.current;
    if (!webview) return;

    const handleTitleUpdated = (e) => {
      const title = e.title || '';
      const match = title.match(/^\((\d+)\)/);
      const count = match ? parseInt(match[1], 10) : 0;
      
      setUnreadCounts(prev => {
        const next = { ...prev, [selectedStaffId]: count };
        try {
          localStorage.setItem('omniflow_staff_unreads', JSON.stringify(next));
        } catch (err) {}
        return next;
      });
    };

    webview.addEventListener('page-title-updated', handleTitleUpdated);

    // Register global bridge for ConversationsPage to send via this active webview
    window.__omniflow_send_whatsapp_message = async ({ phone, text }) => {
      const cleanDigits = String(phone || '').replace(/\D/g, '');
      if (!cleanDigits || !text) return { success: false, error: 'Phone and text required' };
      const intlNumber = cleanDigits.length === 10 ? (`91${cleanDigits}`) : cleanDigits;

      const targetWebview = iframeRef.current;
      if (!targetWebview) {
        return { success: false, error: 'WhatsApp Webview not mounted' };
      }

      try {
        if (targetWebview.executeJavaScript) {
          const script = `
            (function() {
              try {
                const targetNumber = "${intlNumber}";
                const textMsg = ${JSON.stringify(text)};
                const targetUrl = 'https://web.whatsapp.com/send?phone=' + targetNumber + '&text=' + encodeURIComponent(textMsg);

                function attemptSend() {
                  // 1. Try finding Send button and click it
                  const sendBtn = document.querySelector('button[aria-label="Send"], button[data-testid="compose-btn-send"], span[data-icon="send"], span[data-icon="send-light"], button span[data-icon="send"], footer button:has(span[data-icon="send"]), footer button:last-child');
                  if (sendBtn) {
                    const actualBtn = sendBtn.tagName === 'BUTTON' ? sendBtn : (sendBtn.closest('button') || sendBtn);
                    ['pointerdown', 'mousedown', 'focus', 'pointerup', 'mouseup', 'click'].forEach(evtType => {
                      actualBtn.dispatchEvent(new MouseEvent(evtType, { bubbles: true, cancelable: true, view: window }));
                    });
                    return true;
                  }

                  // 2. Dispatch Enter keys on active contenteditable input
                  const textBox = document.querySelector('footer div[contenteditable="true"], div[role="textbox"][contenteditable="true"], div[data-testid="conversation-compose-box-input"]');
                  if (textBox && textBox.innerText.trim().length > 0) {
                    textBox.focus();
                    ['keydown', 'keypress', 'keyup'].forEach(kType => {
                      textBox.dispatchEvent(new KeyboardEvent(kType, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
                    });
                    return true;
                  }
                  return false;
                }

                // Check if current open chat matches targetNumber
                let currentChatPhone = '';
                try {
                  const mainEl = document.querySelector('#main') || document.querySelector('header');
                  if (mainEl) {
                    const fiberKey = Object.keys(mainEl).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                    if (fiberKey) {
                      let curr = mainEl[fiberKey];
                      let depth = 0;
                      while (curr && depth < 35) {
                        const chat = curr.memoizedProps?.chat || curr.memoizedProps?.conversation;
                        if (chat && chat.id?._serialized) {
                          currentChatPhone = String(chat.id._serialized).split('@')[0].replace(/\\D/g, '');
                          break;
                        }
                        curr = curr.return;
                        depth++;
                      }
                    }
                  }
                } catch (e) {}

                const current10 = currentChatPhone ? currentChatPhone.slice(-10) : '';
                const target10 = targetNumber.slice(-10);

                // If already on the same chat, insert and send immediately
                if (current10 && target10 && current10 === target10) {
                  const currentInput = document.querySelector('footer div[contenteditable="true"], div[role="textbox"][contenteditable="true"]');
                  if (currentInput) {
                    currentInput.focus();
                    document.execCommand('selectAll', false, null);
                    document.execCommand('insertText', false, textMsg);
                    currentInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
                    setTimeout(attemptSend, 100);
                    return { success: true, method: 'immediate_chat_matched' };
                  }
                }

                // Otherwise, navigate to send link
                window.location.href = targetUrl;
                return { success: true, method: 'navigated_to_send_url', targetNumber };
              } catch(err) {
                return { success: false, error: err.message };
              }
            })()
          `;
          const res = await targetWebview.executeJavaScript(script);

          // Webview native keystroke simulation sequence
          let inputTries = 0;
          const inputTimer = setInterval(() => {
            inputTries++;
            try {
              if (targetWebview.sendInputEvent) {
                targetWebview.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
                targetWebview.sendInputEvent({ type: 'char', keyCode: '\r' });
                targetWebview.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
              }
            } catch (e) {}
            if (inputTries > 15) clearInterval(inputTimer);
          }, 350);

          return { success: true, result: res };
        } else if (targetWebview.src) {
          targetWebview.src = `https://web.whatsapp.com/send?phone=${intlNumber}&text=${encodeURIComponent(text)}`;
          return { success: true, method: 'src_nav' };
        }
      } catch (err) {
        return { success: false, error: err.message };
      }
    };

    return () => {
      webview.removeEventListener('page-title-updated', handleTitleUpdated);
      delete window.__omniflow_send_whatsapp_message;
    };
  }, [selectedStaffId, frameKey]);

  // Direct In-Webview Real-Time Continuous Bidirectional Sync Engine
  useEffect(() => {
    const webview = iframeRef.current;
    if (!webview) return;

    let syncInterval = null;

    const runWebviewSync = async () => {
      try {
        if (!webview.executeJavaScript) return;

        const currentActivePhone = activeContact ? String(activeContact.phone || activeContact.rawPhone || activeContact.phoneNumber || '').replace(/\D/g, '') : '';
        const currentActiveName = activeContact?.name || '';

        const extractScript = `
          (function() {
            try {
              function parsePhoneFromJid(jid) {
                if (!jid) return '';
                return String(jid).split('@')[0].replace(/\\D/g, '');
              }

              // AUTO-SEND HANDLER: Strictly only runs during programmatic /send?phone= navigation
              try {
                const currentHref = window.location.href || '';
                if (currentHref.includes('/send?phone=') || currentHref.includes('omniflow_auto=1')) {
                  const sendBtn = document.querySelector('button[aria-label="Send"], button[data-testid="compose-btn-send"], span[data-icon="send"], span[data-icon="send-light"], button span[data-icon="send"], footer button:has(span[data-icon="send"])');
                  if (sendBtn) {
                    const actualBtn = sendBtn.tagName === 'BUTTON' ? sendBtn : (sendBtn.closest('button') || sendBtn);
                    ['pointerdown', 'mousedown', 'focus', 'pointerup', 'mouseup', 'click'].forEach(evtType => {
                      actualBtn.dispatchEvent(new MouseEvent(evtType, { bubbles: true, cancelable: true, view: window }));
                    });
                    try { window.history.replaceState({}, '', '/'); } catch(e) {}
                  }
                }
              } catch (sendErr) {}

              // 1. Multi-Strategy Phone Number & Chat Title Extractor
              let phone = '';
              let chatTitle = '';

              // Strategy A: Scan data-id attributes of messages in #main for exact JID
              const allDataIdEls = Array.from(document.querySelectorAll('#main *[data-id], *[data-id]'));
              for (const el of allDataIdEls) {
                const dId = el.getAttribute('data-id') || '';
                const m = dId.match(/([0-9]{7,15})@(c\.us|s\.whatsapp\.net)/);
                if (m && m[1]) {
                  phone = m[1];
                  break;
                }
              }

              // Strategy B: Scan active chat item in left sidebar
              if (!phone) {
                const activeSideItem = document.querySelector('#pane-side div[aria-selected="true"], #pane-side div[role="listitem"]:has([aria-selected="true"]), #pane-side div[role="row"]:has([aria-selected="true"])');
                if (activeSideItem) {
                  const rawHtml = activeSideItem.outerHTML || '';
                  const m = rawHtml.match(/([0-9]{7,15})@(c\.us|s\.whatsapp\.net)/);
                  if (m && m[1]) phone = m[1];
                }
              }

              // Strategy C: Multi-Root React Fiber Traversal
              if (!phone || !chatTitle) {
                try {
                  const candidateEls = [
                    document.querySelector('#main'),
                    document.querySelector('#main header'),
                    document.querySelector('#pane-side div[aria-selected="true"]'),
                    document.querySelector('#main footer'),
                    document.querySelector('#app')
                  ].filter(Boolean);

                  for (const el of candidateEls) {
                    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                    if (!fiberKey) continue;
                    let curr = el[fiberKey];
                    let d = 0;
                    while (curr && d < 40) {
                      const p = curr.memoizedProps;
                      if (p) {
                        const c = p.chat || p.conversation || p.contact || p.data?.chat;
                        if (c) {
                          if (!chatTitle) chatTitle = c.name || c.formattedTitle || c.title || '';
                          if (!phone && c.id?._serialized) {
                            const m = String(c.id._serialized).match(/([0-9]{7,15})@(c\.us|s\.whatsapp\.net)/);
                            if (m && m[1]) phone = m[1];
                          }
                          if (!phone && c.contact?.phoneNumber) {
                            phone = String(c.contact.phoneNumber).replace(/\\D/g, '');
                          }
                          if (!phone && c.id?.user) {
                            const u = String(c.id.user).replace(/\\D/g, '');
                            if (u.length >= 7) phone = u;
                          }
                        }
                      }
                      curr = curr.return;
                      d++;
                    }
                    if (phone && chatTitle) break;
                  }
                } catch (fibErr) {}
              }

              // Strategy D: DOM Header Title and Subtitle Extraction
              if (!chatTitle) {
                const headerTitleEl = document.querySelector('#main header span[data-testid="conversation-info-header-chat-title"], #main header span[title], header span[title], header div[role="button"] span[title]');
                chatTitle = headerTitleEl ? (headerTitleEl.getAttribute('title') || headerTitleEl.innerText || '').trim() : '';
              }

              if (!phone) {
                const subtitleEl = document.querySelector('#main header span[title*="+"], header span[title*="+"], #main header div[data-testid="chat-subtitle"]');
                if (subtitleEl) {
                  const subDigits = String(subtitleEl.getAttribute('title') || subtitleEl.innerText || '').replace(/\\D/g, '');
                  if (subDigits.length >= 7) phone = subDigits;
                }
              }

              if (!phone && chatTitle) {
                const titleDigits = chatTitle.replace(/\\D/g, '');
                if (titleDigits.length >= 7) phone = titleDigits;
              }

              // Fallback to active CRM contact phone if this chat is open
              if (!phone && "${currentActivePhone}") {
                phone = "${currentActivePhone}";
              }

              // 2. Extract all visible messages in the active chat container (#main)
              const container = document.querySelector('#main') || document;
              const messageNodes = container.querySelectorAll('div.message-in, div.message-out, div[data-id], div[role="row"]');
              const messages = [];

              if (messageNodes && messageNodes.length > 0) {
                messageNodes.forEach((node, idx) => {
                  try {
                    const dataId = node.getAttribute('data-id') || node.querySelector('*[data-id]')?.getAttribute('data-id') || '';
                    const isOut = node.classList.contains('message-out') || Boolean(node.querySelector('.message-out')) || dataId.startsWith('true_');

                    let text = '';
                    const textSpan = node.querySelector('span.selectable-text, div.copyable-text, span._ao3e, span[dir="ltr"], span[dir="rtl"]');
                    if (textSpan) {
                      text = textSpan.innerText || textSpan.textContent || '';
                    }
                    if (!text) {
                      const clone = node.cloneNode(true);
                      const removeEls = clone.querySelectorAll('span[dir="auto"], svg, button');
                      removeEls.forEach(el => el.remove());
                      text = (clone.innerText || '').trim();
                    }

                    text = (text || '').trim();
                    if (!text) return;

                    let msgId = dataId;
                    let msgPhone = phone;

                    if (dataId) {
                      const m = dataId.match(/([0-9]{7,15})@(c\.us|s\.whatsapp\.net)/);
                      if (m && m[1]) {
                        msgPhone = m[1];
                      }
                    }
                    if (!msgId) {
                      msgId = 'wa_' + (isOut ? 'out' : 'in') + '_' + text.substring(0, 20) + '_' + (node.offsetTop || idx);
                    }

                    let ts = Math.floor(Date.now() / 1000);
                    const copyable = node.querySelector('div.copyable-text[data-pre-plain-text]');
                    if (copyable) {
                      const preText = copyable.getAttribute('data-pre-plain-text') || '';
                      const matchTime = preText.match(/\\[(.*?)\\]/);
                      if (matchTime && matchTime[1]) {
                        const parsedDate = new Date(matchTime[1]);
                        if (!isNaN(parsedDate.getTime())) {
                          ts = Math.floor(parsedDate.getTime() / 1000);
                        }
                      }
                    }

                    messages.push({
                      id: msgId,
                      body: text,
                      sender: chatTitle || msgPhone || "${currentActiveName}",
                      phone: msgPhone || phone,
                      fromMe: isOut,
                      timestamp: ts
                    });
                  } catch (e) {}
                });
              }

              // 3. Extract all sidebar chats from #pane-side
              const sidebarChats = [];
              try {
                const paneRows = document.querySelectorAll('#pane-side div[role="listitem"], #pane-side div[role="row"], #pane-side div[data-testid="cell-frame-container"]');
                paneRows.forEach(row => {
                  try {
                    let rPhone = '';
                    let rName = '';
                    let rLastMsg = '';
                    let rUnread = 0;

                    const titleEl = row.querySelector('span[title], div[title], .x10flqx, span._ao3e');
                    if (titleEl) {
                      rName = titleEl.getAttribute('title') || titleEl.innerText || '';
                    }

                    const subEl = row.querySelector('span[dir="ltr"], span[dir="auto"], span._ao3e, div._ak8l');
                    if (subEl) {
                      rLastMsg = subEl.innerText || subEl.textContent || '';
                    }

                    const unreadBadge = row.querySelector('span[aria-label*="unread"], span._ak8q, span[data-testid="icon-unread-count"]');
                    if (unreadBadge) {
                      const uCount = parseInt((unreadBadge.innerText || unreadBadge.textContent || '0').replace(/\D/g, ''), 10);
                      if (!isNaN(uCount)) rUnread = uCount;
                    }

                    // Extract phone from React fiber or row html
                    const rawHtml = row.outerHTML || '';
                    const m = rawHtml.match(/([0-9]{7,15})@(c\.us|s\.whatsapp\.net)/);
                    if (m && m[1]) rPhone = m[1];

                    if (!rPhone) {
                      const fiberKey = Object.keys(row).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
                      if (fiberKey) {
                        let curr = row[fiberKey];
                        let d = 0;
                        while (curr && d < 25) {
                          const c = curr.memoizedProps?.chat || curr.memoizedProps?.conversation || curr.memoizedProps?.contact;
                          if (c) {
                            if (c.id?._serialized) {
                              const matchP = String(c.id._serialized).match(/([0-9]{7,15})@(c\.us|s\.whatsapp\.net)/);
                              if (matchP && matchP[1]) rPhone = matchP[1];
                            }
                            if (!rName && (c.name || c.formattedTitle || c.title)) {
                              rName = c.name || c.formattedTitle || c.title;
                            }
                            break;
                          }
                          curr = curr.return;
                          d++;
                        }
                      }
                    }

                    if (!rPhone && rName) {
                      const digits = rName.replace(/\D/g, '');
                      if (digits.length >= 7) rPhone = digits;
                    }

                    if (rPhone) {
                      sidebarChats.push({
                        phone: rPhone,
                        name: rName || rPhone,
                        lastMessage: rLastMsg,
                        unreadCount: rUnread
                      });
                    }
                  } catch (e) {}
                });
              } catch (e) {}

              return {
                phone: phone,
                sender: chatTitle || "${currentActiveName}",
                messages: messages,
                sidebarChats: sidebarChats
              };
            } catch (err) {
              return { error: err.message };
            }
          })()
        `;

        const result = await webview.executeJavaScript(extractScript);
        if (result) {
          const isDesktopEnv = typeof window !== 'undefined' && (Boolean(window.electronAPI) || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          const API_URL = isDesktopEnv
            ? 'http://localhost:5000/api'
            : 'https://api.employeemanagementsystems.com/api';
          const token = localStorage.getItem('token') || localStorage.getItem('omnilflow_token');

          // A. Sync active messages
          if (Array.isArray(result.messages) && result.messages.length > 0) {
            if (typeof window !== 'undefined') {
              try {
                window.dispatchEvent(new CustomEvent('omniflow-wa-batch-sync', { detail: result }));
              } catch (evErr) {}
            }

            await fetch(`${API_URL}/messages/inbound-sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                phone: result.phone,
                sender: result.sender,
                messages: result.messages,
                tenantId: activeTenant
              })
            });
          }

          // B. Sync sidebar contacts roster
          if (Array.isArray(result.sidebarChats) && result.sidebarChats.length > 0) {
            for (const sChat of result.sidebarChats) {
              if (sChat.phone && sChat.lastMessage) {
                fetch(`${API_URL}/messages/inbound-sync`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                  },
                  body: JSON.stringify({
                    phone: sChat.phone,
                    sender: sChat.name,
                    body: sChat.lastMessage,
                    fromMe: false,
                    tenantId: activeTenant
                  })
                }).catch(() => {});
              }
            }
          }
        }
      } catch (err) {}
    };

    const handleDomReady = () => {
      if (syncInterval) clearInterval(syncInterval);
      syncInterval = setInterval(runWebviewSync, 1500);
      runWebviewSync();
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-finish-load', handleDomReady);

    syncInterval = setInterval(runWebviewSync, 1500);

    return () => {
      if (syncInterval) clearInterval(syncInterval);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-finish-load', handleDomReady);
    };
  }, [selectedStaffId, frameKey, activeTenant]);

  // Listen for native incoming WhatsApp Web messages and sync with database & GHL
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.onIncomingWhatsAppMessage) {
      const unsub = window.electronAPI.onIncomingWhatsAppMessage(async (msgData) => {
        const { sender, body, phone, timestamp, fromMe } = msgData || {};
        if (!body) return;

        try {
          const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
            ? 'http://localhost:5000/api'
            : 'https://api.employeemanagementsystems.com/api';
          const token = localStorage.getItem('token') || localStorage.getItem('omnilflow_token');

          await fetch(`${API_URL}/messages/inbound-sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              sender,
              body,
              phone,
              fromMe,
              timestamp: Math.floor((timestamp || Date.now()) / 1000),
              tenantId: activeTenant
            })
          });
        } catch (syncErr) {
          console.warn('[WhatsApp Inbound Sync Error]', syncErr);
        }
      });

      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, [activeTenant]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
        setIsAddingMode(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleSelectStaff = (id) => {
    setSelectedStaffId(id);
    localStorage.setItem(`omniflow_selected_staff_id_${activeTenant}`, id);
    localStorage.setItem('omniflow_selected_staff_id', id);
    setFrameKey(Date.now());
    setIsDropdownOpen(false);
    setIsAddingMode(false);
  };

  const handleAddStaffSubmit = (e) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    const newId = `staff_${Date.now()}`;
    const newAccount = {
      id: newId,
      name: newStaffName.trim(),
      phone: 'Scan QR to connect',
      status: 'idle'
    };

    const updated = [...customStaffList, newAccount];
    setCustomStaffList(updated);
    localStorage.setItem(`omniflow_custom_staff_${activeTenant}`, JSON.stringify(updated));
    localStorage.setItem('omniflow_custom_staff_accounts', JSON.stringify(updated));

    setSelectedStaffId(newId);
    localStorage.setItem(`omniflow_selected_staff_id_${activeTenant}`, newId);
    localStorage.setItem('omniflow_selected_staff_id', newId);
    setNewStaffName('');
    setIsAddingMode(false);
    setIsDropdownOpen(false);
    setFrameKey(Date.now());
  };

  const handleReload = () => {
    setFrameKey(Date.now());
    if (iframeRef.current) {
      try {
        if (iframeRef.current.reloadIgnoringCache) {
          iframeRef.current.reloadIgnoringCache();
        } else if (iframeRef.current.src) {
          iframeRef.current.src = iframeRef.current.src;
        }
      } catch (err) {}
    }
  };

  const currentUnread = currentStaff?.id ? (unreadCounts[currentStaff.id] || 0) : 0;
  const totalUnreadsAllStaff = Object.values(unreadCounts).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 52px)',
      width: '100%',
      backgroundColor: '#0b141a',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* WhatsApp Companion Desktop App Notice Banner */}
      <div style={{
        background: 'linear-gradient(90deg, #052e16 0%, #064e3b 100%)',
        borderBottom: '1px solid #059669',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ecfdf5', fontSize: '12px', fontWeight: '600' }}>
          <Laptop size={15} style={{ color: '#34d399', flexShrink: 0 }} />
          <span>🚀 <strong>WhatsApp Desktop Companion App:</strong> Install on your Windows PC for 24/7 background sync & multi-session multi-staff live chat.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href="/OmniFlow-CRM-Setup.exe"
            download="OmniFlow-CRM-Setup.exe"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '6px',
              background: '#10b981',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '800',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
              cursor: 'pointer'
            }}
          >
            <span>📥 Download Desktop App (.exe)</span>
          </a>
          <a
            href="/OmniFlow-CRM-Setup.exe"
            download="OmniFlow-WhatsApp-Desktop-Suite.zip"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#a7f3d0',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '11px',
              fontWeight: '700',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            title="Download portable zip package"
          >
            <span>Portable .zip</span>
          </a>
        </div>
      </div>
      {/* Top Staff Switcher Dropdown Bar (Ultra Compact & Space-Saving) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#111b21',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '5px 14px',
        height: '38px',
        flexShrink: 0,
        zIndex: 50
      }}>
        {/* Left: Staff Selector Dropdown with Live Unread Badges */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(prev => !prev);
              setIsAddingMode(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              borderRadius: '7px',
              background: isDropdownOpen ? 'rgba(20, 210, 203, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: isDropdownOpen ? '1px solid #14d2cb' : '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={14} style={{ color: '#14d2cb' }} />
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: currentStaff ? (currentStaff.status === 'connected' ? '#10b981' : '#f59e0b') : '#94a3b8',
              boxShadow: currentStaff?.status === 'connected' ? '0 0 6px #10b981' : 'none'
            }}></span>
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentStaff ? currentStaff.name : 'WhatsApp Accounts'}
            </span>

            {/* Live Unread Badge on Trigger Button */}
            {currentUnread > 0 && (
              <span style={{
                background: '#22c55e',
                color: '#052e16',
                fontSize: '10.5px',
                fontWeight: '900',
                padding: '1px 6px',
                borderRadius: '10px',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
              }}>
                {currentUnread}
              </span>
            )}

            <ChevronDown size={13} style={{ color: '#14d2cb', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
          </button>

          {/* Floating Dropdown Menu */}
          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              width: '280px',
              background: '#182229',
              borderRadius: '10px',
              border: '1px solid rgba(20, 210, 203, 0.3)',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.75)',
              padding: '6px',
              zIndex: 999999,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px 4px 10px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '800',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Staff Accounts ({staffAccounts.length})
                </span>
                {totalUnreadsAllStaff > 0 && (
                  <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: '700' }}>
                    {totalUnreadsAllStaff} total unread
                  </span>
                )}
              </div>

              {/* Staff List Items with Unread Badges */}
              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {staffAccounts.length === 0 ? (
                  <div style={{ padding: '12px 10px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                    No WhatsApp accounts connected yet. Click below to add an account.
                  </div>
                ) : (
                  staffAccounts.map((staff) => {
                    const isSelected = staff.id === selectedStaffId;
                    const unread = unreadCounts[staff.id] || 0;

                  return (
                    <div
                      key={staff.id}
                      onClick={() => handleSelectStaff(staff.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(20, 210, 203, 0.15)' : 'transparent',
                        border: isSelected ? '1px solid rgba(20, 210, 203, 0.3)' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease'
                      }}
                      onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: staff.status === 'connected' ? '#10b981' : '#f59e0b',
                          flexShrink: 0
                        }}></span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: isSelected ? '700' : '600', color: isSelected ? '#14d2cb' : '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {staff.name}
                          </div>
                          {staff.phone && (
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{staff.phone}</div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {/* Live Unread Badge */}
                        {unread > 0 ? (
                          <span style={{
                            background: '#22c55e',
                            color: '#052e16',
                            fontSize: '10px',
                            fontWeight: '900',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)'
                          }}>
                            {unread} new
                          </span>
                        ) : (
                          <span style={{ fontSize: '9.5px', color: '#64748b' }}>0 new</span>
                        )}

                        {isSelected && <Check size={14} style={{ color: '#14d2cb' }} />}
                      </div>
                    </div>
                  );
                })
              )}
              </div>

              {/* Bottom: Add Staff Section inside Dropdown */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px', marginTop: '2px' }}>
                {!isAddingMode ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingMode(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '7px',
                      borderRadius: '6px',
                      background: 'rgba(20, 210, 203, 0.1)',
                      border: '1px dashed rgba(20, 210, 203, 0.4)',
                      color: '#14d2cb',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={13} /> Add New Staff Account
                  </button>
                ) : (
                  <form onSubmit={handleAddStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '2px 4px' }}>
                    <input
                      type="text"
                      placeholder="Staff Name (e.g. Rahul Sales)"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      autoFocus
                      style={{
                        padding: '6px 8px',
                        borderRadius: '5px',
                        background: '#111b21',
                        border: '1px solid #14d2cb',
                        color: '#ffffff',
                        fontSize: '11.5px',
                        outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="submit"
                        style={{
                          flex: 1,
                          padding: '5px',
                          borderRadius: '5px',
                          background: '#0d9488',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Add & Link QR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingMode(false);
                          setNewStaffName('');
                        }}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '5px',
                          background: 'rgba(255,255,255,0.08)',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Unread Summary & Quick Reload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {totalUnreadsAllStaff > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              padding: '3px 8px',
              borderRadius: '6px',
              color: '#22c55e',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              <Bell size={12} />
              <span>{totalUnreadsAllStaff} Pending Chats</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveCall({ phone: activeContact?.phone || '', name: activeContact?.name || 'Customer' })}
            title="Call Customer via Mobile SIM Bridge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)'
            }}
          >
            <PhoneCall size={12} />
            <span>Call via SIM</span>
          </button>

          <button
            type="button"
            onClick={handleReload}
            title="Reload WhatsApp Web Session"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Main Full-Screen WhatsApp Web Center Viewport (100% Space) */}
      <div style={{ flex: 1, height: '100%', position: 'relative', backgroundColor: '#111b21', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {typeof window !== 'undefined' && window.electronAPI?.isDesktopApp ? (
          <webview
            key={`wa_${selectedStaffId || 'primary'}_${frameKey}`}
            ref={iframeRef}
            src="https://web.whatsapp.com"
            partition={`persist:staff_${selectedStaffId || 'primary'}`}
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'inline-flex'
            }}
            allowpopups="true"
          />
        ) : (
          <div style={{ maxWidth: '580px', width: '90%', padding: '36px', background: '#0b141a', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', color: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(37, 211, 102, 0.15)', color: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.78 14.07c-.24.68-1.39 1.3-1.92 1.38-.51.08-1.17.11-3.37-.8-2.65-1.09-4.35-3.8-4.48-3.98-.13-.18-1.08-1.44-1.08-2.75 0-1.31.69-1.95.93-2.22.24-.27.53-.34.71-.34.18 0 .36 0 .51.01.16.01.38-.06.59.45.22.53.75 1.83.82 1.96.07.13.11.29.02.47-.09.18-.13.29-.27.45-.13.16-.29.36-.41.48-.13.13-.27.27-.12.53.16.27.69 1.14 1.48 1.84 1.02.91 1.88 1.19 2.15 1.32.27.13.42.11.58-.07.16-.18.67-.78.85-1.05.18-.27.36-.22.59-.13.24.09 1.5.71 1.76.84.27.13.44.2.51.31.07.11.07.64-.17 1.32z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 10px 0', color: '#ffffff' }}>
              Real WhatsApp Web & Multi-Staff Workspace
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
              Zero server load • Real-time WhatsApp sync • Multi-staff account live management
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={() => window.open('https://web.whatsapp.com', '_blank')}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                  color: 'white',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(37, 211, 102, 0.35)'
                }}
              >
                <span>🚀 Launch WhatsApp Web in New Window</span>
              </button>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', fontSize: '12px', color: '#64748b', textAlign: 'left', lineHeight: '1.5' }}>
                <strong style={{ color: '#14d2cb' }}>💡 Pro Tip:</strong> For fully embedded in-app WhatsApp viewing with native voice & video calling, run the <strong>OmniFlow Desktop App</strong> on your PC!
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
