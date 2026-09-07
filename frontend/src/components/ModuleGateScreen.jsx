import React from 'react';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import MasterModuleRegistry from '../core/registry/MasterModuleRegistry';

export default function ModuleGateScreen({ 
  moduleId, 
  tenantSubscription = null, 
  onNavigateToBilling = null 
}) {
  // Retrieve module manifest details
  const manifest = (MasterModuleRegistry && typeof MasterModuleRegistry.getManifest === 'function' ? MasterModuleRegistry.getManifest(moduleId) : null) || 
    (MasterModuleRegistry && typeof MasterModuleRegistry.getSystemManifest === 'function' ? MasterModuleRegistry.getSystemManifest(moduleId) : null) || {
    id: moduleId,
    name: moduleId ? moduleId.replace(/_/g, ' ').toUpperCase() : 'Module',
    icon: '🔒',
    description: 'This premium capability is part of advanced OmniFlow EMS tiers.',
    category: 'FEATURES'
  };

  const currentPlanName = tenantSubscription?.plan_name || 'Current';

  return (
    <div style={{
      maxWidth: '820px',
      margin: '40px auto',
      padding: '0 20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 30px rgba(15, 43, 38, 0.05)',
        padding: '48px 36px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Decorative Ribbon */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: 'linear-gradient(90deg, #0d9488 0%, #064e43 50%, #14b8a6 100%)'
        }} />

        {/* Lock & Module Icon Stack */}
        <div style={{
          display: 'inline-flex',
          position: 'relative',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.12), rgba(6, 78, 67, 0.06))',
            border: '1.5px solid rgba(13, 148, 136, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '38px',
            boxShadow: '0 8px 20px rgba(13, 148, 136, 0.1)'
          }}>
            {manifest.icon || '📦'}
          </div>
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2.5px solid #ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <Lock size={15} style={{ color: '#5eead4' }} />
          </div>
        </div>

        {/* Category Pill */}
        <div style={{ marginBottom: '14px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            padding: '3px 12px',
            borderRadius: '20px',
            background: '#f1f5f9',
            color: '#475569',
            border: '1px solid #cbd5e1'
          }}>
            {manifest.category || 'PLATFORM MODULE'}
          </span>
        </div>

        {/* Heading */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: '800',
          color: '#0f2b26',
          margin: '0 0 10px 0'
        }}>
          {manifest.name || manifest.title} is Locked
        </h2>

        {/* Description */}
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          maxWidth: '560px',
          margin: '0 auto 24px auto',
          lineHeight: '1.6'
        }}>
          This module is not included in your active <strong>{currentPlanName}</strong> subscription plan.
          {manifest.description ? ` ${manifest.description}` : ''}
        </p>

        {/* Benefits Card */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          maxWidth: '540px',
          margin: '0 auto 30px auto',
          textAlign: 'left'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} style={{ color: '#0d9488' }} />
            <span>Why unlock {manifest.name}?</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Full multi-user team collaboration for this module</li>
            <li>Real-time automated sync & enterprise reporting</li>
            <li>Instant activation — no software reinstallation required</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => {
              if (typeof onNavigateToBilling === 'function') {
                onNavigateToBilling();
              }
            }}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Sparkles size={16} />
            <span>⚡ Upgrade Plan / Add Module</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div style={{ marginTop: '20px', fontSize: '12px', color: '#94a3b8' }}>
          Need assistance or custom enterprise billing? Contact your dedicated Super Admin support.
        </div>
      </div>
    </div>
  );
}
