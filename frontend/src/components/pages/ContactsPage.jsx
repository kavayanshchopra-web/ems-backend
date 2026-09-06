/**
 * CRM CONTACTS & LEADS MASTER PAGE (GHL 2-WAY SYNC HUB)
 * Fully Dynamic Universal Engine Roster with HighLevel Bidirectional Sync & Strict Deduplication
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { RefreshCw, Zap, Trash2 } from 'lucide-react';
import { normalizePhone10, formatPhoneDisplay, toE164Phone } from '../../core/utils/phoneUtils';

export default function ContactsPage({
  authUser = null,
  contacts: propContacts = [],
  setContacts: setPropContacts = () => {},
  showToast = () => {},
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  openModuleConfigModal = null,
  systemDropdowns = null,
  activePipelineStages = [],
  onManageStages = () => {},
  onOpenChatWithLead = null
}) {
  const companyId = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 'org_default';
  const { config } = useModuleRegistry(companyId, 'contacts');

  const [isSyncingGhl, setIsSyncingGhl] = useState(false);
  const [ghlLocationStatus, setGhlLocationStatus] = useState(null);

  // Initialize records cleanly with immediate hydration from props or localStorage cache
  const [internalRecords, setInternalRecords] = useState(() => {
    if (Array.isArray(propContacts) && propContacts.length > 0) {
      return propContacts;
    }
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('omniflow_cached_contacts');
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {}
    return [];
  });

  // Sync when propContacts arrives or updates from parent
  useEffect(() => {
    if (Array.isArray(propContacts) && propContacts.length > 0) {
      setInternalRecords(prev => processAndMergeRecords(prev, propContacts));
    }
  }, [propContacts]);

  const isDesktop = typeof window !== 'undefined' && (Boolean(window.electronAPI) || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const API_URL = isDesktop
    ? 'http://localhost:5000/api'
    : 'https://api.employeemanagementsystems.com/api';
  const token = typeof window !== 'undefined' ? (localStorage.getItem('omnilflow_token') || localStorage.getItem('token')) : null;

  // Real-Time Deduplication and Merge Helper
  const processAndMergeRecords = (currentList, newDocs) => {
    if (!Array.isArray(newDocs) || newDocs.length === 0) return currentList;

    const dedupMap = new Map();

    // 1. Add existing valid items into dedupMap
    (currentList || []).forEach(item => {
      if (!item) return;
      const key = item._dedupKey || item.id;
      if (key) dedupMap.set(key, item);
    });

    // 2. Process and sanitize each incoming document
    newDocs.forEach(d => {
      if (!d) return;

      const rawId = String(d.id || '');

      // A. FILTER OUT JUNK / SYSTEM CHATS / GROUPS / BROADCASTS / STATUS
      if (
        rawId.endsWith('@g.us') || 
        rawId.endsWith('@broadcast') || 
        rawId.endsWith('@newsletter') || 
        rawId.endsWith('@lid') || 
        rawId === '0@s.whatsapp.net' || 
        rawId === 'status@broadcast' ||
        d.isGroup ||
        d.groupMetadata
      ) {
        return; // Skip group chats and system broadcast IDs
      }

      // Skip dummy deal cards that don't belong in Contacts
      if (d.dealValue !== undefined && !d.phone && !d.email && !d.ghlContactId && !d.contactName) {
        return;
      }

      // B. SANITIZE PHONE NUMBER (Reject internal GHL IDs like ghl_NQ9CVjz... or text strings)
      const rawPhone = String(d.phone || d.phoneNumber || d.customerPhone || (rawId.includes('@s.whatsapp.net') ? rawId.split('@')[0] : '')).trim();
      const isInternalGhlId = rawPhone.toLowerCase().startsWith('ghl_') || /[a-zA-Z]/.test(rawPhone);
      const cleanDigits = isInternalGhlId ? '' : rawPhone.replace(/\D/g, '');

      let normPhone10 = normalizePhone10(rawPhone);
      let formattedPhone = normPhone10 ? formatPhoneDisplay(normPhone10) : ((!isInternalGhlId && cleanDigits.length >= 7) ? `+${cleanDigits}` : '—');

      // C. SANITIZE EMAIL
      const rawEmail = String(d.email || d.customerEmail || '').trim().toLowerCase();
      const cleanEmail = (rawEmail.includes('@') && rawEmail.includes('.')) ? rawEmail : '';

      // D. SANITIZE CONTACT NAME
      let rawName = String(d.name || d.fullName || d.contactName || d.custom_name || d.customName || d.title || '').trim();
      rawName = rawName.replace(/@s\.whatsapp\.net/g, '').replace(/@g\.us/g, '').trim();

      // If name is an internal GHL ID or empty, resolve cleanly
      if (rawName.toLowerCase().startsWith('ghl_') || !rawName) {
        rawName = formattedPhone !== '—' ? formattedPhone : (cleanEmail ? cleanEmail.split('@')[0] : 'Contact');
      }

      // E. STRICT DEDUPLICATION KEY (Phone 10-digit > Email > GHL ID > Unique ID)
      let dedupKey = '';
      if (normPhone10) {
        dedupKey = `phone_${normPhone10}`;
      } else if (cleanEmail) {
        dedupKey = `email_${cleanEmail}`;
      } else if (d.ghlContactId || (rawId.startsWith('ghl_') && !isInternalGhlId)) {
        dedupKey = `ghl_${d.ghlContactId || rawId}`;
      } else if (rawId && !rawId.startsWith('CON-')) {
        dedupKey = `id_${rawId}`;
      } else {
        dedupKey = `rec_${rawName}_${cleanEmail}`;
      }

      // F. BUILD SANITIZED CRM RECORD
      const cleanRec = {
        id: rawId || `CON-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: rawName,
        phone: formattedPhone,
        email: cleanEmail,
        tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || d.labels ? (Array.isArray(d.labels) ? d.labels.join(', ') : String(d.labels)) : ''),
        status: d.status || d.stage || d.pipelineStage || 'New Leads',
        source: d.source || (d.ghlContactId ? 'GoHighLevel' : (rawId.includes('@s.whatsapp.net') ? 'WhatsApp Inbound' : (d.simCall ? 'SIM Dialer' : 'Manual Entry'))),
        assignedTo: d.assignedTo || d.agentName || authUser?.name || 'Staff 1',
        ghlContactId: d.ghlContactId || d.ghl_entity_id || (rawId.startsWith('ghl_') ? rawId.replace('ghl_', '') : null),
        notes: d.notes || d.customFields?.notes || '',
        createdAt: d.createdAt || d._createdAt || d.lastMessageTime || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
        _dedupKey: dedupKey
      };

      // G. MERGE WITH EXISTING RECORD IF DUPLICATE
      if (dedupMap.has(dedupKey)) {
        const existing = dedupMap.get(dedupKey);

        // Keep the best human name
        const isExistingGeneric = !existing.name || existing.name === existing.phone || existing.name === 'Contact';
        const isCleanGeneric = !cleanRec.name || cleanRec.name === cleanRec.phone || cleanRec.name === 'Contact';
        const betterName = (!isExistingGeneric) ? existing.name : (!isCleanGeneric ? cleanRec.name : (existing.name || cleanRec.name));

        const betterPhone = (existing.phone && existing.phone !== '—') ? existing.phone : cleanRec.phone;
        const betterEmail = existing.email || cleanRec.email;
        const betterGhlId = existing.ghlContactId || cleanRec.ghlContactId;

        // Combine tags
        const tagsSet = new Set([
          ...(existing.tags ? existing.tags.split(',').map(t => t.trim()) : []),
          ...(cleanRec.tags ? cleanRec.tags.split(',').map(t => t.trim()) : [])
        ]);
        const mergedTags = Array.from(tagsSet).filter(Boolean).join(', ');

        dedupMap.set(dedupKey, {
          ...existing,
          ...cleanRec,
          name: betterName,
          phone: betterPhone,
          email: betterEmail,
          tags: mergedTags,
          ghlContactId: betterGhlId,
          _dedupKey: dedupKey
        });
      } else {
        dedupMap.set(dedupKey, cleanRec);
      }
    });

    // Sort by recent timestamp
    const sorted = Array.from(dedupMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    // Assign clean, deterministic sequential CON-0001 IDs
    return sorted.map((rec, index) => ({
      ...rec,
      displayId: rec.displayId && /^CON-\d{4}$/i.test(rec.displayId)
        ? rec.displayId.toUpperCase()
        : (rec.id && /^CON-\d{4}$/i.test(rec.id) ? rec.id.toUpperCase() : `CON-${String(index + 1).padStart(4, '0')}`)
    }));
  };

  // Real-Time Firestore & Backend Inbound Listener (contacts collection only)
  useEffect(() => {
    let unsubs = [];

    // A. Listen exclusively to Firestore 'contacts' collection (NO crm_deals!)
    try {
      if (db) {
        const qContacts = collection(db, 'contacts');
        const unsub1 = onSnapshot(qContacts, (snapshot) => {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setInternalRecords(prev => processAndMergeRecords(prev, docs));
        }, (err) => console.warn('[ContactsPage] Firestore contacts listener notice:', err));
        unsubs.push(unsub1);
      }
    } catch (e) {
      console.warn('[ContactsPage] Firestore setup error:', e);
    }

    // B. Fetch Contacts from SQLite API & Merge Deterministically
    fetch(`${API_URL}/contacts`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
      .then(res => res.json())
      .then(data => {
        const incoming = Array.isArray(data?.contacts) ? data.contacts : (Array.isArray(data) ? data : []);
        if (incoming.length > 0) {
          setInternalRecords(prev => processAndMergeRecords(prev, incoming));
          try {
            localStorage.setItem('omniflow_cached_contacts', JSON.stringify(incoming));
          } catch (e) {
            try {
              localStorage.setItem('omniflow_cached_contacts', JSON.stringify(incoming.slice(0, 2000)));
            } catch (e2) {}
          }
        }
      })
      .catch(() => {});

    // C. Check GHL Integration Status
    fetch(`${API_URL}/v1/integrations/ghl/status`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
      .then(res => res.json())
      .then(data => {
        if (data?.integration?.is_active) {
          setGhlLocationStatus(data.integration.location_id || 'Connected');
        }
      })
      .catch(() => {});

    return () => {
      unsubs.forEach(u => {
        try { u(); } catch (e) {}
      });
    };
  }, [API_URL, token, authUser]);

  // Handle 2-Way GHL Sync Trigger
  const handleTriggerGhl2WaySync = async () => {
    if (isSyncingGhl) return;
    setIsSyncingGhl(true);
    if (showToast) showToast('🔄 Starting GoHighLevel 2-Way Synchronization...', 'info');

    try {
      // Step A: Import from GHL into EMS
      const importRes = await fetch(`${API_URL}/v1/integrations/ghl/contacts/import-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ limit: 100 })
      });
      const importData = await importRes.json();

      // Step B: Push EMS contacts to GHL
      const syncRes = await fetch(`${API_URL}/v1/integrations/ghl/contacts/sync-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ contacts: internalRecords })
      });
      const syncData = await syncRes.json();

      const importedCount = importData?.imported || importData?.total || 0;
      const syncedCount = syncData?.synced || 0;

      if (showToast) {
        showToast(`✅ GHL 2-Way Sync Complete! Synced to GHL: ${syncedCount}, Imported: ${importedCount}`, 'success');
      }

      // Refresh local list from backend
      const refreshRes = await fetch(`${API_URL}/contacts`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      const refreshedData = await refreshRes.json();
      const incoming = Array.isArray(refreshedData?.contacts) ? refreshedData.contacts : (Array.isArray(refreshedData) ? refreshedData : []);
      if (incoming.length > 0) {
        setInternalRecords(prev => processAndMergeRecords(prev, incoming));
      }
    } catch (err) {
      console.error('[GHL 2-Way Sync Error]', err);
      if (showToast) showToast(`❌ GHL Sync Notice: ${err.message || 'Check GHL connection'}`, 'error');
    } finally {
      setIsSyncingGhl(false);
    }
  };

  // Update Records callback from LayoutEngine
  const handleUpdateRecords = (newRecords) => {
    setInternalRecords(newRecords);
    if (typeof setPropContacts === 'function') setPropContacts(newRecords);

    if (Array.isArray(newRecords)) {
      newRecords.forEach(rec => {
        if (rec && rec.id) {
          FirebaseCloudEngine.saveRecord('contacts', rec, companyId);
        }
      });
    }
  };

  // Soft Delete / Move to Recycle Bin
  const handleSoftDelete = async (recordOrId) => {
    const targetId = typeof recordOrId === 'object' ? (recordOrId.id || recordOrId.originalId) : recordOrId;
    if (!targetId) return;

    try {
      if (db) {
        await deleteDoc(doc(db, 'contacts', String(targetId)));
      }
    } catch (e) {
      console.warn('Firestore contact delete notice:', e);
    }

    const rec = (internalRecords || []).find(r => r.id === targetId) || (typeof recordOrId === 'object' ? recordOrId : { id: targetId });
    if (typeof softDeleteRecord === 'function') {
      softDeleteRecord({
        originalId: targetId,
        id: targetId,
        name: rec.name || rec.phone || 'CRM Contact',
        category: 'Contacts & Leads',
        moduleTab: 'contacts',
        entityData: rec
      });
    }

    setInternalRecords(prev => prev.filter(r => r.id !== targetId));
    if (showToast) showToast('🗑️ Contact moved to Recycle Bin', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LayoutEngine
        customHeaderActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* GHL Connection Status Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '6px',
              background: ghlLocationStatus ? 'rgba(13, 148, 136, 0.12)' : 'rgba(100, 116, 139, 0.1)',
              border: ghlLocationStatus ? '1px solid rgba(13, 148, 136, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)',
              color: ghlLocationStatus ? '#0d9488' : '#64748b',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              <Zap size={13} style={{ color: ghlLocationStatus ? '#0d9488' : '#94a3b8' }} />
              <span>{ghlLocationStatus ? 'GHL Connected' : 'GHL Standby'}</span>
            </div>

            {/* 2-Way GHL Sync Button */}
            <button
              type="button"
              onClick={handleTriggerGhl2WaySync}
              disabled={isSyncingGhl}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: '1px solid #1d4ed8',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: isSyncingGhl ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                opacity: isSyncingGhl ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
              title="Synchronize all contacts bidirectionally with GoHighLevel"
            >
              <RefreshCw size={13} className={isSyncingGhl ? 'animate-spin' : ''} style={{ animation: isSyncingGhl ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isSyncingGhl ? 'Syncing with GHL...' : 'Sync with GoHighLevel'}</span>
            </button>
          </div>
        }
        moduleConfig={config}
        records={internalRecords}
        setRecords={handleUpdateRecords}
        authUser={authUser}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
        recycleBinItems={recycleBinItems}
        handleRestoreBinItem={handleRestoreBinItem}
        handlePermanentDeleteBinItem={handlePermanentDeleteBinItem}
        softDeleteRecord={handleSoftDelete}
        showToast={showToast}
        onOpenModuleConfig={openModuleConfigModal}
        onManageStages={onManageStages}
        onOpenChatWithLead={onOpenChatWithLead}
      />
    </div>
  );
}
