// OmniFlow EMS — Storage & Plan Upgrade Modal
// Visual progress bar, storage breakdown, tier options (2GB Free ➔ 10GB Pro ➔ 50GB Business)

import React, { useState, useEffect } from 'react';
import StorageQuotaEngine, { STORAGE_TIERS } from '../../core/engines/StorageQuotaEngine.js';
import { X, HardDrive, CheckCircle2, Zap, ArrowRight, ShieldCheck, Database } from 'lucide-react';

export default function StorageUpgradeModal({ isOpen, onClose, tenantId, onTierUpgraded, showToast }) {
  const [loading, setLoading] = useState(true);
  const [quotaStats, setQuotaStats] = useState(null);
  const [upgradingKey, setUpgradingKey] = useState(null);

  const cleanTenant = tenantId || 'acme_corp';

  useEffect(() => {
    if (isOpen) {
      loadStorageDetails();
    }
  }, [isOpen, tenantId]);

  const loadStorageDetails = async () => {
    setLoading(true);
    try {
      const stats = await StorageQuotaEngine.checkQuotaAvailable(cleanTenant);
      setQuotaStats(stats);
    } catch (e) {
      console.error('Failed to load storage quota stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTier = async (tierKey) => {
    if (quotaStats?.tierKey === tierKey) return;
    setUpgradingKey(tierKey);

    try {
      await StorageQuotaEngine.updateTenantTier(cleanTenant, tierKey);
      const newStats = await StorageQuotaEngine.checkQuotaAvailable(cleanTenant);
      setQuotaStats(newStats);

      if (showToast) {
        showToast(`🎉 Storage Plan successfully upgraded to ${STORAGE_TIERS[tierKey].name}!`, 'success');
      }

      if (onTierUpgraded) {
        onTierUpgraded(STORAGE_TIERS[tierKey]);
      }
    } catch (err) {
      if (showToast) showToast(`Failed to upgrade storage plan: ${err.message}`, 'error');
    } finally {
      setUpgradingKey(null);
    }
  };

  if (!isOpen) return null;

  const usedPct = quotaStats?.usedPercentage || 0;
  const isNearLimit = usedPct >= 70 && usedPct < 90;
  const isCritical = usedPct >= 90;

  const barColor = isCritical ? '#ef4444' : isNearLimit ? '#f59e0b' : '#0d9488';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: '#ffffff',
          borderRadius: '20px 20px 0 0',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(20, 210, 203, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardDrive size={22} color="#14d2cb" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Cloud Storage & Plan Management</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>Universal Multi-Tenant Storage Quota & Scalability</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading storage quota stats...</div>
          ) : (
            <>
              {/* Current Storage Meter Card */}
              <div style={{
                background: '#f8fafc',
                border: `1px solid ${isCritical ? '#fecaca' : isNearLimit ? '#fef3c7' : '#e2e8f0'}`,
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '28px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={18} color={barColor} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                      Current Storage Used: {quotaStats?.usedFormatted} of {quotaStats?.limitFormatted} ({usedPct}%)
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: isCritical ? '#fef2f2' : isNearLimit ? '#fffbeb' : '#f0fdf4',
                    color: isCritical ? '#dc2626' : isNearLimit ? '#d97706' : '#16a34a',
                    border: `1px solid ${isCritical ? '#fecaca' : isNearLimit ? '#fef3c7' : '#bbf7d0'}`
                  }}>
                    {isCritical ? '⚠️ QUOTA FULL' : isNearLimit ? '⚡ NEAR LIMIT' : '🟢 HEALTHY'}
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div style={{ height: '10px', width: '100%', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${usedPct}%`,
                    background: barColor,
                    borderRadius: '5px',
                    transition: 'width 0.4s ease'
                  }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                  <span>Remaining: <strong>{quotaStats?.remainingFormatted}</strong></span>
                  <span>Active Tier: <strong style={{ color: '#0d9488' }}>{STORAGE_TIERS[quotaStats?.tierKey]?.name || 'Free Starter'}</strong></span>
                </div>
              </div>

              {/* Tier Selection Grid */}
              <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Select Company Storage Tier</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {Object.values(STORAGE_TIERS).map((tier) => {
                  const isCurrent = quotaStats?.tierKey === tier.key;
                  const isUpgrading = upgradingKey === tier.key;

                  return (
                    <div
                      key={tier.key}
                      style={{
                        background: isCurrent ? '#f0fdf4' : '#ffffff',
                        border: `2px solid ${isCurrent ? '#16a34a' : '#e2e8f0'}`,
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between',
                        position: 'relative',
                        boxShadow: isCurrent ? '0 10px 20px -5px rgba(22, 163, 74, 0.15)' : 'none'
                      }}
                    >
                      {isCurrent && (
                        <span style={{
                          position: 'absolute',
                          top: '-12px',
                          right: '16px',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 10px',
                          borderRadius: '12px',
                          textTransform: 'uppercase'
                        }}>
                          Active Plan
                        </span>
                      )}

                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{tier.name}</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#0d9488', marginBottom: '8px' }}>{tier.limitBytes / (1024 * 1024 * 1024)} GB</div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>{tier.description}</p>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '16px' }}>{tier.priceMonthly}</div>
                      </div>

                      <button
                        onClick={() => handleSelectTier(tier.key)}
                        disabled={isCurrent || isUpgrading}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: isCurrent ? 'default' : 'pointer',
                          background: isCurrent ? '#dcfce7' : 'linear-gradient(135deg, #0d9488, #0f766e)',
                          color: isCurrent ? '#166534' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {isCurrent ? (
                          <>
                            <CheckCircle2 size={16} /> Active Plan
                          </>
                        ) : isUpgrading ? (
                          'Upgrading...'
                        ) : (
                          <>
                            Upgrade <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer Note */}
              <div style={{ marginTop: '24px', padding: '12px 16px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#1e40af' }}>
                <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                <span>Files are organized in isolated tenant folders (`tenants/tenantId/category/`). External links consume 0 Bytes.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
