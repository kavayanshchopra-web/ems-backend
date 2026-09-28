/**
 * WhatsAppTemplatesModal.jsx
 * Admin & Telecaller Configuration Modal for WhatsApp Message Templates & Products
 * Allows creating, editing, categorizing, and testing message templates with dynamic variables.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  RotateCcw, 
  MessageSquare, 
  Sparkles, 
  Send, 
  Package, 
  Tag, 
  Search,
  ExternalLink,
  Info,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  UploadCloud,
  Folder,
  HardDrive,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import WhatsAppTemplateService, { DEFAULT_WHATSAPP_TEMPLATES } from '../../core/services/whatsAppTemplateService';
import TenantStorage from '../../core/services/TenantStorage';
import MediaStorageEngine from '../../core/engines/MediaStorageEngine';

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const DEFAULT_CATEGORIES = [
  'Product',
  'Greeting',
  'Brochure',
  'Follow-up',
  'Meeting',
  'Billing',
  'Offer',
  'Support'
];

export default function WhatsAppTemplatesModal({
  isOpen = false,
  onClose = () => {},
  companyId = '1',
  authUser = null,
  showToast = () => {}
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null); // null means viewing list
  const [customCategories, setCustomCategories] = useState(() => {
    return TenantStorage.getItem('whatsapp_custom_categories', companyId, []);
  });
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: 'Product',
    productName: '',
    content: '',
    attachment: null
  });

  // Media Storage Picker State
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaVaultFiles, setMediaVaultFiles] = useState([]);
  const [loadingMediaVault, setLoadingMediaVault] = useState(false);
  const [mediaPickerSearch, setMediaPickerSearch] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Dynamically compute all available categories
  const allCategories = useMemo(() => {
    const set = new Set([...DEFAULT_CATEGORIES, ...(Array.isArray(customCategories) ? customCategories : [])]);
    templates.forEach(t => {
      if (t.category && t.category !== 'All') set.add(t.category);
    });
    return Array.from(set);
  }, [customCategories, templates]);

  const filterCategories = useMemo(() => ['All', ...allCategories], [allCategories]);

  const tenantCompany = authUser?.companyName || authUser?.company_name || 'Our Company';
  const tenantAgent = authUser?.name || authUser?.fullName || 'Sales Executive';

  // Load templates on mount or company change
  useEffect(() => {
    if (isOpen) {
      const list = WhatsAppTemplateService.getTemplates(companyId);
      setTemplates(list);
    }
  }, [isOpen, companyId]);

  // Open Media Storage Picker
  const handleOpenMediaPicker = async () => {
    setShowMediaPicker(true);
    setLoadingMediaVault(true);
    try {
      const list = await MediaStorageEngine.fetchMediaList(companyId);
      setMediaVaultFiles(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('Error fetching media vault:', e);
      setMediaVaultFiles([]);
    } finally {
      setLoadingMediaVault(false);
    }
  };

  // Select an item from Media Storage
  const handleSelectMediaItem = (item) => {
    const downloadUrl = item.file_url || item.downloadUrl || item.fileUrl || '';
    const fileName = item.file_name || item.original_file_name || item.fileName || 'Attached_Document';
    const fileSize = formatFileSize(item.file_size || item.fileSize);
    const mimeType = item.mime_type || item.mimeType || 'application/pdf';

    setFormData(prev => {
      const hasDocTag = prev.content.includes('{document_url}') || (downloadUrl && prev.content.includes(downloadUrl));
      return {
        ...prev,
        attachment: {
          url: downloadUrl,
          fileName,
          fileSize,
          mimeType,
          mediaId: item.id
        },
        content: hasDocTag ? prev.content : `${prev.content.trim()}\n\n📄 Brochure / Details: {document_url}`
      };
    });

    setShowMediaPicker(false);
    if (showToast) showToast(`Attached "${fileName}" from Media Storage`, 'success');
  };

  // Upload a new file directly into Media Storage & attach
  const handleUploadDirectFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    setUploadProgress(20);
    try {
      const res = await MediaStorageEngine.uploadMedia({
        tenantId: companyId,
        category: 'whatsapp_templates',
        file,
        metadata: { templateTitle: formData.title || 'WhatsApp Template' },
        onProgress: (p) => setUploadProgress(p)
      });

      const downloadUrl = res.downloadUrl || res.fileUrl || '';
      const fileName = res.fileName || file.name;
      const fileSize = formatFileSize(res.fileSize || file.size);
      const mimeType = res.mimeType || file.type || 'application/pdf';

      setFormData(prev => {
        const hasDocTag = prev.content.includes('{document_url}') || (downloadUrl && prev.content.includes(downloadUrl));
        return {
          ...prev,
          attachment: {
            url: downloadUrl,
            fileName,
            fileSize,
            mimeType,
            mediaId: res.id
          },
          content: hasDocTag ? prev.content : `${prev.content.trim()}\n\n📄 Brochure / Details: {document_url}`
        };
      });

      // Also refresh vault list if picker was open
      setMediaVaultFiles(prev => [res, ...prev]);
      setShowMediaPicker(false);
      if (showToast) showToast(`Uploaded & attached "${fileName}" to Media Storage!`, 'success');
    } catch (err) {
      console.error('File upload failed:', err);
      if (showToast) showToast(`Failed to upload to Media Storage: ${err.message}`, 'warning');
    } finally {
      setUploadingAttachment(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = () => {
    setFormData(prev => ({
      ...prev,
      attachment: null
    }));
    if (showToast) showToast('Attachment removed', 'info');
  };

  // Filtered Media Storage Files for Picker
  const filteredVaultFiles = useMemo(() => {
    if (!mediaPickerSearch.trim()) return mediaVaultFiles;
    const q = mediaPickerSearch.toLowerCase();
    return mediaVaultFiles.filter(f => {
      const name = (f.file_name || f.original_file_name || f.fileName || '').toLowerCase();
      const cat = (f.category || '').toLowerCase();
      return name.includes(q) || cat.includes(q);
    });
  }, [mediaVaultFiles, mediaPickerSearch]);

  // Filtered list
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory = selectedCategory === 'All' || tpl.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        tpl.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.productName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  const handleStartAdd = () => {
    setFormData({
      title: '',
      category: selectedCategory === 'All' ? 'Product' : selectedCategory,
      productName: '',
      content: 'Hi {name}! 👋 ',
      attachment: null
    });
    setEditingTemplate('new');
  };

  const handleStartEdit = (tpl) => {
    setFormData({
      title: tpl.title || '',
      category: tpl.category || 'Product',
      productName: tpl.productName || '',
      content: tpl.content || '',
      attachment: tpl.attachment || null
    });
    setEditingTemplate(tpl.id);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this WhatsApp template?')) return;
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    WhatsAppTemplateService.saveTemplates(companyId, updated);
    if (showToast) showToast('Template removed successfully', 'success');
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset all WhatsApp templates to the standard 12 product & sales templates? Custom edits will be replaced.')) return;
    const defs = WhatsAppTemplateService.resetToDefaults(companyId);
    setTemplates(defs);
    if (showToast) showToast('Reset to 12 default templates', 'info');
  };

  const handleInsertTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      content: (prev.content || '') + tag
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      if (showToast) showToast('Please enter both title and message template', 'warning');
      return;
    }

    let updatedList = [...templates];
    if (editingTemplate === 'new') {
      const newTpl = {
        id: `tpl_${Date.now()}`,
        title: formData.title.trim(),
        category: formData.category,
        productName: formData.productName.trim(),
        content: formData.content.trim(),
        attachment: formData.attachment || null
      };
      updatedList.push(newTpl);
    } else {
      updatedList = updatedList.map(t => {
        if (t.id === editingTemplate) {
          return {
            ...t,
            title: formData.title.trim(),
            category: formData.category,
            productName: formData.productName.trim(),
            content: formData.content.trim(),
            attachment: formData.attachment || null
          };
        }
        return t;
      });
    }

    setTemplates(updatedList);
    WhatsAppTemplateService.saveTemplates(companyId, updatedList);
    setEditingTemplate(null);
    if (showToast) showToast('Template saved successfully', 'success');
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
          color: '#ffffff',
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(37,211,102,0.3)'
            }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', letterSpacing: '-0.3px' }}>
                WhatsApp Products & Message Templates
              </h2>
              <div style={{ fontSize: '12px', color: '#a7f3d0', marginTop: '2px' }}>
                Pre-configured sales pitches, product details & 1-click follow-up messages
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flex: 1, minHeight: '480px', overflow: 'hidden' }}>
          
          {/* Main List or Form */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #f1f5f9', overflow: 'hidden' }}>
            
            {/* Top Toolbar */}
            <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search templates or products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {!editingTemplate && (
                <button
                  type="button"
                  onClick={handleStartAdd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#047857',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(4,120,87,0.25)'
                  }}
                >
                  <Plus size={14} /> Add Template
                </button>
              )}

              <button
                type="button"
                onClick={handleResetDefaults}
                title="Restore default 12 templates"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#ffffff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={12} /> Reset Defaults
              </button>
            </div>

            {/* Category Filter Pills */}
            <div style={{ padding: '8px 18px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '6px', overflowX: 'auto' }}>
              {filterCategories.map(cat => {
                const isSelected = selectedCategory === cat;
                const count = cat === 'All' ? templates.length : templates.filter(t => t.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? '700' : '500',
                      background: isSelected ? '#ecfdf5' : '#f8fafc',
                      color: isSelected ? '#047857' : '#64748b',
                      border: `1px solid ${isSelected ? '#a7f3d0' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>{cat}</span>
                    <span style={{
                      fontSize: '10px',
                      background: isSelected ? '#047857' : '#cbd5e1',
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '0 5px',
                      lineHeight: '14px'
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Editing Form or Template List */}
            {editingTemplate ? (
              <form onSubmit={handleSave} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                    {editingTemplate === 'new' ? '✨ Create New WhatsApp Template' : '✏️ Edit Template'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(null)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Template Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Starter CRM Plan Details"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '7px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155' }}>
                        Category / Tag *
                      </label>
                      {!isAddingNewCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewCategory(true);
                            setNewCategoryInput('');
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#047857',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          + Add New Category
                        </button>
                      )}
                    </div>

                    {isAddingNewCategory ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Type custom tag (e.g. Solar, Loans, Real Estate)"
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const trimmed = newCategoryInput.trim();
                              if (trimmed) {
                                const updated = Array.from(new Set([...customCategories, trimmed]));
                                setCustomCategories(updated);
                                TenantStorage.setItem('whatsapp_custom_categories', updated, companyId);
                                setFormData(prev => ({ ...prev, category: trimmed }));
                                setIsAddingNewCategory(false);
                                setNewCategoryInput('');
                              }
                            }
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '7px',
                            border: '1.5px solid #047857',
                            fontSize: '12px',
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newCategoryInput.trim();
                            if (trimmed) {
                              const updated = Array.from(new Set([...customCategories, trimmed]));
                              setCustomCategories(updated);
                              TenantStorage.setItem('whatsapp_custom_categories', updated, companyId);
                              setFormData(prev => ({ ...prev, category: trimmed }));
                              setIsAddingNewCategory(false);
                              setNewCategoryInput('');
                              if (showToast) showToast(`Added category "${trimmed}"`, 'success');
                            }
                          }}
                          style={{
                            padding: '0 12px',
                            background: '#047857',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '7px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewCategory(false)}
                          style={{
                            padding: '0 8px',
                            background: '#f1f5f9',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                            borderRadius: '7px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          if (e.target.value === '__add_custom__') {
                            setIsAddingNewCategory(true);
                            setNewCategoryInput('');
                          } else {
                            setFormData(prev => ({ ...prev, category: e.target.value }));
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '7px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px',
                          boxSizing: 'border-box'
                        }}
                      >
                        {allCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="__add_custom__" style={{ fontWeight: '700', color: '#047857' }}>
                          ➕ + Add New Custom Category / Tag...
                        </option>
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Product or Service Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Starter CRM, Voxbay Cloud, HRMS"
                    value={formData.productName}
                    onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '7px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155' }}>
                      Message Content *
                    </label>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Click chips below to insert variables
                    </span>
                  </div>

                  {/* Insertable dynamic placeholders */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {[
                      { tag: '{name}', label: 'Customer Name' },
                      { tag: '{agent_name}', label: 'Agent Name' },
                      { tag: '{company_name}', label: 'Company' },
                      { tag: '{phone}', label: 'Phone' },
                      { tag: '{date}', label: 'Today\'s Date' },
                      { tag: '{document_url}', label: 'Document / File Link' }
                    ].map(item => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleInsertTag(item.tag)}
                        style={{
                          background: item.tag === '{document_url}' ? '#ecfdf5' : '#f1f5f9',
                          border: `1px dashed ${item.tag === '{document_url}' ? '#10b981' : '#cbd5e1'}`,
                          borderRadius: '5px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: item.tag === '{document_url}' ? '#047857' : '#0f766e',
                          cursor: 'pointer'
                        }}
                      >
                        + {item.tag} <span style={{ color: item.tag === '{document_url}' ? '#059669' : '#94a3b8', fontSize: '10px' }}>({item.label})</span>
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={5}
                    required
                    placeholder="Type WhatsApp message here. Use {name} for lead name, {agent_name} for caller name, {document_url} for brochure link..."
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      lineHeight: '1.5',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* 📎 Attached Document / Media Section (Media Storage Engine) */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Paperclip size={14} color="#047857" />
                      <span>Attached PDF, Brochure or Media (Optional)</span>
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#047857', fontWeight: '700' }}>
                      ⚡ Powered by Media Storage
                    </span>
                  </div>

                  {formData.attachment ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: '#ecfdf5',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: '8px',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '6px',
                          background: (formData.attachment.mimeType || '').startsWith('image/') ? '#3b82f6' : '#ef4444',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '800',
                          flexShrink: 0
                        }}>
                          {(formData.attachment.mimeType || '').startsWith('image/') ? <ImageIcon size={18} /> : 'PDF'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#064e3b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {formData.attachment.fileName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#047857', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{formData.attachment.fileSize}</span>
                            <a
                              href={formData.attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#0f766e', fontWeight: '700', textDecoration: 'underline' }}
                            >
                              👁️ View / Download
                            </a>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {!formData.content.includes('{document_url}') && (
                          <button
                            type="button"
                            onClick={() => handleInsertTag('\n\n📄 Brochure / Details: {document_url}')}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '5px',
                              border: '1px solid #86efac',
                              background: '#ffffff',
                              color: '#047857',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            + Insert Link in Text
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '5px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleOpenMediaPicker}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1.5px dashed #0d9488',
                          background: 'rgba(13, 148, 136, 0.05)',
                          color: '#0f766e',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Folder size={15} color="#0d9488" />
                        <span>📁 Select from Media Storage</span>
                      </button>

                      <label
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1.5px dashed #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: uploadingAttachment ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <UploadCloud size={15} color="#047857" />
                        <span>{uploadingAttachment ? `Uploading ${uploadProgress}%...` : '⬆️ Upload New File (PDF, Image)'}</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                          disabled={uploadingAttachment}
                          onChange={handleUploadDirectFile}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(null)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '7px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      borderRadius: '7px',
                      border: 'none',
                      background: '#047857',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(4,120,87,0.25)'
                    }}
                  >
                    <Check size={14} /> Save Template
                  </button>
                </div>
              </form>
            ) : (
              /* Templates List */
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredTemplates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <MessageSquare size={36} color="#cbd5e1" style={{ marginBottom: '10px' }} />
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>No templates found in this category.</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11.5px' }}>Click "Add Template" above to create one.</p>
                  </div>
                ) : (
                  filteredTemplates.map((tpl, idx) => (
                    <div
                      key={tpl.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                              {idx + 1}. {tpl.title}
                            </span>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: '700',
                              padding: '2px 7px',
                              borderRadius: '12px',
                              background: tpl.category === 'Product' ? '#ecfdf5' : '#f1f5f9',
                              color: tpl.category === 'Product' ? '#047857' : '#475569',
                              border: `1px solid ${tpl.category === 'Product' ? '#a7f3d0' : '#e2e8f0'}`
                            }}>
                              {tpl.category}
                            </span>
                            {tpl.productName && (
                              <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: '600' }}>
                                📦 {tpl.productName}
                              </span>
                            )}
                            {tpl.attachment && (
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: '700',
                                padding: '2px 7px',
                                borderRadius: '12px',
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }} title={`Attached: ${tpl.attachment.fileName}`}>
                                <FileText size={11} />
                                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {tpl.attachment.fileName}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            title="Edit Template"
                            onClick={() => handleStartEdit(tpl)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '4px 7px',
                              cursor: 'pointer',
                              color: '#334155'
                            }}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            title="Delete Template"
                            onClick={() => handleDelete(tpl.id)}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              padding: '4px 7px',
                              cursor: 'pointer',
                              color: '#dc2626'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: '1.45',
                        background: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {tpl.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right Live WhatsApp Simulator Preview */}
          <div style={{
            width: '320px',
            background: '#efeae2',
            backgroundImage: 'radial-gradient(#d1d7db 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #cbd5e1'
          }}>
            <div style={{
              background: '#075e54',
              color: '#ffffff',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#ffffff',
                color: '#075e54',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '13px'
              }}>
                R
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>Ramesh Kumar (Lead)</div>
                <div style={{ fontSize: '10px', color: '#a7f3d0' }}>online • +91 98765 43210</div>
              </div>
            </div>

            {/* Chat Bubble Area */}
            <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{
                alignSelf: 'flex-end',
                background: '#dcf8c6',
                borderRadius: '8px 0px 8px 8px',
                padding: '9px 12px',
                maxWidth: '90%',
                boxShadow: '0 1px 1px rgba(0,0,0,0.13)',
                fontSize: '12px',
                color: '#111827',
                lineHeight: '1.45',
                whiteSpace: 'pre-wrap',
                position: 'relative'
              }}>
                {/* 📄 WhatsApp Document / Image Card in Simulator */}
                {(() => {
                  const activeAttachment = editingTemplate ? formData.attachment : (filteredTemplates[0]?.attachment || null);
                  if (!activeAttachment) return null;
                  const isImg = (activeAttachment.mimeType || '').startsWith('image/');
                  if (isImg && activeAttachment.url) {
                    return (
                      <div style={{ marginBottom: '8px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                        <img
                          src={activeAttachment.url}
                          alt={activeAttachment.fileName || 'Attachment'}
                          style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    );
                  }
                  return (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(0, 0, 0, 0.06)',
                      borderRadius: '6px',
                      padding: '7px 9px',
                      marginBottom: '8px',
                      border: '1px solid rgba(0, 0, 0, 0.08)'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '5px',
                        background: '#ef4444',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        fontSize: '9.5px',
                        flexShrink: 0
                      }}>
                        PDF
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {activeAttachment.fileName || 'Document.pdf'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>
                          {activeAttachment.fileSize || 'PDF Document'}
                        </div>
                      </div>
                      <Download size={14} color="#047857" style={{ flexShrink: 0 }} />
                    </div>
                  );
                })()}

                {editingTemplate ? (
                  WhatsAppTemplateService.personalizeText(formData.content || 'Start typing a message...', {
                    name: 'Ramesh',
                    agentName: tenantAgent,
                    companyName: tenantCompany,
                    phone: '+91 98765 43210',
                    documentUrl: formData.attachment?.url || ''
                  })
                ) : filteredTemplates[0] ? (
                  WhatsAppTemplateService.personalizeText(filteredTemplates[0].content, {
                    name: 'Ramesh',
                    agentName: tenantAgent,
                    companyName: tenantCompany,
                    phone: '+91 98765 43210',
                    documentUrl: filteredTemplates[0]?.attachment?.url || ''
                  })
                ) : (
                  'No template selected'
                )}

                <div style={{ textAlign: 'right', fontSize: '9px', color: '#6b7280', marginTop: '4px' }}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div style={{ padding: '8px 12px', background: '#f0f2f5', borderTop: '1px solid #d1d7db', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
              ℹ️ Live personalized preview for telecallers
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Total Configured: <strong>{templates.length} templates</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: '#064e3b',
              color: '#ffffff',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>

      {/* Media Storage Vault Picker Modal */}
      {showMediaPicker && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10005,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669'
                }}>
                  <Folder size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Select from Media Storage Vault
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Choose any brochure, pricing sheet, or media stored in your workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search & Upload bar */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              background: '#ffffff'
            }}>
              <div style={{
                position: 'relative',
                flex: 1
              }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search stored documents or images..."
                  value={mediaPickerSearch}
                  onChange={(e) => setMediaPickerSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    fontSize: '12.5px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>

              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#059669',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}>
                {uploadingAttachment ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                {uploadingAttachment ? `Uploading (${uploadProgress}%)...` : 'Upload New File'}
                <input
                  type="file"
                  accept="application/pdf,image/*,.doc,.docx"
                  onChange={handleUploadDirectFile}
                  disabled={uploadingAttachment}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Content List */}
            <div style={{
              padding: '16px 20px',
              overflowY: 'auto',
              flex: 1,
              maxHeight: '400px'
            }}>
              {loadingMediaVault ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px', color: '#059669' }} />
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>Loading Media Storage files...</div>
                </div>
              ) : mediaVaultFiles.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1'
                }}>
                  <HardDrive size={36} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155' }}>
                    No files found in Media Storage
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '360px', margin: '4px auto 14px' }}>
                    Upload your brochures, product PDF catalogs, or sample images directly to store and attach them.
                  </p>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#059669',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}>
                    <UploadCloud size={15} />
                    Upload File to Vault
                    <input
                      type="file"
                      accept="application/pdf,image/*,.doc,.docx"
                      onChange={handleUploadDirectFile}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                  {mediaVaultFiles
                    .filter(file => {
                      if (!mediaPickerSearch) return true;
                      const q = mediaPickerSearch.toLowerCase();
                      const name = (file.file_name || file.original_file_name || file.fileName || '').toLowerCase();
                      const cat = (file.category || '').toLowerCase();
                      return name.includes(q) || cat.includes(q);
                    })
                    .map((item, idx) => {
                      const name = item.file_name || item.original_file_name || item.fileName || `Document_${idx + 1}`;
                      const size = formatFileSize(item.file_size || item.fileSize);
                      const isImg = (item.mime_type || item.mimeType || '').startsWith('image/');
                      const isPdf = (item.mime_type || item.mimeType || '').includes('pdf') || name.toLowerCase().endsWith('.pdf');
                      const url = item.file_url || item.downloadUrl || item.fileUrl || '';

                      return (
                        <div
                          key={item.id || idx}
                          onClick={() => handleSelectMediaItem(item)}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#059669';
                            e.currentTarget.style.backgroundColor = '#f0fdf4';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            background: isImg ? '#eff6ff' : isPdf ? '#fef2f2' : '#f8fafc',
                            border: isImg ? '1px solid #bfdbfe' : isPdf ? '1px solid #fecaca' : '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isImg ? (
                              <ImageIcon size={20} color="#2563eb" />
                            ) : isPdf ? (
                              <FileText size={20} color="#dc2626" />
                            ) : (
                              <Folder size={20} color="#64748b" />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '12.5px',
                              fontWeight: '700',
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} title={name}>
                              {name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              <span>{size}</span>
                              {item.category && <span style={{ color: '#059669', fontWeight: '600' }}>• {item.category}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Attach
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Bottom cancel */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

