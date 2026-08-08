// OmniFlow EMS — Media Storage Manager View & Quota Dashboard
// Full Page View for Storage Analytics, File Vault, 2GB Quota Meter & Plan Upgrades

import React, { useState, useEffect } from 'react';
import StorageQuotaEngine, { STORAGE_TIERS } from '../../core/engines/StorageQuotaEngine.js';
import MediaStorageEngine from '../../core/engines/MediaStorageEngine.js';
import IndexedDBStorage from '../../core/engines/IndexedDBStorage.js';
import { db } from '../../firebase.js';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc } from 'firebase/firestore';
import {
  HardDrive,
  Upload,
  Link as LinkIcon,
  Trash2,
  Download,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  ExternalLink,
  ShieldAlert,
  Database,
  ArrowUpRight,
  Folder,
  RefreshCw,
  Search,
  CheckCircle2,
  X
} from 'lucide-react';
import StorageUpgradeModal from './StorageUpgradeModal.jsx';

export default function MediaStorageView({ authUser, showToast }) {
  const [loading, setLoading] = useState(true);
  const [quotaStats, setQuotaStats] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);

  // External Link Modal state
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [extTitle, setExtTitle] = useState('');
  const [extUrl, setExtUrl] = useState('');

  // In-App Previewer state
  const [activePreviewFile, setActivePreviewFile] = useState(null);

  const getTenantString = (t) => {
    if (!t) return 'acme_corp';
    if (typeof t === 'string') return t;
    if (typeof t === 'object') return t.id || t.tenantId || t.companyId || 'acme_corp';
    return String(t);
  };
  const cleanTenant = getTenantString(authUser?.tenantId || authUser?.companyId);

  // Expose tenantId globally so SchemaFieldRenderer (which has no authUser) can read it
  if (typeof window !== 'undefined') {
    window.__omniflow_tenant = cleanTenant;
  }

  useEffect(() => {
    loadData();

    const handleVaultUpdated = () => {
      loadData(true);
    };

    window.addEventListener('media_vault_updated', handleVaultUpdated);
    return () => {
      window.removeEventListener('media_vault_updated', handleVaultUpdated);
    };
  }, [cleanTenant]);

  const syncAllAppMedia = async (tenantId) => {
    try {
      // Pre-fetch all media_vault records to resolve real download URLs
      const vaultSnap = await getDocs(query(collection(db, 'media_vault'), where('tenantId', '==', tenantId)));
      const existingVaultMap = new Map();
      vaultSnap.forEach(doc => {
        const data = doc.data();
        if (data.fileName) existingVaultMap.set(data.fileName.toLowerCase(), data.downloadUrl);
        if (data.originalFileName) existingVaultMap.set(data.originalFileName.toLowerCase(), data.downloadUrl);
      });

      const isMediaFileValue = (val) => {
        if (!val || typeof val !== 'string' || val === '—' || val.trim() === '') return false;
        const lower = val.toLowerCase();
        if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:') || lower.startsWith('indexeddb:')) return true;
        const fileExts = ['.png', '.jpg', '.jpeg', '.pdf', '.webp', '.doc', '.docx', '.svg', '.gif', '.xls', '.xlsx'];
        return fileExts.some(ext => lower.endsWith(ext));
      };

      const extractMediaValues = (recordData) => {
        if (!recordData || typeof recordData !== 'object') return [];
        const files = [];
        for (const [k, v] of Object.entries(recordData)) {
          if (isMediaFileValue(v)) {
            files.push(v);
          }
        }
        return files;
      };

      // Scan Employees collection for any real media / document URLs or filenames
      const empSnap = await getDocs(collection(db, 'employees'));
      for (const d of empSnap.docs) {
        const data = d.data();
        const detectedDocs = extractMediaValues(data);
        for (const docVal of detectedDocs) {
          const resolvedUrl = docVal.startsWith('http') || docVal.startsWith('data:') || docVal.startsWith('indexeddb:')
            ? docVal
            : (existingVaultMap.get(docVal.toLowerCase()) || docVal);

          if (resolvedUrl) {
            const vQ = query(collection(db, 'media_vault'), where('tenantId', '==', tenantId), where('fileName', '==', docVal));
            const vSnap = await getDocs(vQ);
            if (vSnap.empty) {
              await addDoc(collection(db, 'media_vault'), {
                tenantId,
                category: 'employee_documents',
                entityId: d.id,
                fileName: docVal,
                fileSize: resolvedUrl.length || 60000,
                downloadUrl: resolvedUrl,
                isExternal: false,
                createdAt: data.createdAt || new Date().toISOString()
              });
            }
          }
        }
      }

      // Scan Contacts & Leads collection for any real media / document URLs or filenames
      const leadSnap = await getDocs(collection(db, 'contacts'));
      for (const d of leadSnap.docs) {
        const data = d.data();
        const detectedDocs = extractMediaValues(data);
        for (const docVal of detectedDocs) {
          const resolvedUrl = docVal.startsWith('http') || docVal.startsWith('data:') || docVal.startsWith('indexeddb:')
            ? docVal
            : (existingVaultMap.get(docVal.toLowerCase()) || docVal);

          if (resolvedUrl) {
            const vQ = query(collection(db, 'media_vault'), where('tenantId', '==', tenantId), where('fileName', '==', docVal));
            const vSnap = await getDocs(vQ);
            if (vSnap.empty) {
              await addDoc(collection(db, 'media_vault'), {
                tenantId,
                category: 'crm_leads',
                entityId: d.id,
                fileName: docVal,
                fileSize: resolvedUrl.length || 50000,
                downloadUrl: resolvedUrl,
                isExternal: false,
                createdAt: data.createdAt || new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Auto media sync warning:', err);
    }
  };

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // 1. Load ALL Media Vault Files (no tenantId filter — avoids mismatch bugs)
      const allVaultSnap = await getDocs(collection(db, 'media_vault'));
      const list = [];
      const seenDocIds = new Set();

      allVaultSnap.forEach((d) => {
        if (!seenDocIds.has(d.id)) {
          seenDocIds.add(d.id);
          const data = d.data();
          // Purge dummy legacy records with # or 250000 bytes
          const isDummy = !data.downloadUrl || data.downloadUrl === '#' || data.fileSize === 250000;
          if (isDummy) {
            deleteDoc(doc(db, 'media_vault', d.id)).catch(() => {});
          } else {
            // Clean fileName: if fileName is a base64/very long string, use originalFileName instead
            let cleanFileName = data.fileName || data.originalFileName || 'Uploaded File';
            if (cleanFileName.startsWith('data:') || cleanFileName.length > 200) {
              cleanFileName = data.originalFileName || `File_${d.id.substring(0, 8)}`;
            }
            list.push({ id: d.id, ...data, fileName: cleanFileName });
          }
        }
      });

      const isMediaFileVal = (val) => {
        if (!val || typeof val !== 'string' || val === '—' || val.trim() === '') return false;
        const lower = val.toLowerCase();
        if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:') || lower.startsWith('indexeddb:')) return true;
        const fileExts = ['.png', '.jpg', '.jpeg', '.pdf', '.webp', '.doc', '.docx', '.svg', '.gif', '.xls', '.xlsx'];
        return fileExts.some(ext => lower.endsWith(ext));
      };

      // Also pull local storage fallback employee documents (including custom field filenames like TEST)
      const localEmps = JSON.parse(localStorage.getItem('omnilflow_fallback_employees') || '[]');
      localEmps.forEach((emp) => {
        if (emp && typeof emp === 'object') {
          Object.values(emp).forEach((val) => {
            if (isMediaFileVal(val)) {
              const exists = list.some(m => m.downloadUrl === val || m.fileName === val);
              if (!exists) {
                list.push({
                  id: `emp_doc_${emp.id || Math.random()}_${Math.random().toString(36).substring(2, 6)}`,
                  tenantId: cleanTenant,
                  category: 'employee_documents',
                  fileName: val,
                  fileSize: val.length || 120000,
                  downloadUrl: val,
                  createdAt: emp.createdAt || new Date().toISOString()
                });
              }
            }
          });
        }
      });

      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      // 2. Calculate initial Quota Stats & Render Table IMMEDIATELY (<100ms)
      const actualTotalBytes = list.reduce((sum, item) => sum + (item.isExternal ? 0 : (item.fileSize || 0)), 0);
      StorageQuotaEngine.recalculateStorageUsage(cleanTenant, actualTotalBytes);

      const stats = await StorageQuotaEngine.checkQuotaAvailable(cleanTenant);
      setQuotaStats(stats);
      setMediaFiles(list);
      setSelectedIds([]);
      setLoading(false); // Screen is rendered instantly!

      // 3. Asynchronously run background document sync without blocking UI
      setTimeout(async () => {
        try {
          await syncAllAppMedia(cleanTenant, forceRefresh);
        } catch (e) {
          console.warn('Background sync warning:', e);
        }
      }, 50);
    } catch (e) {
      console.error('Failed to load media vault:', e);
      setLoading(false);
    }
  };

  // Direct File Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await MediaStorageEngine.uploadMedia({
        tenantId: cleanTenant,
        category: 'general_media',
        entityId: 'vault',
        file: file,
        onProgress: (pct) => setUploadProgress(pct)
      });

      if (showToast) showToast(`✅ Uploaded ${file.name} successfully!`, 'success');
      loadData(true);
    } catch (err) {
      if (err.code === 'QUOTA_EXCEEDED') {
        setShowUpgradeModal(true);
      }
      if (showToast) showToast(`Upload Failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  // Add External Link Handler (0 Bytes Quota)
  const handleAddExternalLink = async (e) => {
    e.preventDefault();
    if (!extUrl) return;

    try {
      await MediaStorageEngine.addExternalLink({
        tenantId: cleanTenant,
        category: 'external_links',
        entityId: 'vault',
        title: extTitle || extUrl,
        externalUrl: extUrl
      });

      if (showToast) showToast('🔗 External link added (0 Bytes Quota Used)!', 'success');
      setShowExternalModal(false);
      setExtTitle('');
      setExtUrl('');
      loadData(true);
    } catch (err) {
      if (showToast) showToast(`Failed: ${err.message}`, 'error');
    }
  };

  // Safe File Opener (Converts Data URL & IndexedDB Blobs to Blob URLs safely to bypass browser top-frame block)
  const handleOpenFile = async (file) => {
    if (!file || !file.downloadUrl) return;

    if (file.downloadUrl.startsWith('indexeddb://')) {
      const blobId = file.downloadUrl.replace('indexeddb://', '');
      const blob = await IndexedDBStorage.getBlob(blobId);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        setActivePreviewFile({ ...file, downloadUrl: blobUrl });
        window.open(blobUrl, '_blank');
      } else {
        if (showToast) showToast('File content not found in local browser vault', 'error');
      }
      return;
    }

    setActivePreviewFile(file);

    if (file.downloadUrl.startsWith('data:')) {
      try {
        const parts = file.downloadUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        
        // Clean base64 string
        const base64Data = parts[1].replace(/\s/g, '');
        const bstr = window.atob(base64Data);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (e) {
        console.warn('Blob URL fallback exception:', e);
      }
    } else {
      window.open(file.downloadUrl, '_blank');
    }
  };

  // Delete Single File Handler (Reclaims Quota & Cleans Fallbacks)
  const handleDeleteFile = async (item) => {
    if (!window.confirm(`Delete "${item.fileName}" permanently and reclaim storage space?`)) return;

    try {
      if (!item.isExternal && item.storagePath) {
        await MediaStorageEngine.deleteMedia(cleanTenant, item.storagePath, item.fileSize || 0);
      }
      if (!item.id.startsWith('emp_doc_')) {
        await deleteDoc(doc(db, 'media_vault', item.id));
      } else {
        // Remove from local fallback employees
        const localEmps = JSON.parse(localStorage.getItem('omnilflow_fallback_employees') || '[]');
        const updatedEmps = localEmps.map(emp => {
          if (emp.media === item.fileName || emp.documents === item.fileName) {
            return { ...emp, media: '', documents: '' };
          }
          return emp;
        });
        localStorage.setItem('omnilflow_fallback_employees', JSON.stringify(updatedEmps));
      }

      if (showToast) showToast(`🗑️ File deleted and quota reclaimed!`, 'success');
      loadData(true);
    } catch (err) {
      if (showToast) showToast(`Failed to delete: ${err.message}`, 'error');
    }
  };

  // Selection Logic for Bulk Actions
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredFiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFiles.map((f) => f.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected files and reclaim storage quota?`)) return;

    let reclaimedBytes = 0;
    let deletedCount = 0;

    try {
      const itemsToDelete = mediaFiles.filter((f) => selectedIds.includes(f.id));
      for (const item of itemsToDelete) {
        if (!item.isExternal && item.storagePath) {
          await MediaStorageEngine.deleteMedia(cleanTenant, item.storagePath, item.fileSize || 0);
        }
        if (!item.id.startsWith('emp_doc_')) {
          await deleteDoc(doc(db, 'media_vault', item.id));
        } else {
          const localEmps = JSON.parse(localStorage.getItem('omnilflow_fallback_employees') || '[]');
          const updatedEmps = localEmps.map(emp => {
            if (emp.media === item.fileName || emp.documents === item.fileName) {
              return { ...emp, media: '', documents: '' };
            }
            return emp;
          });
          localStorage.setItem('omnilflow_fallback_employees', JSON.stringify(updatedEmps));
        }
        reclaimedBytes += item.fileSize || 0;
        deletedCount++;
      }

      if (showToast) showToast(`🗑️ Successfully deleted ${deletedCount} files (${StorageQuotaEngine.formatBytes(reclaimedBytes)} reclaimed)!`, 'success');
      loadData(true);
    } catch (err) {
      if (showToast) showToast(`Bulk delete error: ${err.message}`, 'error');
    }
  };

  // Helper function for inclusive category matching across app modules
  const matchesTab = (f, tabKey) => {
    if (tabKey === 'all') return true;
    if (tabKey === 'external_links') return f.isExternal || f.category === 'external_links';
    if (tabKey === 'employee_documents') return ['employee_documents', 'employee', 'recruitment', 'kyc', 'hr'].includes(f.category);
    if (tabKey === 'crm_leads') return ['crm_leads', 'crm_chats', 'client_visits', 'lead', 'contact', 'chat'].includes(f.category);
    // General Media catches everything not matched above (form_upload, general, expenses, etc.)
    if (tabKey === 'general_media') {
      if (!f.category || f.category === '' || f.isExternal) return false;
      const nonGeneral = ['employee_documents', 'employee', 'recruitment', 'kyc', 'hr',
                          'crm_leads', 'crm_chats', 'client_visits', 'lead', 'contact', 'chat',
                          'external_links'];
      return !nonGeneral.includes(f.category);
    }
    return f.category === tabKey;
  };

  // Filtered files list
  const filteredFiles = mediaFiles.filter((f) => {
    const matchesCategory = matchesTab(f, activeCategoryFilter);
    const matchesSearch = (f.fileName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const usedPct = quotaStats?.usedPercentage || 0;
  const isCritical = usedPct >= 90;
  const isNearLimit = usedPct >= 70 && usedPct < 90;
  const barColor = isCritical ? '#ef4444' : isNearLimit ? '#f59e0b' : '#0d9488';

  const getFileIcon = (mimeType, isExternal) => {
    if (isExternal) return <LinkIcon size={18} color="#0284c7" />;
    if (!mimeType) return <FileText size={18} color="#64748b" />;
    if (mimeType.startsWith('image/')) return <ImageIcon size={18} color="#16a34a" />;
    if (mimeType.startsWith('video/')) return <Film size={18} color="#9333ea" />;
    if (mimeType.startsWith('audio/')) return <Music size={18} color="#d97706" />;
    return <FileText size={18} color="#0d9488" />;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner: Storage Meter & Overview */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        borderRadius: '20px',
        padding: '28px',
        color: '#ffffff',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'rgba(20, 210, 203, 0.15)', border: '1px solid rgba(20, 210, 203, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardDrive size={28} color="#14d2cb" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Storage & Media Manager</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Multi-Tenant Cloud File Vault — Active Plan: <strong style={{ color: '#14d2cb' }}>{STORAGE_TIERS[quotaStats?.tierKey]?.name || 'Free Starter (2 GB)'}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowUpgradeModal(true)}
              style={{
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
              }}
            >
              <Database size={16} /> Upgrade Storage Plan
            </button>
            <button
              onClick={() => loadData(true)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '10px 14px',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
              title="Force Re-sync Vault"
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Real-Time Storage Progress Bar */}
        <div style={{ marginTop: '24px', background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
            <span>Storage Capacity Used: {quotaStats?.usedFormatted || '0 Bytes'} of {quotaStats?.limitFormatted || '2 GB'} ({usedPct}%)</span>
            <span style={{ color: barColor }}>{quotaStats?.remainingFormatted || '2 GB'} Remaining</span>
          </div>

          <div style={{ height: '10px', width: '100%', background: 'rgba(255,255,255,0.15)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${usedPct}%`, background: barColor, borderRadius: '5px', transition: 'width 0.4s ease' }}></div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
        {[
          { key: 'all', label: 'All Files', count: mediaFiles.length },
          { key: 'employee_documents', label: 'Employee Docs', count: mediaFiles.filter(f => matchesTab(f, 'employee_documents')).length },
          { key: 'crm_leads', label: 'CRM Leads', count: mediaFiles.filter(f => matchesTab(f, 'crm_leads')).length },
          { key: 'general_media', label: 'General Media', count: mediaFiles.filter(f => matchesTab(f, 'general_media')).length },
          { key: 'external_links', label: 'External Links', count: mediaFiles.filter(f => matchesTab(f, 'external_links')).length }
        ].map((tab) => {
          const isActive = activeCategoryFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveCategoryFilter(tab.key)}
              style={{
                background: isActive ? '#0f172a' : '#f8fafc',
                color: isActive ? '#ffffff' : '#64748b',
                border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                color: isActive ? '#ffffff' : '#475569',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action Bar & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        {/* Search & Bulk Delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search files or links..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
            />
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Trash2 size={16} /> Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>

        {/* Upload Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '9px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Upload size={16} /> Upload Media File
            <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
          </label>

          <button
            onClick={() => setShowExternalModal(true)}
            style={{
              background: '#f8fafc',
              color: '#0284c7',
              border: '1px solid #bae6fd',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <LinkIcon size={16} /> Add External Link (0 Bytes)
          </button>
        </div>
      </div>

      {uploading && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', color: '#1e40af' }}>
          ⏳ Uploading file... {uploadProgress}%
        </div>
      )}

      {/* Media Vault File Table */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '14px 16px', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={filteredFiles.length > 0 && selectedIds.length === filteredFiles.length}
                  onChange={handleToggleSelectAll}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
              </th>
              <th style={{ padding: '14px 16px' }}>File Name</th>
              <th style={{ padding: '14px 16px' }}>Category</th>
              <th style={{ padding: '14px 16px' }}>Size</th>
              <th style={{ padding: '14px 16px' }}>Uploaded At</th>
              <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No media files found in company vault. Upload a file or add an external link above!
                </td>
              </tr>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = selectedIds.includes(file.id);
                return (
                  <tr key={file.id} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#f0fdf4' : 'transparent' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(file.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {getFileIcon(file.mimeType, file.isExternal)}
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.fileName}
                          </div>
                          {file.isExternal && (
                            <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                              EXTERNAL LINK (0 BYTES)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#64748b' }}>
                      {file.category ? file.category.replace('_', ' ') : 'General'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>
                      {file.isExternal ? '0 Bytes' : StorageQuotaEngine.formatBytes(file.fileSize)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                      {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenFile(file)}
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                        >
                          <ExternalLink size={14} /> Open
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* External Link Modal */}
      {showExternalModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '450px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800 }}>Add External Link (Google Drive / Dropbox)</h3>
            <form onSubmit={handleAddExternalLink}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>File Title</label>
                <input
                  type="text"
                  placeholder="e.g. Employee Handbook Google Doc"
                  value={extTitle}
                  onChange={(e) => setExtTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>External URL</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={extUrl}
                  onChange={(e) => setExtUrl(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowExternalModal(false)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0d9488', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Save Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tier Upgrade Modal */}
      <StorageUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        tenantId={cleanTenant}
        onTierUpgraded={() => loadData()}
        showToast={showToast}
      />

      {/* In-App Interactive Document Preview Modal */}
      {activePreviewFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '950px', width: '100%', height: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#0f172a', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#14d2cb" />
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{activePreviewFile.fileName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={activePreviewFile.downloadUrl}
                  download={activePreviewFile.fileName}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'rgba(20, 210, 203, 0.2)',
                    border: '1px solid rgba(20, 210, 203, 0.4)',
                    color: '#14d2cb',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} /> Download File
                </a>
                <button onClick={() => setActivePreviewFile(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: '#f8fafc', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {activePreviewFile.mimeType === 'application/pdf' || activePreviewFile.fileName?.endsWith('.pdf') ? (
                <iframe src={activePreviewFile.downloadUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }} title="PDF Preview" />
              ) : activePreviewFile.mimeType?.startsWith('image/') ? (
                <img src={activePreviewFile.downloadUrl} alt={activePreviewFile.fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px' }} />
              ) : (
                <iframe src={activePreviewFile.downloadUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }} title="Document Preview" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
