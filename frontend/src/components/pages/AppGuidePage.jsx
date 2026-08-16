import React from 'react';

const AppGuidePage = ({
  authUser,
  guideSteps,
  setGuideSteps,
  openInputModal,
  showToast,
  startInteractiveTour,
  setActiveTab
}) => {
  return (
    <div style={{ padding: 'var(--space-6)', margin: 'var(--space-4)', overflowY: 'auto', flexGrow: 1 }} className="glass-panel">

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
            🚀
          </div>
          <div>
            <h1 className="page-header-title">EMS &amp; WhatsApp CRM Walkthrough &amp; Guide</h1>
            <p className="page-header-subtitle">Dynamic self-updating product tour. Onboarding steps sync whenever new features are added or modified.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'superadmin') && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontSize: 'var(--text-sm)' }}
              onClick={() => {
                openInputModal({
                  title: 'Add New Guide Step',
                  subtitle: 'Enter feature walkthrough step title',
                  placeholder: 'e.g. AI Broadcast Engine',
                  onSave: (title) => {
                    const newStep = {
                      id: 'step_' + Date.now(),
                      stepNumber: guideSteps.length + 1,
                      icon: '🚀',
                      title: title.trim(),
                      category: 'New Feature',
                      targetTab: 'sessions',
                      description: 'New feature setup step.',
                      isLive: true
                    };
                    setGuideSteps(prev => [...prev, newStep]);
                    showToast(`Added Step #${newStep.stepNumber}: "${title.trim()}" live to guide!`, 'success');
                  }
                });
              }}
            >
              ➕ Add Custom Step
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            onClick={() => startInteractiveTour(0)}
          >
            🚀 Start Guided Tour
          </button>
        </div>
      </div>

      {/* Guide Step Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
        {guideSteps.filter(s => s.isLive !== false).map((step, idx) => (
          <div key={step.id} className="payroll-table-card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '2rem' }}>{step.icon || '📱'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="badge-info" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)' }}>
                  STEP {idx + 1}
                </span>
                {(authUser?.role === 'owner' || authUser?.role === 'superadmin') && guideSteps.length > 1 && (
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: '2px 8px', fontSize: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none' }}
                    onClick={() => {
                      setGuideSteps(prev => prev.filter(st => st.id !== step.id));
                      showToast(`Removed Step "${step.title}" from live guide.`, 'info');
                    }}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
            </div>
            <h4 style={{ fontWeight: 'var(--fw-bold)', fontSize: 'var(--text-md)', color: 'var(--text-primary)', margin: 0 }}>{step.title}</h4>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0, flexGrow: 1 }}>
              {step.description}
            </p>
            <button className="btn btn-secondary" style={{ padding: '8px', fontSize: 'var(--text-xs)' }} onClick={() => setActiveTab(step.targetTab)}>
              Go to {step.category || 'Module'} ➔
            </button>
          </div>
        ))}
      </div>

      {/* Visual Blueprint Section */}
      <div className="payroll-table-card" style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
          <div>
            <h3 className="payroll-table-title">📖 Full Visual System Setup &amp; Onboarding Blueprint</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
              Step-by-step documentation manual for complete organization training.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              showToast('Opening complete_system_setup_guide.md manual...', 'success');
              window.open('file:///C:/Users/Lenovo/.gemini/antigravity-ide/brain/f848a984-058b-45dd-bf5f-da24f8a9ca49/complete_system_setup_guide.md', '_blank');
            }}
            style={{ padding: '10px 16px', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', whiteSpace: 'nowrap' }}
          >
            📥 Download Setup Manual
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          {[
            { step: '1', title: 'WhatsApp QR Pairing', desc: 'Scan QR via WhatsApp Linked Devices to enable multi-agent inbox & automated chatbot rules.' },
            { step: '2', title: 'RBAC Permissions Matrix', desc: 'Configure granular Create, Read, Edit, Delete, Export, Approve capabilities per role.' },
            { step: '3', title: 'Live GPS & Geofencing', desc: 'Real-time employee coordinates, battery %, vehicle speed, and historical day route replay.' },
            { step: '4', title: 'Auto Payroll & Payslips', desc: 'Calculate salaries from attendance days and download PDF payslips with 1-click.' }
          ].map(item => (
            <div key={item.step} style={{ padding: 'var(--space-4)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', fontSize: '11px', fontWeight: 'var(--fw-bold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.step}</span>
                <h5 style={{ fontWeight: 'var(--fw-bold)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0 }}>{item.title}</h5>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AppGuidePage;
