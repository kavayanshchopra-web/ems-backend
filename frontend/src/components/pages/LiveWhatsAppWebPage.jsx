import React from 'react';
import { 
  Smartphone, 
  Flame, 
  Globe, 
  PhoneCall, 
  Bot, 
  Users, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function LiveWhatsAppWebPage({
  authUser,
  sessions = [],
  contacts = [],
  activeContact,
  setActiveContact,
  setActiveTab
}) {
  const activeTenant = String(
    authUser?.tenantId || 
    authUser?.companyId || 
    (typeof window !== 'undefined' && window.__omniflow_tenant) || 
    '1'
  );

  const modules = [
    {
      id: 'warmer',
      title: 'AI Number Warmer',
      desc: 'Gradual peer-to-peer conversations, auto-pacing & health score to protect numbers from bans.',
      icon: Flame,
      color: '#f97316',
      bg: '#fff7ed',
      border: '#ffedd5',
      badge: 'Anti-Ban Engine'
    },
    {
      id: 'proxy',
      title: 'Dedicated Proxy Manager',
      desc: 'Assign dedicated HTTP/SOCKS5 proxies to each WhatsApp account with auto-rotation.',
      icon: Globe,
      color: '#0d9488',
      bg: '#f0fdfa',
      border: '#ccfbf1',
      badge: 'IP Isolation'
    },
    {
      id: 'responder',
      title: 'Call Auto-Responder',
      desc: 'Instantly detect rejected or missed WhatsApp voice calls and dispatch automated template follow-ups.',
      icon: PhoneCall,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#dbeafe',
      badge: 'Zero-Drop Leads'
    },
    {
      id: 'flows',
      title: 'Visual Flow & Button Bot',
      desc: 'Interactive button menus, list pickers, and keyword-triggered qualification flows.',
      icon: Bot,
      color: '#8b5cf6',
      bg: '#f5f3ff',
      border: '#ede9fe',
      badge: 'Lead Capture'
    },
    {
      id: 'extractor',
      title: 'Group Grabber & Filter',
      desc: 'Extract participants from joined groups and verify active WhatsApp numbers before blasting.',
      icon: Users,
      color: '#10b981',
      bg: '#f0fdf4',
      border: '#dcfce7',
      badge: 'Audience Builder'
    },
    {
      id: 'broadcast',
      title: 'Smart Paced Broadcaster',
      desc: 'Multi-account round-robin broadcast with random delays, spintax, and variable tags.',
      icon: Zap,
      color: '#e11d48',
      bg: '#fff1f2',
      border: '#ffe4e6',
      badge: 'High Delivery'
    }
  ];

  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      padding: '24px 32px',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      {/* Top Header Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '28px 32px',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#16a34a',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '0.3px'
            }}>
              <Sparkles size={13} />
              NEW CLEAN ARCHITECTURE (V2)
            </span>
            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              Tenant ID: {activeTenant}
            </span>
          </div>

          <h1 style={{
            fontSize: '24px',
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
            }}>
              <Smartphone size={20} />
            </div>
            WhatsApp Marketing & Growth Suite
          </h1>
          <p style={{
            color: '#64748b',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: 0
          }}>
            Legacy iframe and desktop webview dependencies have been completely purged. Ready to build the next-generation clean-white WhatsApp engine with high-speed multi-account warming, proxy isolation, and smart call responders.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('conversations')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={15} />
            Open CRM Conversations
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Legacy Cleanup</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Iframe & Webview Purged</div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#f0fdfa',
            color: '#0d9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Data Isolation</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>100% Tenant Isolated</div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#fff7ed',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Flame size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Next Phase</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>LeadWave Growth Engine</div>
          </div>
        </div>
      </div>

      {/* Grid of New Planned Architecture Modules */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
          Suite Capabilities Being Built
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
          Every feature below will be engineered natively into this screen without external iframe lag.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {modules.map((m) => {
          const IconComp = m.icon;
          return (
            <div
              key={m.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '22px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: m.bg,
                    border: `1px solid ${m.border}`,
                    color: m.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconComp size={20} />
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: m.color,
                    backgroundColor: m.bg,
                    border: `1px solid ${m.border}`,
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    {m.badge}
                  </span>
                </div>

                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '800',
                  color: '#0f172a',
                  margin: '0 0 8px 0'
                }}>
                  {m.title}
                </h3>

                <p style={{
                  fontSize: '13px',
                  color: '#64748b',
                  lineHeight: '1.55',
                  margin: '0 0 16px 0'
                }}>
                  {m.desc}
                </p>
              </div>

              <div style={{
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: '700',
                color: '#0d9488'
              }}>
                <span>Ready to Activate</span>
                <ArrowRight size={14} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
