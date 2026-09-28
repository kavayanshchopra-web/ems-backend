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
  Info
} from 'lucide-react';
import WhatsAppTemplateService, { DEFAULT_WHATSAPP_TEMPLATES } from '../../core/services/whatsAppTemplateService';

const CATEGORIES = [
  'All',
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
  const [formData, setFormData] = useState({
    title: '',
    category: 'Product',
    productName: '',
    content: ''
  });

  const tenantCompany = authUser?.companyName || authUser?.company_name || 'Our Company';
  const tenantAgent = authUser?.name || authUser?.fullName || 'Sales Executive';

  // Load templates on mount or company change
  useEffect(() => {
    if (isOpen) {
      const list = WhatsAppTemplateService.getTemplates(companyId);
      setTemplates(list);
    }
  }, [isOpen, companyId]);

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
      content: 'Hi {name}! 👋 '
    });
    setEditingTemplate('new');
  };

  const handleStartEdit = (tpl) => {
    setFormData({
      title: tpl.title || '',
      category: tpl.category || 'Product',
      productName: tpl.productName || '',
      content: tpl.content || ''
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
        content: formData.content.trim()
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
            content: formData.content.trim()
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
              {CATEGORIES.map(cat => {
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
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Category / Tag
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '7px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
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
                      { tag: '{date}', label: 'Today\'s Date' }
                    ].map(item => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleInsertTag(item.tag)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px dashed #cbd5e1',
                          borderRadius: '5px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#0f766e',
                          cursor: 'pointer'
                        }}
                      >
                        + {item.tag} <span style={{ color: '#94a3b8', fontSize: '10px' }}>({item.label})</span>
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={6}
                    required
                    placeholder="Type WhatsApp message here. Use {name} for lead name, {agent_name} for caller name..."
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
                {editingTemplate ? (
                  WhatsAppTemplateService.personalizeText(formData.content || 'Start typing a message...', {
                    name: 'Ramesh',
                    agentName: tenantAgent,
                    companyName: tenantCompany,
                    phone: '+91 98765 43210'
                  })
                ) : filteredTemplates[0] ? (
                  WhatsAppTemplateService.personalizeText(filteredTemplates[0].content, {
                    name: 'Ramesh',
                    agentName: tenantAgent,
                    companyName: tenantCompany,
                    phone: '+91 98765 43210'
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
    </div>
  );
}
