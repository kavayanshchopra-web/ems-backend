import React from 'react';
import KanbanPattern from '../patterns/KanbanPattern';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import { FileText } from 'lucide-react';

/**
 * Defensive string extractor helper
 * Safely handles strings, numbers, nulls, and legacy objects like { name, archived }
 */
const getValString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.label === 'string') return val.label;
    if (typeof val.value === 'string') return val.value;
  }
  return fallback;
};

/**
 * Initial Default Candidates (Presentation Display when workspace pool is empty)
 */
const DEFAULT_DEMO_CANDIDATES = [
  { id: 'cand_1', name: 'Vikram Sharma', position: 'Senior Full Stack Engineer', status: 'Applied', resume: 'Resume_Vikram_Sharma.pdf' },
  { id: 'cand_2', name: 'Ananya Roy', position: 'UI/UX Product Designer', status: 'Interviewing', resume: 'Portfolio_Ananya_2026.pdf' },
  { id: 'cand_3', name: 'Rahul Verma', position: 'Technical Product Manager', status: 'Offered', resume: 'Rahul_Verma_CV.pdf' },
  { id: 'cand_4', name: 'Priya Sundaram', position: 'QA Automation Lead', status: 'Hired', resume: 'Priya_Sundaram_Resume.pdf' }
];

/**
 * Phase 2C — Recruitment ATS View (Global Design System v2.0 - Micro Polished)
 * Content-driven height on mobile/tablet to eliminate blank stage whitespace.
 */
export default function RecruitmentAtsView({
  atsCandidates = []
}) {
  const displayCandidates = atsCandidates && atsCandidates.length > 0 ? atsCandidates : DEFAULT_DEMO_CANDIDATES;

  // Normalize and calculate metrics safely
  const totalApplicants = displayCandidates.length;

  const interviewingCount = displayCandidates.filter(c => {
    const st = getValString(c.status).toLowerCase();
    return st === 'interviewing';
  }).length;

  const offeredCount = displayCandidates.filter(c => {
    const st = getValString(c.status).toLowerCase();
    return st === 'offered';
  }).length;

  const hiredCount = displayCandidates.filter(c => {
    const st = getValString(c.status).toLowerCase();
    return st === 'hired';
  }).length;

  // Pipeline Stage Configuration
  const stages = [
    {
      id: 'applied',
      name: 'Applied',
      emoji: '📥',
      list: displayCandidates.filter(c => {
        const st = getValString(c.status).toLowerCase();
        return st === 'applied';
      })
    },
    {
      id: 'interviewing',
      name: 'Interviewing',
      emoji: '🗣️',
      list: displayCandidates.filter(c => {
        const st = getValString(c.status).toLowerCase();
        return st === 'interviewing';
      })
    },
    {
      id: 'offered',
      name: 'Offered',
      emoji: '📋',
      list: displayCandidates.filter(c => {
        const st = getValString(c.status).toLowerCase();
        return st === 'offered';
      })
    },
    {
      id: 'hired',
      name: 'Hired',
      emoji: '✅',
      list: displayCandidates.filter(c => {
        const st = getValString(c.status).toLowerCase();
        return st === 'hired';
      })
    }
  ];

  return (
    <KanbanPattern
      icon="🧑‍💼"
      title="Recruitment ATS"
      subtitle="Candidate Pipeline & Hiring Overview"
      badgeText={`${totalApplicants} Total Candidates`}
    >
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* KPI Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <StatCard
            icon="👥"
            title="TOTAL APPLICANTS"
            value={totalApplicants}
            subtitle="Registered Talent Roster"
            trend="Active Pool"
            badgeText="All Applicants"
            badgeBg="rgba(13, 148, 136, 0.1)"
            badgeColor="#0d9488"
          />
          <StatCard
            icon="🗣️"
            title="INTERVIEWING"
            value={interviewingCount}
            subtitle="Active Screening & Rounds"
            trend="In Review"
            trendDirection="up"
            badgeText="Interviewing"
            badgeBg="rgba(37, 99, 235, 0.1)"
            badgeColor="#2563eb"
          />
          <StatCard
            icon="📋"
            title="OFFERS EXTENDED"
            value={offeredCount}
            subtitle="Pending Acceptance"
            trend="Offer Stage"
            badgeText="Offered"
            badgeBg="rgba(245, 158, 11, 0.1)"
            badgeColor="#d97706"
          />
          <StatCard
            icon="✅"
            title="HIRED"
            value={hiredCount}
            subtitle="Successful Onboardings"
            trend="Completed"
            trendDirection="up"
            badgeText="Hired"
            badgeBg="rgba(16, 185, 129, 0.1)"
            badgeColor="#059669"
          />
        </div>

        {/* 4-Stage Kanban Columns Viewport */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            alignItems: 'start',
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '8px'
          }}
        >
          {stages.map((stage) => {
            return (
              <div
                key={stage.id}
                className="ats-stage-card"
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {/* Stage Header */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{stage.emoji}</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                      {stage.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(13, 148, 136, 0.1)',
                      color: '#0d9488'
                    }}
                  >
                    {stage.list.length}
                  </span>
                </div>

                {/* Candidate Cards Column Content */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {stage.list.length === 0 ? (
                    <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <EmptyState
                        title=""
                        description="No applicants in this stage."
                      />
                    </div>
                  ) : (
                    stage.list.map((cand, idx) => {
                      const candName = getValString(cand.name, 'Applicant');
                      const candPosition = getValString(cand.position, 'Position Pending');
                      const candResume = getValString(cand.resume);

                      return (
                        <div
                          key={cand.id || idx}
                          style={{
                            background: '#f8fafc',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            transition: 'all 0.15s ease',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                            {candName}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', marginTop: '2px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                            {candPosition}
                          </div>

                          {candResume && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '100%', overflow: 'hidden' }}>
                              <Badge variant="info" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <FileText size={10} style={{ marginRight: '3px', flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candResume}</span>
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </KanbanPattern>
  );
}
