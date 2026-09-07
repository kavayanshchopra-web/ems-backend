import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Star,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bug,
  Lightbulb,
  Palette,
  Zap,
  HelpCircle,
  UploadCloud,
  Image,
  Filter,
  RefreshCw,
  Building2,
  User,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';

export default function FeedbackPage({
  API_URL = '',
  authUser = null,
  showToast = () => {}
}) {
  const companyId = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 'org_default';
  const companyName = authUser?.companyName || authUser?.company_name || 'My Organization';
  const userName = authUser?.name || authUser?.userName || authUser?.email?.split('@')[0] || 'Team Member';
  const userEmail = authUser?.email || '';
  const userRole = authUser?.role || 'employee';
  const userId = authUser?.id || authUser?.uid || 'usr_current';

  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('feature_request');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [pageModule, setPageModule] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [attachmentBase64, setAttachmentBase64] = useState('');
  const [attachmentFileName, setAttachmentFileName] = useState('');

  // History Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Categories config
  const CATEGORIES = [
    { id: 'bug', label: 'Bug / Issue', icon: Bug, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    { id: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { id: 'ui_ux', label: 'UI / UX Design', icon: Palette, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
    { id: 'performance', label: 'Speed & Performance', icon: Zap, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { id: 'general', label: 'General Feedback', icon: HelpCircle, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
  ];

  const MODULES = [
    { id: 'general', label: 'General Platform' },
    { id: 'telecalling', label: 'Telecalling & Cloud PBX' },
    { id: 'contacts', label: 'Contacts & Leads' },
    { id: 'conversations', label: 'WhatsApp Conversations' },
    { id: 'crm_deals', label: 'Kanban CRM & Deals' },
    { id: 'payroll', label: 'Payroll & Compensation' },
    { id: 'attendance', label: 'Attendance & GPS Tracking' },
    { id: 'recruitment_ats', label: 'Recruitment & ATS' },
    { id: 'tasks', label: 'Tasks Board' },
    { id: 'assets', label: 'Asset Management' },
    { id: 'integrations', label: 'Integrations & Webhooks' },
    { id: 'settings', label: 'Workspace Settings' }
  ];

  const RATING_LABELS = {
    1: { text: 'Needs Significant Work 😞', color: '#ef4444' },
    2: { text: 'Fair, Has Issues 😐', color: '#f97316' },
    3: { text: 'Good, Room to Grow 😊', color: '#eab308' },
    4: { text: 'Very Good & Smooth 😃', color: '#10b981' },
    5: { text: 'Outstanding Experience! 🚀', color: '#0d9488' }
  };

  // Fetch Feedback History
  useEffect(() => {
    fetchMyFeedbacks();

    // Subscribe to Firestore collection for live feedback status changes & admin replies
    const unsubscribe = FirebaseCloudEngine.subscribeToCollection('system_feedbacks', companyId, (records) => {
      if (Array.isArray(records)) {
        // Filter records for this tenant or this user
        const matching = records.filter(r => 
          r.companyId === companyId || 
          r.tenantId === companyId || 
          r.userId === userId ||
          r.company_id === companyId
        );
        if (matching.length > 0) {
          setFeedbacks(matching);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [companyId, userId]);

  const fetchMyFeedbacks = async () => {
    setIsLoading(true);
    try {
      // 1. First try Firestore Cloud Engine
      const cloudList = await FirebaseCloudEngine.fetchRecords('system_feedbacks', companyId);
      if (Array.isArray(cloudList) && cloudList.length > 0) {
        setFeedbacks(cloudList);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Firebase feedback fetch error:', e);
    }

    // 2. Fallback to Backend SQLite Endpoint
    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/feedback/my?companyId=${encodeURIComponent(companyId)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.feedbacks)) {
          setFeedbacks(data.feedbacks);
        }
      }
    } catch (err) {
      console.warn('Backend feedback fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Attachment Upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be under 5MB', 'warning');
      return;
    }

    setAttachmentFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentBase64(reader.result);
      showToast(`Attachment attached: ${file.name}`, 'info');
    };
    reader.readAsDataURL(file);
  };

  // Submit Feedback Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Please provide a feedback title and detailed description', 'warning');
      return;
    }

    setIsSubmitting(true);
    const feedbackDocId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newFeedback = {
      id: feedbackDocId,
      tenantId: companyId,
      companyId: companyId,
      companyName: companyName,
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      userRole: userRole,
      rating: rating,
      category: category,
      title: title.trim(),
      message: message.trim(),
      pageModule: pageModule,
      priority: priority,
      attachmentUrl: attachmentBase64 || '',
      attachmentFileName: attachmentFileName || '',
      status: 'new', // new, under_review, in_progress, planned, resolved, closed
      adminReply: '',
      adminRepliedBy: '',
      adminRepliedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Save to Cloud Firestore
      await FirebaseCloudEngine.saveRecord('system_feedbacks', newFeedback, companyId);

      // 2. Also POST to Backend Database Endpoint
      try {
        const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        await fetch(`${API_URL}/api/feedback/submit`, {
          method: 'POST',
          headers,
          body: JSON.stringify(newFeedback)
        });
      } catch (beErr) {
        console.warn('Backend feedback push sync warning:', beErr);
      }

      // Optimistically update local state
      setFeedbacks(prev => [newFeedback, ...prev]);

      showToast('🎉 Thank you! Your feedback has been sent directly to Super Admin.', 'success');

      // Reset form
      setTitle('');
      setMessage('');
      setAttachmentBase64('');
      setAttachmentFileName('');
      setRating(5);
      setActiveTab('history');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      showToast(`Failed to submit feedback: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = feedbacks.length;
    const resolved = feedbacks.filter(f => f.status === 'resolved' || f.status === 'closed').length;
    const inProgress = feedbacks.filter(f => f.status === 'in_progress' || f.status === 'under_review' || f.status === 'planned').length;
    const avg = total > 0
      ? (feedbacks.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0) / total).toFixed(1)
      : '5.0';
    return { total, resolved, inProgress, avg };
  }, [feedbacks]);

  // Filtered feedbacks list
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      const matchSearch = !searchFilter.trim() || 
        (f.title || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (f.message || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (f.pageModule || '').toLowerCase().includes(searchFilter.toLowerCase());

      const matchStatus = statusFilter === 'all' || f.status === statusFilter;
      const matchCategory = categoryFilter === 'all' || f.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [feedbacks, searchFilter, statusFilter, categoryFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <span style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>✨ New Received</span>;
      case 'under_review':
        return <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🔍 Under Review</span>;
      case 'in_progress':
        return <span style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>⚙️ In Progress</span>;
      case 'planned':
        return <span style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#9333ea', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>📌 Planned on Roadmap</span>;
      case 'resolved':
        return <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>✅ Resolved & Live</span>;
      case 'closed':
        return <span style={{ background: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🔒 Closed</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>{status || 'Submitted'}</span>;
    }
  };

  return (
    <div className="feedback-page-wrapper" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)',
        border: '1px solid rgba(13, 148, 136, 0.2)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0d9488, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 16px rgba(13, 148, 136, 0.25)'
          }}>
            <MessageSquare size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f2b26', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
              Feedback & Suggestions Hub
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Share suggestions, report issues, and rate features. All submissions flow directly to the Super Admin control team.
            </p>
          </div>
        </div>

        {/* User Context Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#ffffff',
          padding: '8px 16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>
            <Building2 size={14} style={{ color: '#0d9488' }} />
            <span>{companyName}</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>
            <User size={14} style={{ color: '#ec4899' }} />
            <span>{userName} ({userRole})</span>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>My Feedbacks</span>
            <span style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '6px', borderRadius: '8px' }}><MessageSquare size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>{metrics.total}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Submitted across all sessions</div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Avg Rating Given</span>
            <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '6px', borderRadius: '8px' }}><Star size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {metrics.avg} <span style={{ fontSize: '14px', color: '#f59e0b' }}>★</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Platform satisfaction metric</div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>In Progress / Review</span>
            <span style={{ color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '6px', borderRadius: '8px' }}><Clock size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>{metrics.inProgress}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Active engineering tasks</div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Resolved & Implemented</span>
            <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '6px', borderRadius: '8px' }}><CheckCircle2 size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>{metrics.resolved}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Live improvements released</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('submit')}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '700',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'submit' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'submit' ? '3px solid #0d9488' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Sparkles size={16} /> Submit New Feedback
        </button>

        <button
          onClick={() => { setActiveTab('history'); fetchMyFeedbacks(); }}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '700',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'history' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'history' ? '3px solid #0d9488' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Clock size={16} /> My Submitted Feedbacks ({feedbacks.length})
        </button>
      </div>

      {/* TAB 1: SUBMIT FEEDBACK FORM */}
      {activeTab === 'submit' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <form onSubmit={handleSubmit}>

            {/* 1. Rating Selector */}
            <div style={{ marginBottom: '28px', textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#0f2b26', marginBottom: '12px' }}>
                How would you rate your overall platform experience?
              </label>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      transition: 'transform 0.15s ease',
                      transform: (hoverRating || rating) >= star ? 'scale(1.2)' : 'scale(1)'
                    }}
                  >
                    <Star
                      size={36}
                      fill={(hoverRating || rating) >= star ? '#f59e0b' : 'none'}
                      color={(hoverRating || rating) >= star ? '#f59e0b' : '#cbd5e1'}
                    />
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '13px', fontWeight: '700', color: RATING_LABELS[hoverRating || rating]?.color }}>
                {RATING_LABELS[hoverRating || rating]?.text}
              </div>
            </div>

            {/* 2. Category Selection Pills */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>
                Feedback Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: isSelected ? `2px solid ${cat.color}` : '1px solid #e2e8f0',
                        background: isSelected ? cat.bg : '#ffffff',
                        color: isSelected ? cat.color : '#475569',
                        fontWeight: isSelected ? '800' : '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Icon size={16} color={isSelected ? cat.color : '#64748b'} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Module & Priority Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                  Target Module / Screen
                </label>
                <select
                  value={pageModule}
                  onChange={(e) => setPageModule(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    background: '#ffffff',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                >
                  {MODULES.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    background: '#ffffff',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                >
                  <option value="low">Low (Minor Suggestion / Idea)</option>
                  <option value="medium">Medium (Standard Improvement)</option>
                  <option value="high">High (Affects Daily Workflow)</option>
                  <option value="urgent">Urgent (Critical System Blocker)</option>
                </select>
              </div>
            </div>

            {/* 4. Title Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                Summary / Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Add dark mode preference, Call recording audio waveform issue, Export payroll to Excel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* 5. Detailed Description */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                Detailed Description / Steps to Reproduce <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Explain the suggestion or issue in detail. If reporting a bug, mention the exact steps, what happened, and what you expected..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* 6. Screenshot / Attachment Upload */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                Optional Screenshot or Attachment
              </label>
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
                position: 'relative'
              }}>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <UploadCloud size={30} style={{ color: '#0d9488' }} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>
                    {attachmentFileName ? `Selected: ${attachmentFileName}` : 'Click or Drag & Drop screenshot or error log'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Supports PNG, JPG, WEBP, PDF up to 5MB</span>
                </div>
              </div>

              {attachmentBase64 && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', padding: '8px 14px', borderRadius: '8px' }}>
                  <Image size={16} style={{ color: '#0d9488' }} />
                  <span style={{ fontSize: '12px', color: '#334155', fontWeight: '600' }}>{attachmentFileName}</span>
                  <button
                    type="button"
                    onClick={() => { setAttachmentBase64(''); setAttachmentFileName(''); }}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Submit Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                🛡️ Your submission includes company name (<strong>{companyName}</strong>) and identity (<strong>{userName}</strong>).
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                  transition: 'opacity 0.2s ease',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="spin-animation" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Submit to Super Admin
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* TAB 2: MY SUBMITTED FEEDBACKS */}
      {activeTab === 'history' && (
        <div>
          {/* Filters Bar */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flexGrow: 1 }}>
              <input
                type="text"
                placeholder="Search my feedbacks..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  width: '240px',
                  outline: 'none'
                }}
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="new">✨ New</option>
                <option value="under_review">🔍 Under Review</option>
                <option value="in_progress">⚙️ In Progress</option>
                <option value="planned">📌 Planned</option>
                <option value="resolved">✅ Resolved</option>
                <option value="closed">🔒 Closed</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                <option value="all">All Categories</option>
                <option value="bug">🐛 Bug</option>
                <option value="feature_request">💡 Feature</option>
                <option value="ui_ux">🎨 UI/UX</option>
                <option value="performance">⚡ Performance</option>
                <option value="general">💬 General</option>
              </select>
            </div>

            <button
              onClick={fetchMyFeedbacks}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'spin-animation' : ''} /> Refresh
            </button>
          </div>

          {/* Feedback Cards List */}
          {filteredFeedbacks.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '48px 24px',
              textAlign: 'center'
            }}>
              <MessageSquare size={48} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>No Feedbacks Found</h4>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                {searchFilter || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'No feedbacks match your search or filter criteria.'
                  : 'You have not submitted any feedback yet. Share your thoughts to help us improve!'}
              </p>
              <button
                onClick={() => setActiveTab('submit')}
                style={{
                  background: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Submit First Feedback
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredFeedbacks.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '20px 24px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Card Header Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {getStatusBadge(item.status)}
                      
                      <span style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'capitalize'
                      }}>
                        {item.category?.replace('_', ' ')}
                      </span>

                      {item.pageModule && (
                        <span style={{
                          background: 'rgba(13, 148, 136, 0.08)',
                          color: '#0d9488',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          Module: {item.pageModule}
                        </span>
                      )}

                      {item.priority && item.priority !== 'medium' && (
                        <span style={{
                          background: item.priority === 'urgent' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: item.priority === 'urgent' ? '#dc2626' : '#d97706',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '800'
                        }}>
                          {item.priority.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Rating Stars */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            fill={s <= (Number(item.rating) || 5) ? '#f59e0b' : 'none'}
                            color={s <= (Number(item.rating) || 5) ? '#f59e0b' : '#cbd5e1'}
                          />
                        ))}
                      </div>
                      
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: '0 0 8px 0' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: '0 0 14px 0', whiteSpace: 'pre-wrap' }}>
                    {item.message}
                  </p>

                  {/* Attachment Preview if any */}
                  {item.attachmentUrl && (
                    <div style={{ marginBottom: '14px' }}>
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: '#0d9488',
                          fontWeight: '700',
                          textDecoration: 'none',
                          background: 'rgba(13, 148, 136, 0.08)',
                          padding: '6px 12px',
                          borderRadius: '6px'
                        }}
                      >
                        <Image size={14} /> View Attached Screenshot / File <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  {/* Super Admin Resolution Box */}
                  {item.adminReply && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.06) 0%, rgba(59, 130, 246, 0.06) 100%)',
                      border: '1px solid rgba(13, 148, 136, 0.25)',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      marginTop: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#0d9488' }}>
                          <ShieldCheck size={16} /> Super Admin Response ({item.adminRepliedBy || 'Platform Team'})
                        </div>
                        {item.adminRepliedAt && (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {new Date(item.adminRepliedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: '#0f2b26', margin: 0, fontWeight: '500', lineHeight: '1.5' }}>
                        {item.adminReply}
                      </p>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
