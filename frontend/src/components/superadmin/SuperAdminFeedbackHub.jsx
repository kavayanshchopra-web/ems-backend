import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Star,
  Search,
  Filter,
  RefreshCw,
  Building2,
  User,
  Shield,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bug,
  Lightbulb,
  Palette,
  Zap,
  HelpCircle,
  Download,
  Trash2,
  ExternalLink,
  MessageCircle,
  Send,
  X,
  Sparkles,
  Sliders,
  ChevronDown
} from 'lucide-react';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';

export default function SuperAdminFeedbackHub({
  API_URL = '',
  authUser = null,
  superadminCompanies = [],
  showToast = () => {}
}) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRating, setSelectedRating] = useState('all');

  // Modal / Reply State
  const [activeFeedbackModal, setActiveFeedbackModal] = useState(null);
  const [replyStatus, setReplyStatus] = useState('in_progress');
  const [replyText, setReplyText] = useState('');
  const [isSavingReply, setIsSavingReply] = useState(false);

  // Load Feedbacks across all companies
  useEffect(() => {
    fetchAllFeedbacks();

    // Realtime Firestore subscription across all tenants
    const unsubscribe = FirebaseCloudEngine.subscribeToCollection('system_feedbacks', 'all', (records) => {
      if (Array.isArray(records)) {
        setFeedbacks(records);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const fetchAllFeedbacks = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from Firestore Cloud Engine
      const cloudRecords = await FirebaseCloudEngine.fetchRecords('system_feedbacks', 'all');
      if (Array.isArray(cloudRecords) && cloudRecords.length > 0) {
        setFeedbacks(cloudRecords);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('SuperAdmin Firestore fetch error:', e);
    }

    // 2. Fallback to Backend SQLite Endpoint
    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/superadmin/feedbacks`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.feedbacks)) {
          setFeedbacks(data.feedbacks);
        }
      }
    } catch (err) {
      console.warn('SuperAdmin Backend fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Reply Modal
  const handleOpenReviewModal = (item) => {
    setActiveFeedbackModal(item);
    setReplyStatus(item.status || 'in_progress');
    setReplyText(item.adminReply || '');
  };

  // Save Resolution & Reply
  const handleSaveResolution = async () => {
    if (!activeFeedbackModal) return;

    setIsSavingReply(true);
    const adminName = authUser?.name || 'Super Admin';
    const updatedRecord = {
      ...activeFeedbackModal,
      status: replyStatus,
      adminReply: replyText.trim(),
      adminRepliedBy: adminName,
      adminRepliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Update in Firestore
      const targetTenant = activeFeedbackModal.companyId || activeFeedbackModal.tenantId || 'all';
      await FirebaseCloudEngine.saveRecord('system_feedbacks', updatedRecord, targetTenant);

      // 2. Also PUT to Backend Database
      try {
        const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        await fetch(`${API_URL}/api/superadmin/feedback/${activeFeedbackModal.id}/status`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            status: replyStatus,
            adminReply: replyText.trim(),
            adminName
          })
        });
      } catch (beErr) {
        console.warn('Backend update feedback notice:', beErr);
      }

      // Update local state
      setFeedbacks(prev => prev.map(f => f.id === activeFeedbackModal.id ? updatedRecord : f));

      showToast(`Status updated to "${replyStatus}" and response recorded!`, 'success');
      setActiveFeedbackModal(null);
    } catch (err) {
      console.error('Error saving resolution:', err);
      showToast(`Failed to update resolution: ${err.message}`, 'error');
    } finally {
      setIsSavingReply(false);
    }
  };

  // Delete Feedback
  const handleDeleteFeedback = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this feedback submission?')) {
      return;
    }

    try {
      await FirebaseCloudEngine.deleteRecord('system_feedbacks', id, 'all');

      try {
        const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        await fetch(`${API_URL}/api/superadmin/feedback/${id}`, { method: 'DELETE', headers });
      } catch (beErr) {}

      setFeedbacks(prev => prev.filter(f => f.id !== id));
      showToast('Feedback record deleted successfully', 'info');
    } catch (err) {
      showToast(`Failed to delete: ${err.message}`, 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (feedbacks.length === 0) {
      showToast('No feedback data available to export', 'warning');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Feedback ID,Company Name,Company ID,Employee Name,Employee Email,Employee Role,Rating,Category,Priority,Module,Title,Message,Status,Admin Reply,Admin Replied By,Submitted Date\n';

    feedbacks.forEach(f => {
      const id = f.id || '';
      const company = (f.companyName || f.company_name || '').replace(/"/g, '""');
      const compId = f.companyId || f.company_id || '';
      const user = (f.userName || f.user_name || '').replace(/"/g, '""');
      const email = (f.userEmail || f.user_email || '').replace(/"/g, '""');
      const role = (f.userRole || f.user_role || '').replace(/"/g, '""');
      const ratingVal = f.rating || 5;
      const cat = f.category || '';
      const prio = f.priority || '';
      const mod = f.pageModule || f.page_module || '';
      const titleText = (f.title || '').replace(/"/g, '""');
      const msgText = (f.message || '').replace(/\n/g, ' ').replace(/"/g, '""');
      const st = f.status || 'new';
      const adminRep = (f.adminReply || f.admin_reply || '').replace(/\n/g, ' ').replace(/"/g, '""');
      const adminWho = (f.adminRepliedBy || f.admin_replied_by || '').replace(/"/g, '""');
      const date = f.createdAt || f.created_at || '';

      csvContent += `"${id}","${company}","${compId}","${user}","${email}","${role}",${ratingVal},"${cat}","${prio}","${mod}","${titleText}","${msgText}","${st}","${adminRep}","${adminWho}","${date}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `system_feedbacks_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Distinct Companies List for Filter
  const companyOptions = useMemo(() => {
    const list = new Map();
    if (Array.isArray(superadminCompanies)) {
      superadminCompanies.forEach(c => {
        if (c.id && c.company_name) {
          list.set(String(c.id), c.company_name);
        }
      });
    }
    feedbacks.forEach(f => {
      const cId = f.companyId || f.company_id;
      const cName = f.companyName || f.company_name;
      if (cId && cName && !list.has(String(cId))) {
        list.set(String(cId), cName);
      }
    });
    return Array.from(list.entries()).map(([id, name]) => ({ id, name }));
  }, [superadminCompanies, feedbacks]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = feedbacks.length;
    const bugs = feedbacks.filter(f => f.category === 'bug' && f.status !== 'resolved' && f.status !== 'closed').length;
    const features = feedbacks.filter(f => f.category === 'feature_request').length;
    const resolved = feedbacks.filter(f => f.status === 'resolved' || f.status === 'closed').length;
    const avg = total > 0
      ? (feedbacks.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0) / total).toFixed(1)
      : '5.0';
    return { total, bugs, features, resolved, avg };
  }, [feedbacks]);

  // Filtered List
  const filteredList = useMemo(() => {
    return feedbacks.filter(f => {
      // Company Filter
      const compId = String(f.companyId || f.company_id || '');
      const compName = String(f.companyName || f.company_name || '');
      if (selectedCompany !== 'all' && compId !== selectedCompany && compName !== selectedCompany) {
        return false;
      }

      // Category Filter
      if (selectedCategory !== 'all' && f.category !== selectedCategory) {
        return false;
      }

      // Status Filter
      if (selectedStatus !== 'all' && f.status !== selectedStatus) {
        return false;
      }

      // Rating Filter
      if (selectedRating !== 'all' && String(f.rating) !== selectedRating) {
        return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          (f.title || '').toLowerCase().includes(q) ||
          (f.message || '').toLowerCase().includes(q) ||
          (compName).toLowerCase().includes(q) ||
          (f.userName || f.user_name || '').toLowerCase().includes(q) ||
          (f.userEmail || f.user_email || '').toLowerCase().includes(q) ||
          (f.pageModule || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [feedbacks, selectedCompany, selectedCategory, selectedStatus, selectedRating, searchQuery]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <span style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>✨ New</span>;
      case 'under_review':
        return <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>🔍 Under Review</span>;
      case 'in_progress':
        return <span style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>⚙️ In Progress</span>;
      case 'planned':
        return <span style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#9333ea', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>📌 Planned</span>;
      case 'resolved':
        return <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>✅ Resolved</span>;
      case 'closed':
        return <span style={{ background: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>🔒 Closed</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>{status || 'New'}</span>;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'bug':
        return <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700' }}><Bug size={14} /> Bug</span>;
      case 'feature_request':
        return <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700' }}><Lightbulb size={14} /> Feature</span>;
      case 'ui_ux':
        return <span style={{ color: '#ec4899', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700' }}><Palette size={14} /> UI/UX</span>;
      case 'performance':
        return <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700' }}><Zap size={14} /> Speed</span>;
      default:
        return <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700' }}><HelpCircle size={14} /> General</span>;
    }
  };

  return (
    <div className="superadmin-feedback-hub">
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} style={{ color: '#0d9488' }} /> Multi-Company Feedback & Suggestions Hub
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            Centrally review, manage, and respond to feedback submitted by all organizations and employees across the platform.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} /> Export CSV Report
          </button>

          <button
            onClick={fetchAllFeedbacks}
            style={{
              background: '#0d9488',
              color: '#ffffff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin-animation' : ''} /> Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Total Feedbacks</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>{metrics.total}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Across all companies</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Avg Platform Rating</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {metrics.avg} <span style={{ color: '#f59e0b', fontSize: '16px' }}>★</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Satisfaction index</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Open Bug Reports</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#ef4444' }}>{metrics.bugs}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Requires engineering review</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Feature Suggestions</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#3b82f6' }}>{metrics.features}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Ideas & enhancements</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Resolved & Closed</div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#10b981' }}>{metrics.resolved}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Completed issues</div>
        </div>
      </div>

      {/* Multi-Tenant Filter Toolbar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexGrow: 1 }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search company, user, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          {/* Filter by Company */}
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              maxWidth: '200px'
            }}
          >
            <option value="all">🏢 All Companies ({companyOptions.length})</option>
            {companyOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Filter by Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none'
            }}
          >
            <option value="all">🏷️ All Categories</option>
            <option value="bug">🐛 Bug / Issue</option>
            <option value="feature_request">💡 Feature Request</option>
            <option value="ui_ux">🎨 UI / UX</option>
            <option value="performance">⚡ Speed & Performance</option>
            <option value="general">💬 General</option>
          </select>

          {/* Filter by Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none'
            }}
          >
            <option value="all">📊 All Statuses</option>
            <option value="new">✨ New</option>
            <option value="under_review">🔍 Under Review</option>
            <option value="in_progress">⚙️ In Progress</option>
            <option value="planned">📌 Planned</option>
            <option value="resolved">✅ Resolved</option>
            <option value="closed">🔒 Closed</option>
          </select>

          {/* Filter by Rating */}
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none'
            }}
          >
            <option value="all">⭐ All Ratings</option>
            <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
            <option value="4">⭐⭐⭐⭐ 4 Stars</option>
            <option value="3">⭐⭐⭐ 3 Stars</option>
            <option value="2">⭐⭐ 2 Stars</option>
            <option value="1">⭐ 1 Star</option>
          </select>

        </div>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
          Showing <strong>{filteredList.length}</strong> of <strong>{feedbacks.length}</strong>
        </span>
      </div>

      {/* Feedbacks Data Table */}
      {filteredList.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '48px 24px',
          textAlign: 'center'
        }}>
          <MessageSquare size={40} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
          <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>No Feedback Matches Filters</h4>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            Try resetting your search query or selecting "All Companies".
          </p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Company & User</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Rating</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Category & Module</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Feedback Details</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item) => {
                  const companyName = item.companyName || item.company_name || 'Organization';
                  const userName = item.userName || item.user_name || 'User';
                  const userEmail = item.userEmail || item.user_email || '';
                  const userRole = item.userRole || item.user_role || 'employee';

                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease', cursor: 'pointer' }}
                      onClick={() => handleOpenReviewModal(item)}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                      {/* Company & Employee */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', minWidth: '190px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#0f2b26', fontSize: '13px', marginBottom: '2px' }}>
                          <Building2 size={13} style={{ color: '#0d9488', flexShrink: 0 }} />
                          <span>{companyName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
                          <User size={12} style={{ color: '#64748b' }} />
                          <span>{userName}</span>
                          <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', textTransform: 'capitalize' }}>{userRole}</span>
                        </div>
                        {userEmail && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{userEmail}</div>}
                      </td>

                      {/* Rating */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', minWidth: '90px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              fill={s <= (Number(item.rating) || 5) ? '#f59e0b' : 'none'}
                              color={s <= (Number(item.rating) || 5) ? '#f59e0b' : '#cbd5e1'}
                            />
                          ))}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                          {item.rating || 5}/5
                        </div>
                      </td>

                      {/* Category & Module */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', minWidth: '140px' }}>
                        <div>{getCategoryIcon(item.category)}</div>
                        {item.pageModule && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                            {item.pageModule}
                          </div>
                        )}
                        {item.priority && item.priority === 'urgent' && (
                          <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '800', marginTop: '2px' }}>
                            🚨 URGENT
                          </div>
                        )}
                      </td>

                      {/* Feedback Title & Message */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', maxWidth: '340px' }}>
                        <div style={{ fontWeight: '700', color: '#0f2b26', fontSize: '13px', marginBottom: '4px' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                          {item.message}
                        </div>
                        {item.adminReply && (
                          <div style={{ fontSize: '11px', color: '#0d9488', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Shield size={11} /> Admin Replied: "{item.adminReply.slice(0, 40)}..."
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', minWidth: '120px' }}>
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', fontSize: '11px', color: '#94a3b8', minWidth: '100px' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right', minWidth: '120px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenReviewModal(item); }}
                            style={{
                              background: 'rgba(13, 148, 136, 0.1)',
                              color: '#0d9488',
                              border: '1px solid rgba(13, 148, 136, 0.25)',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <MessageCircle size={12} /> Reply
                          </button>

                          <button
                            onClick={(e) => handleDeleteFeedback(item.id, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px'
                            }}
                            title="Delete Feedback"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPER ADMIN REVIEW & REPLY MODAL */}
      {activeFeedbackModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #e2e8f0',
            padding: '24px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2b26', margin: '0 0 2px 0' }}>
                  Review & Respond to Feedback
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  ID: {activeFeedbackModal.id}
                </span>
              </div>
              <button
                onClick={() => setActiveFeedbackModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Submitter & Company Context Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Company / Tenant</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f2b26', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Building2 size={14} style={{ color: '#0d9488' }} />
                  <span>{activeFeedbackModal.companyName || activeFeedbackModal.company_name || 'Unknown'}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {activeFeedbackModal.companyId || activeFeedbackModal.company_id}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Submitted By Employee</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f2b26', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <User size={14} style={{ color: '#ec4899' }} />
                  <span>{activeFeedbackModal.userName || activeFeedbackModal.user_name || 'User'}</span>
                  <span style={{ fontSize: '10px', background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>
                    {activeFeedbackModal.userRole || activeFeedbackModal.user_role || 'employee'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{activeFeedbackModal.userEmail || activeFeedbackModal.user_email}</div>
              </div>
            </div>

            {/* Submission Info Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Rating:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      fill={s <= (Number(activeFeedbackModal.rating) || 5) ? '#f59e0b' : 'none'}
                      color={s <= (Number(activeFeedbackModal.rating) || 5) ? '#f59e0b' : '#cbd5e1'}
                    />
                  ))}
                </div>
              </div>

              <span style={{ color: '#cbd5e1' }}>•</span>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                Category: <strong>{activeFeedbackModal.category?.replace('_', ' ')}</strong>
              </div>

              {activeFeedbackModal.pageModule && (
                <>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Module: <strong>{activeFeedbackModal.pageModule}</strong>
                  </div>
                </>
              )}
            </div>

            {/* Title & Description Box */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f2b26', margin: '0 0 8px 0' }}>
                {activeFeedbackModal.title}
              </h4>
              <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                {activeFeedbackModal.message}
              </p>

              {activeFeedbackModal.attachmentUrl && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <a
                    href={activeFeedbackModal.attachmentUrl}
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
                    View Attachment / Screenshot <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Resolution Form Section */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} style={{ color: '#0d9488' }} /> Super Admin Resolution Action
              </h4>

              {/* Status Selector */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  Update Feedback Status
                </label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    background: '#ffffff',
                    fontWeight: '700',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                >
                  <option value="new">✨ New Received</option>
                  <option value="under_review">🔍 Under Review</option>
                  <option value="in_progress">⚙️ In Progress (Engineering Working)</option>
                  <option value="planned">📌 Planned for Next Release</option>
                  <option value="resolved">✅ Resolved & Live in Platform</option>
                  <option value="closed">🔒 Closed / Answered</option>
                </select>
              </div>

              {/* Resolution Reply Text */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  Super Admin Resolution Reply / Public Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Type a response to the employee (e.g. 'Thank you! We have patched this bug in build v2.5.4' or 'Scheduled for Q4 release roadmap')..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    outline: 'none',
                    fontFamily: 'inherit',
                    background: '#ffffff'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  ℹ️ This response will be displayed in the employee's "My Submitted Feedbacks" panel.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setActiveFeedbackModal(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSavingReply}
                onClick={handleSaveResolution}
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: isSavingReply ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)',
                  opacity: isSavingReply ? 0.7 : 1
                }}
              >
                {isSavingReply ? (
                  <>
                    <RefreshCw size={14} className="spin-animation" /> Saving...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Save & Update Status
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
