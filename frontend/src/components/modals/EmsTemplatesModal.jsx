import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  X, 
  Layers, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Bot,
  Zap,
  Clock
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Workflows' },
  { id: 'AI', label: 'AI & LLMs' },
  { id: 'Marketing', label: 'Marketing' },
  { id: 'Sales', label: 'Sales & CRM' },
  { id: 'Document Ops', label: 'Document Ops' },
  { id: 'Support', label: 'Customer Support' }
];

export default function EmsTemplatesModal({
  isOpen,
  onClose,
  onImportSuccess
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(13205);

  // Fetch templates from cloud API
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchTemplates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let url = `https://api.n8n.io/templates/search?page=${page}&perPage=18`;
        if (searchQuery.trim()) {
          url += `&query=${encodeURIComponent(searchQuery.trim())}`;
        }
        if (selectedCategory !== 'all') {
          url += `&categories=${encodeURIComponent(selectedCategory)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
        const data = await res.json();
        
        if (isMounted) {
          setTemplates(data.workflows || []);
          if (data.total) setTotalCount(data.total);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load templates.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchTemplates, searchQuery ? 350 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, searchQuery, selectedCategory, page]);

  // Import Template into VPS n8n engine
  const handleImport = async (template) => {
    setImportingId(template.id);
    setError(null);
    try {
      // 1. Fetch detailed workflow definition from cloud templates API
      const detailRes = await fetch(`https://api.n8n.io/templates/workflows/${template.id}`);
      if (!detailRes.ok) throw new Error('Failed to download template definition.');
      const detailData = await detailRes.json();
      
      const wfDef = detailData.workflow?.workflow;
      if (!wfDef) throw new Error('Workflow structure was empty in template.');

      // 2. Post workflow into our VPS n8n engine
      const createRes = await fetch('/automations-engine/rest/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: template.name || 'Imported EMS Workflow',
          nodes: wfDef.nodes || [],
          connections: wfDef.connections || {},
          settings: wfDef.settings || {}
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create workflow in studio: ${errText.slice(0, 100)}`);
      }

      const created = await createRes.json();
      const newWorkflowId = created?.data?.id;

      if (!newWorkflowId) throw new Error('No workflow ID returned from engine.');

      // 3. Notify parent to switch canvas
      if (onImportSuccess) {
        onImportSuccess(newWorkflowId, template.name);
      }
      onClose();
    } catch (err) {
      setError(`Import notice: ${err.message}`);
    } finally {
      setImportingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 15, 0.88)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        background: '#0d131a',
        border: '1px solid rgba(20, 210, 203, 0.25)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(13, 148, 136, 0.15)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '1160px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(13, 180, 158, 0.4)'
            }}>
              <Sparkles size={22} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px' }}>
                  EMS Templates
                </h2>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: 'rgba(13, 148, 136, 0.2)',
                  color: '#2dd4bf',
                  border: '1px solid rgba(20, 210, 203, 0.35)'
                }}>
                  {totalCount.toLocaleString()}+ Workflows Ready
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Browse & 1-click import enterprise automations directly into your Studio canvas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div style={{
          padding: '16px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: 'rgba(11, 19, 27, 0.7)',
          flexShrink: 0
        }}>
          {/* Search Box */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', color: '#64748b' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search 13,000+ templates (e.g., WhatsApp Auto Reply, Lead Scraper, OpenAI, Google Sheets, Gmail)..."
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '12px 42px 12px 46px',
                color: '#ffffff',
                fontSize: '13.5px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '14px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {CATEGORIES.map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setPage(1);
                  }}
                  style={{
                    background: active 
                      ? 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: active 
                      ? '1px solid #14b8a6' 
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: active ? '700' : '500',
                    color: active ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          background: '#090e14'
        }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '14px',
                  padding: '20px',
                  height: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  animation: 'pulse 1.5s infinite ease-in-out'
                }}>
                  <div style={{ width: '60%', height: '16px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }} />
                  <div style={{ width: '90%', height: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }} />
                  <div style={{ width: '40%', height: '28px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px' }} />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#64748b'
            }}>
              <Layers size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '16px', color: '#cbd5e1', margin: '0 0 6px' }}>No templates found</h3>
              <p style={{ fontSize: '13px', margin: 0 }}>Try adjusting your search terms or category filter.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
              gap: '20px'
            }}>
              {templates.map(tpl => {
                const isImporting = importingId === tpl.id;
                const nodeNames = (tpl.nodes || [])
                  .map(n => n.displayName || n.name?.split('.').pop() || '')
                  .filter(Boolean)
                  .slice(0, 4);

                return (
                  <div
                    key={tpl.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(20, 210, 203, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div>
                      {/* Title & Views */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#f8fafc',
                          lineHeight: '1.3'
                        }}>
                          {tpl.name}
                        </h4>
                        {tpl.totalViews ? (
                          <span style={{
                            fontSize: '10.5px',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0
                          }}>
                            <TrendingUp size={11} />
                            {tpl.totalViews.toLocaleString()}
                          </span>
                        ) : null}
                      </div>

                      {/* Description */}
                      <p style={{
                        margin: '0 0 14px',
                        fontSize: '12px',
                        color: '#94a3b8',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {tpl.description ? tpl.description.replace(/[#*`_]/g, '') : 'Ready-to-use production workflow automation.'}
                      </p>

                      {/* Node Badges */}
                      {nodeNames.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                          {nodeNames.map((nodeName, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '10.5px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                color: '#cbd5e1'
                              }}
                            >
                              {nodeName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleImport(tpl)}
                      disabled={isImporting}
                      style={{
                        width: '100%',
                        background: isImporting
                          ? 'rgba(13, 148, 136, 0.5)'
                          : 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: isImporting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 15px rgba(13, 148, 136, 0.3)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Importing into Studio...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          <span>Import to Studio</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with pagination */}
        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Showing page {page} • 13,200+ workflows provided natively
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '6px 14px',
                color: page === 1 ? '#475569' : '#cbd5e1',
                fontSize: '12px',
                fontWeight: '600',
                cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '12px', color: '#94a3b8', padding: '0 4px' }}>
              {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={isLoading || templates.length === 0}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '6px 14px',
                color: '#cbd5e1',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
