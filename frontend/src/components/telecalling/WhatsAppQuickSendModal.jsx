/**
 * WhatsAppQuickSendModal.jsx
 * Telecaller 1-Click WhatsApp Quick Send Modal
 * Allows telecallers to pick a product/template, review personalized message, and launch WhatsApp in 1 click.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Search, 
  Check, 
  Settings, 
  ExternalLink, 
  User, 
  Phone, 
  Sparkles,
  ArrowRight,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  Copy
} from 'lucide-react';
import WhatsAppTemplateService from '../../core/services/whatsAppTemplateService';

export default function WhatsAppQuickSendModal({
  isOpen = false,
  onClose = () => {},
  phone = '',
  contactName = 'Customer',
  leadRecord = null,
  companyId = '1',
  authUser = null,
  showToast = () => {},
  onOpenManageTemplates = null
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [customizedMessage, setCustomizedMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const tenantCompany = authUser?.companyName || authUser?.company_name || 'Our Company';
  const tenantAgent = authUser?.name || authUser?.fullName || 'Sales Executive';

  // Find active selected template
  const activeTpl = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Dynamically derive categories from configured templates
  const quickCategories = useMemo(() => {
    const set = new Set(['All']);
    templates.forEach(t => {
      if (t.category && t.category !== 'All') set.add(t.category);
    });
    return Array.from(set);
  }, [templates]);

  // Load templates on open
  useEffect(() => {
    if (isOpen) {
      const list = WhatsAppTemplateService.getTemplates(companyId);
      setTemplates(list);

      // Select first template by default if available
      const defaultTpl = list[0];
      if (defaultTpl) {
        setSelectedTemplateId(defaultTpl.id);
        const personalized = WhatsAppTemplateService.personalizeText(defaultTpl.content, {
          name: contactName || leadRecord?.name || 'Customer',
          agentName: tenantAgent,
          companyName: tenantCompany,
          phone: phone,
          documentUrl: defaultTpl.attachment?.url || '',
          brochureUrl: defaultTpl.attachment?.url || '',
          attachmentUrl: defaultTpl.attachment?.url || '',
          attachment: defaultTpl.attachment
        });
        setCustomizedMessage(personalized);
      } else {
        setSelectedTemplateId(null);
        setCustomizedMessage('');
      }
    }
  }, [isOpen, companyId, phone, contactName, tenantAgent, tenantCompany, leadRecord]);

  // When selected template changes
  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    const personalized = WhatsAppTemplateService.personalizeText(tpl.content, {
      name: contactName || leadRecord?.name || 'Customer',
      agentName: tenantAgent,
      companyName: tenantCompany,
      phone: phone,
      documentUrl: tpl.attachment?.url || '',
      brochureUrl: tpl.attachment?.url || '',
      attachmentUrl: tpl.attachment?.url || '',
      attachment: tpl.attachment
    });
    setCustomizedMessage(personalized);
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCat = selectedCategory === 'All' || tpl.category === selectedCategory;
      const matchesQuery = !searchQuery.trim() ||
        tpl.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.productName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Handle copy document URL
  const handleCopyDocUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    if (showToast) showToast('Document link copied to clipboard!', 'info');
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Send handler
  const handleSendWhatsApp = () => {
    if (!phone) {
      if (showToast) showToast('No valid phone number for this lead', 'warning');
      return;
    }
    const cleanDigits = WhatsAppTemplateService.formatCleanPhone(phone);
    if (!cleanDigits) {
      if (showToast) showToast('Invalid phone number format', 'warning');
      return;
    }

    const activeTpl = templates.find(t => t.id === selectedTemplateId) || {
      id: 'custom',
      title: 'WhatsApp Message',
      category: selectedCategory !== 'All' ? selectedCategory : 'General'
    };

    // Auto-Tag the lead across Telecalling, CRM, and Kanban
    const tagInfo = WhatsAppTemplateService.logWhatsAppSent({
      companyId,
      phone: cleanDigits,
      contactName: contactName || leadRecord?.name || 'Customer',
      template: activeTpl,
      agentName: tenantAgent,
      leadRecord: leadRecord,
      attachment: activeTpl?.attachment
    });

    WhatsAppTemplateService.openWhatsApp(cleanDigits, customizedMessage);
    if (showToast) {
      showToast(`🚀 WhatsApp sent! Auto-tagged as "${tagInfo?.tag || activeTpl.title}"`, 'success');
    }
    onClose();
  };

  const handleOpenBlankChat = () => {
    if (!phone) {
      if (showToast) showToast('No valid phone number', 'warning');
      return;
    }
    const cleanDigits = WhatsAppTemplateService.formatCleanPhone(phone);
    WhatsAppTemplateService.openWhatsApp(cleanDigits, '');
    if (showToast) showToast(`Opened WhatsApp chat for ${contactName || 'Lead'}`, 'info');
    onClose();
  };

  if (!isOpen) return null;

  const cleanDisplayPhone = WhatsAppTemplateService.formatCleanPhone(phone);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '88vh',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.28)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
          color: '#ffffff',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(37,211,102,0.3)'
            }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800' }}>
                Quick Send WhatsApp to {contactName || 'Lead'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1px' }}>
                <span>📱 {cleanDisplayPhone ? `+${cleanDisplayPhone}` : phone || 'No phone'}</span>
                <span>•</span>
                <span>Agent: {tenantAgent}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {onOpenManageTemplates && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenManageTemplates();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(255,255,255,0.18)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                title="Configure Templates"
              >
                <Settings size={12} /> Manage Templates
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '6px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2-Column Split View */}
        <div style={{ display: 'flex', flex: 1, minHeight: '440px', overflow: 'hidden' }}>
          
          {/* Left Column: Template Selector */}
          <div style={{
            width: '46%',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            background: '#f8fafc'
          }}>
            {/* Search Input */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '9px', top: '9px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search template or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 28px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            <div style={{ padding: '6px 10px', display: 'flex', gap: '4px', overflowX: 'auto', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
              {quickCategories.map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '14px',
                      fontSize: '11px',
                      fontWeight: isSelected ? '700' : '500',
                      background: isSelected ? '#047857' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Templates List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTemplates.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  No matching templates found.
                </div>
              ) : (
                filteredTemplates.map(tpl => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '9px',
                        border: isSelected ? '2px solid #047857' : '1px solid #e2e8f0',
                        background: isSelected ? '#ffffff' : '#ffffff',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 2px 6px rgba(4,120,87,0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: isSelected ? '#047857' : '#0f172a' }}>
                          {tpl.title}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background: isSelected ? '#ecfdf5' : '#f1f5f9',
                          color: isSelected ? '#047857' : '#64748b'
                        }}>
                          {tpl.category}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4'
                      }}>
                        {tpl.content}
                      </div>

                      {tpl.attachment && (
                        <div style={{
                          marginTop: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#065f46',
                          fontSize: '10px',
                          fontWeight: '700'
                        }}>
                          <Paperclip size={10} />
                          <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tpl.attachment.fileName || 'Attached Document'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Message Preview & Customization Editor */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            padding: '16px 20px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="#047857" />
                <span>Personalized Message Preview</span>
              </label>
              <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                Editable before sending
              </span>
            </div>

            {/* Attached Document Card (if template has attachment) */}
            {activeTpl?.attachment && (
              <div style={{
                marginBottom: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: activeTpl.attachment.mimeType?.startsWith('image/') ? '#eff6ff' : '#fef2f2',
                    border: activeTpl.attachment.mimeType?.startsWith('image/') ? '1px solid #bfdbfe' : '1px solid #fecaca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: activeTpl.attachment.mimeType?.startsWith('image/') ? '#2563eb' : '#dc2626',
                    flexShrink: 0
                  }}>
                    {activeTpl.attachment.mimeType?.startsWith('image/') ? (
                      <ImageIcon size={18} />
                    ) : (
                      <FileText size={18} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }} title={activeTpl.attachment.fileName}>
                      {activeTpl.attachment.fileName || 'Attached Document'}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                      {activeTpl.attachment.fileSize || 'Attached'} • Auto-linked in message
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleCopyDocUrl(activeTpl.attachment.url)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    title="Copy document URL to clipboard"
                  >
                    {copiedLink ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    {copiedLink ? 'Copied' : 'Copy Link'}
                  </button>

                  <a
                    href={activeTpl.attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 9px',
                      borderRadius: '6px',
                      background: '#047857',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
                    title="Open document in browser"
                  >
                    <Download size={12} />
                    Open
                  </a>
                </div>
              </div>
            )}

            {/* Editable Textarea with Green Tint WhatsApp Theme */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '10px',
              padding: '12px',
              position: 'relative'
            }}>
              <textarea
                rows={9}
                value={customizedMessage}
                onChange={(e) => setCustomizedMessage(e.target.value)}
                placeholder="Choose a template on the left, or type your custom message..."
                style={{
                  width: '100%',
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#064e3b',
                  lineHeight: '1.5',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #bbf7d0', paddingTop: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '10.5px', color: '#166534' }}>
                  Placeholders filled: <strong>{contactName || 'Lead'}</strong>, <strong>{tenantAgent}</strong>, <strong>{tenantCompany}</strong>
                </span>
                <span style={{ fontSize: '10.5px', color: '#166534', fontWeight: '700' }}>
                  {customizedMessage.length} chars
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '9px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={16} /> Send via WhatsApp (1-Click)
              </button>

              <button
                type="button"
                onClick={handleOpenBlankChat}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <MessageSquare size={13} /> Open Blank WhatsApp Chat (No template)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11.5px',
          color: '#64748b'
        }}>
          <div>
            Direct redirect: <code>wa.me/{cleanDisplayPhone || 'phone'}</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
