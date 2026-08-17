import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import MediaStorageEngine from '../../core/engines/MediaStorageEngine.js';
import StorageQuotaEngine from '../../core/engines/StorageQuotaEngine.js';
import Button from '../ui/Button.jsx';
import { Upload, Link as LinkIcon, FileText, Image as ImageIcon, Trash2, Eye, Download, Plus, Loader2 } from 'lucide-react';

export default function RecordAttachmentsTab({
  entityId,
  category = 'general',
  entityName = '',
  tenantId = 'default_tenant',
  showToast = () => {}
}) {
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const loadAttachments = async () => {
    if (!entityId) {
      setAttachments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'media_vault'),
        where('entityId', '==', String(entityId))
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAttachments(list);
    } catch (e) {
      console.warn('Failed to load attachments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [entityId, category]);

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      await MediaStorageEngine.uploadMedia({
        tenantId,
        category,
        entityId: String(entityId),
        file,
        onProgress: (pct) => setUploadProgress(pct)
      });
      showToast(`Uploaded "${file.name}" to ${entityName || 'record'}`, 'success');
      loadAttachments();
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    try {
      await MediaStorageEngine.addExternalLink({
        tenantId,
        category,
        entityId: String(entityId),
        title: linkTitle || linkUrl,
        externalUrl: linkUrl
      });
      showToast('Cloud link attached (0 Bytes Quota)', 'success');
      setLinkTitle('');
      setLinkUrl('');
      setShowLinkModal(false);
      loadAttachments();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    }
  };

  const handleOpenFile = async (item) => {
    try {
      const url = await MediaStorageEngine.resolveDownloadUrl(item);
      if (url) {
        window.open(url, '_blank');
      } else {
        showToast('File URL unavailable', 'error');
      }
    } catch (err) {
      showToast(`Could not open file: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete attachment "${item.fileName}"?`)) return;
    try {
      await MediaStorageEngine.deleteMedia(tenantId, item.downloadUrl, item.fileSize || 0, item.id);
      showToast('Attachment deleted', 'info');
      loadAttachments();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
            📎 Files & Documents {entityName ? `(${entityName})` : ''}
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
            All attachments sync 100% in Firebase Cloud across all devices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: '#0d9488', color: 'white', fontSize: '12px', fontWeight: '700', cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
            <span>{uploading ? `Uploading ${uploadProgress}%...` : 'Upload File'}</span>
            <input type="file" onChange={handleUploadFile} disabled={uploading} style={{ display: 'none' }} />
          </label>

          <Button variant="secondary" size="sm" icon={<LinkIcon size={13} />} onClick={() => setShowLinkModal(true)}>
            Add Cloud Link
          </Button>
        </div>
      </div>

      {/* External Link Modal */}
      {showLinkModal && (
        <form onSubmit={handleAddLink} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Attach Google Drive / Cloud Link (0 Bytes Quota)</div>
          <input
            type="text"
            placeholder="Link Title (e.g. GST Certificate / Requirements Spec)"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
          />
          <input
            type="url"
            placeholder="Paste URL (e.g. https://drive.google.com/...)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            required
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <Button variant="outline" size="sm" type="button" onClick={() => setShowLinkModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Attach Link</Button>
          </div>
        </form>
      )}

      {/* Attachments List */}
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>Loading attachments...</div>
      ) : attachments.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '12px' }}>
          No files attached to this record yet. Click "Upload File" above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {attachments.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                {item.isExternal ? <LinkIcon size={16} color="#0284c7" /> : item.mimeType?.startsWith('image/') ? <ImageIcon size={16} color="#16a34a" /> : <FileText size={16} color="#0d9488" />}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.fileName}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {item.isExternal ? 'Cloud Link (0 B)' : StorageQuotaEngine.formatBytes(item.fileSize || 0)} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenFile(item)}
                  title="View / Download File"
                  style={{ padding: '5px', borderRadius: '4px', border: 'none', background: 'rgba(13,148,136,0.1)', color: '#0d9488', cursor: 'pointer' }}
                >
                  <Eye size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  title="Delete Attachment"
                  style={{ padding: '5px', borderRadius: '4px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
