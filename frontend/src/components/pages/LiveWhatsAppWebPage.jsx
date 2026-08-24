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
  sessions = [],
  contacts = [],
  activeContact,
  setActiveContact,
  setActiveTab
}) {
  // Load saved custom staff list from localStorage
  const [customStaffList, setCustomStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem('omniflow_custom_staff_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'staff_1', name: 'Staff 1', phone: 'Primary WhatsApp', status: 'connected' },
      { id: 'staff_2', name: 'Staff 2', phone: 'Sales WhatsApp', status: 'idle' }
    ];
  });

  const [selectedStaffId, setSelectedStaffId] = useState(() => {
    return localStorage.getItem('omniflow_selected_staff_id') || 'staff_1';
  });

  // Track live unread message counts per staff account
  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      const saved = localStorage.getItem('omniflow_staff_unreads');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { staff_1: 26, staff_2: 4 };
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [frameKey, setFrameKey] = useState(Date.now());
  const [activeCall, setActiveCall] = useState(null);

  const iframeRef = useRef(null);
  const dropdownRef = useRef(null);

  // Combine backend sessions with local custom staff list
  const staffAccounts = sessions && sessions.length > 0
    ? sessions.map((s, idx) => ({
        id: s.id || `staff_${idx + 1}`,
        name: s.name || `Staff ${idx + 1}`,
        phone: s.phone_number || s.phone || `Account ${idx + 1}`,
        status: s.status === 'connected' ? 'connected' : 'idle'
      }))
    : customStaffList;

  const currentStaff = staffAccounts.find(s => s.id === selectedStaffId) || staffAccounts[0] || { id: 'staff_1', name: 'Staff 1', status: 'connected' };

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
    return () => {
      webview.removeEventListener('page-title-updated', handleTitleUpdated);
    };
  }, [selectedStaffId, frameKey]);

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
    localStorage.setItem('omniflow_custom_staff_accounts', JSON.stringify(updated));

    setSelectedStaffId(newId);
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

  const currentUnread = unreadCounts[currentStaff.id] || 0;
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
            href="/downloads/OmniFlow-WhatsApp-CRM.exe"
            download="OmniFlow-WhatsApp-CRM.exe"
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
            href="/downloads/OmniFlow-WhatsApp-Desktop-Suite.zip"
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
              background: currentStaff.status === 'connected' ? '#10b981' : '#f59e0b',
              boxShadow: currentStaff.status === 'connected' ? '0 0 6px #10b981' : 'none'
            }}></span>
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentStaff.name}
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
                {staffAccounts.map((staff) => {
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
                })}
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
        {typeof window !== 'undefined' && (window.electronAPI?.isDesktopApp || !!window.navigator.userAgent.match(/Electron/i)) ? (
          <webview
            key={`${selectedStaffId}_${frameKey}`}
            ref={iframeRef}
            src="https://web.whatsapp.com"
            partition={`persist:staff_${selectedStaffId}`}
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
