/**
 * DYNAMIC REPORTING & INTELLIGENCE HUB
 * 100% Schema-Driven, Multi-Module Analytics Cockpit
 * Powered by Core CRM Engine Principles & Emerald Brand Palette
 * Supports: Phone System, CRM Sales, Cross-Analytics, & Custom Report Builder
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  PhoneCall,
  Layers,
  Share2,
  Calendar,
  Search,
  Users,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  BarChart2,
  PieChart,
  Settings,
  Sliders,
  Save,
  Plus,
  Trash2,
  FolderOpen
} from 'lucide-react';
import PhoneSystemAnalyticsView from './PhoneSystemAnalyticsView';

// Currency formatting helper
const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

// Seconds to human readable duration
const formatSeconds = (totalSec) => {
  const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remainingSec = sec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${remainingSec}s`;
  return `${remainingSec}s`;
};

// Parse duration strings like "2m 45s" or raw numbers
const parseDurationSeconds = (dur) => {
  if (!dur) return 0;
  if (typeof dur === 'number') return dur;
  const str = String(dur).trim().toLowerCase();
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  let total = 0;
  const m = str.match(/(\d+)\s*m/);
  const s = str.match(/(\d+)\s*s/);
  const h = str.match(/(\d+)\s*h/);
  if (h) total += parseInt(h[1], 10) * 3600;
  if (m) total += parseInt(m[1], 10) * 60;
  if (s) total += parseInt(s[1], 10);
  return total;
};

export default function DynamicReportingHub({
  activeTab = 'reports_telephony',
  authUser,
  callLogs = [],
  contacts = [],
  employees = [],
  stages = [],
  systemDropdowns = {},
  onOpenModuleConfig,
  setActiveTab
}) {
  // Current active reporting module tab: 'telephony' | 'crm' | 'cross' | 'builder'
  const [activeModule, setActiveModule] = useState(() => {
    if (activeTab === 'reports_crm') return 'crm';
    if (activeTab === 'reports_cross') return 'cross';
    if (activeTab === 'reports_builder') return 'builder';
    return 'telephony';
  });

  // Sync activeModule when activeTab prop changes from sidebar navigation
  useEffect(() => {
    if (activeTab === 'reports_telephony' || activeTab === 'reports') {
      setActiveModule('telephony');
    } else if (activeTab === 'reports_crm') {
      setActiveModule('crm');
    } else if (activeTab === 'reports_cross') {
      setActiveModule('cross');
    } else if (activeTab === 'reports_builder') {
      setActiveModule('builder');
    }
  }, [activeTab]);

  // Two-way tab switcher handler
  const handleSwitchModule = (mod) => {
    setActiveModule(mod);
    if (setActiveTab) {
      if (mod === 'telephony') setActiveTab('reports_telephony');
      else if (mod === 'crm') setActiveTab('reports_crm');
      else if (mod === 'cross') setActiveTab('reports_cross');
      else if (mod === 'builder') setActiveTab('reports_builder');
    }
  };

  // Standard Engine Time Filters
  const [period, setPeriod] = useState('this_month'); // 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic Group By Field
  const [groupByField, setGroupByField] = useState('agentName');

  // Filters
  const [selectedAgent, setSelectedAgent] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Custom Report Builder States
  const [builderModule, setBuilderModule] = useState('crm');
  const [builderGroupBy, setBuilderGroupBy] = useState('stage');
  const [builderMetric, setBuilderMetric] = useState('count'); // 'count' | 'sum' | 'avg'
  const [reportTitle, setReportTitle] = useState('Custom Deal Pipeline Breakdown');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [savedReports, setSavedReports] = useState(() => {
    try {
      const stored = localStorage.getItem('ems_saved_custom_reports');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      { id: 'def_1', title: 'Telecaller Call Volumes & Talk Time', module: 'telephony', groupBy: 'agentName', metric: 'count', createdAt: 'Default' },
      { id: 'def_2', title: 'CRM Revenue by Lead Source', module: 'crm', groupBy: 'source', metric: 'sum', createdAt: 'Default' },
      { id: 'def_3', title: 'Deal Conversion Funnel by Stage', module: 'crm', groupBy: 'stage', metric: 'count', createdAt: 'Default' }
    ];
  });

  // Adjust default group by when module switches
  useEffect(() => {
    if (activeModule === 'telephony') {
      setGroupByField('agentName');
    } else if (activeModule === 'crm') {
      setGroupByField('stage');
    } else if (activeModule === 'cross') {
      setGroupByField('agentName');
    }
    setSelectedStatus('ALL');
  }, [activeModule]);

  // Normalize Call Logs records
  const normalizedCalls = useMemo(() => {
    return (Array.isArray(callLogs) ? callLogs : []).map(c => {
      const durationSec = parseDurationSeconds(c.duration || c.callDuration || c.billsec || 0);
      const isConnected = durationSec > 0 || c.status === 'Connected' || (c.type || '').toUpperCase() === 'INCOMING';
      const cleanPhone = String(c.phone || c.customerPhone || c.caller || '').replace(/\D/g, '');
      const rawDate = c.callTime || c.created_at || c.timestamp || c.date;
      const dateObj = rawDate ? new Date(rawDate) : new Date();

      return {
        id: c.id || `call_${Math.random()}`,
        name: c.name || c.customerName || 'Lead',
        phone: cleanPhone,
        agentName: c.agentName || c.agent_name || c.employeeName || (c.agentId ? `Agent #${c.agentId}` : 'Unassigned'),
        agentId: c.agentId || c.agent_id || '',
        type: (c.type || 'OUTGOING').toUpperCase(),
        channel: (c.channel || 'SIM').toUpperCase(),
        durationSec,
        isConnected,
        status: c.status || (isConnected ? 'Interested' : 'Missed Call'),
        dateObj,
        raw: c
      };
    });
  }, [callLogs]);

  // Normalize CRM Deals records
  const normalizedDeals = useMemo(() => {
    return (Array.isArray(contacts) ? contacts : []).map(d => {
      const cleanPhone = String(d.phone || d.customerPhone || '').replace(/\D/g, '');
      const stage = d.stage || d.status || d.pipeline_stage || 'New Lead';
      const value = Number(d.deal_value || d.amount || d.value || 0);
      const source = d.source || d.lead_source || d.leadSource || 'Direct';
      const agent = d.assigned_to || d.agentName || d.telecaller || d.owner || 'Unassigned';
      const rawDate = d.created_at || d.date || d.updated_at;
      const dateObj = rawDate ? new Date(rawDate) : new Date();

      const stageLower = stage.toLowerCase();
      const isWon = stageLower.includes('won') || stageLower.includes('closed') || stageLower.includes('deal closed');
      const isLost = stageLower.includes('lost') || stageLower.includes('not interested') || stageLower.includes('dropped');

      return {
        id: d.id || `deal_${Math.random()}`,
        name: d.name || d.title || 'Deal',
        phone: cleanPhone,
        stage,
        isWon,
        isLost,
        value,
        source,
        agent,
        dateObj,
        raw: d
      };
    });
  }, [contacts]);

  // Date Filtering Helper
  const filterByDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return true;
    const now = new Date();

    if (period === 'all') return true;

    if (period === 'today') {
      return (
        dateObj.getDate() === now.getDate() &&
        dateObj.getMonth() === now.getMonth() &&
        dateObj.getFullYear() === now.getFullYear()
      );
    }

    if (period === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      return (
        dateObj.getDate() === yest.getDate() &&
        dateObj.getMonth() === yest.getMonth() &&
        dateObj.getFullYear() === yest.getFullYear()
      );
    }

    if (period === 'this_week') {
      const startOfWeek = new Date(now);
      const day = now.getDay() || 7;
      startOfWeek.setDate(now.getDate() - day + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      return dateObj >= startOfWeek;
    }

    if (period === 'this_month') {
      return (
        dateObj.getMonth() === now.getMonth() &&
        dateObj.getFullYear() === now.getFullYear()
      );
    }

    if (period === 'custom') {
      if (customStartDate && dateObj < new Date(customStartDate)) return false;
      if (customEndDate && dateObj > new Date(customEndDate + 'T23:59:59')) return false;
      return true;
    }

    return true;
  };

  // Distinct Lists for Dropdowns
  const distinctAgents = useMemo(() => {
    const set = new Set();
    normalizedCalls.forEach(c => c.agentName && set.add(c.agentName));
    normalizedDeals.forEach(d => d.agent && set.add(d.agent));
    (Array.isArray(employees) ? employees : []).forEach(e => {
      const name = e.name || e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim();
      if (name) set.add(name);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [normalizedCalls, normalizedDeals, employees]);

  const distinctSources = useMemo(() => {
    const set = new Set();
    normalizedDeals.forEach(d => d.source && set.add(d.source));
    return Array.from(set).filter(Boolean).sort();
  }, [normalizedDeals]);

  const distinctDispositions = useMemo(() => {
    const set = new Set();
    normalizedCalls.forEach(c => c.status && set.add(c.status));
    return Array.from(set).filter(Boolean).sort();
  }, [normalizedCalls]);

  const distinctStages = useMemo(() => {
    const set = new Set();
    normalizedDeals.forEach(d => d.stage && set.add(d.stage));
    (Array.isArray(stages) ? stages : []).forEach(s => s.name && set.add(s.name));
    return Array.from(set).filter(Boolean).sort();
  }, [normalizedDeals, stages]);

  // Filtered Telephony Records
  const filteredCalls = useMemo(() => {
    return normalizedCalls.filter(c => {
      if (!filterByDate(c.dateObj)) return false;
      if (selectedAgent !== 'ALL' && c.agentName !== selectedAgent) return false;
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.agentName.toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [normalizedCalls, period, customStartDate, customEndDate, selectedAgent, selectedStatus, searchQuery]);

  // Filtered CRM Records
  const filteredDeals = useMemo(() => {
    return normalizedDeals.filter(d => {
      if (!filterByDate(d.dateObj)) return false;
      if (selectedAgent !== 'ALL' && d.agent !== selectedAgent) return false;
      if (selectedSource !== 'ALL' && d.source !== selectedSource) return false;
      if (selectedStatus !== 'ALL' && d.stage !== selectedStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          d.name.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          d.agent.toLowerCase().includes(q) ||
          d.stage.toLowerCase().includes(q) ||
          d.source.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [normalizedDeals, period, customStartDate, customEndDate, selectedAgent, selectedSource, selectedStatus, searchQuery]);

  // --- Dynamic Telephony KPIs ---
  const telephonyKpis = useMemo(() => {
    const total = filteredCalls.length;
    const connected = filteredCalls.filter(c => c.isConnected).length;
    const rate = total > 0 ? ((connected / total) * 100).toFixed(1) : '0';
    const totalDuration = filteredCalls.reduce((acc, c) => acc + c.durationSec, 0);
    const avgDuration = connected > 0 ? Math.round(totalDuration / connected) : 0;
    const interested = filteredCalls.filter(c => {
      const s = c.status.toLowerCase();
      return s.includes('interested') || s.includes('demo') || s.includes('closed');
    }).length;
    const positiveRate = total > 0 ? ((interested / total) * 100).toFixed(1) : '0';
    const inbound = filteredCalls.filter(c => c.type === 'INCOMING').length;
    const outbound = total - inbound;

    return { total, connected, rate, totalDuration, avgDuration, interested, positiveRate, inbound, outbound };
  }, [filteredCalls]);

  // --- Dynamic CRM KPIs ---
  const crmKpis = useMemo(() => {
    const total = filteredDeals.length;
    const pipelineValue = filteredDeals.reduce((acc, d) => acc + (d.value || 0), 0);
    const wonDeals = filteredDeals.filter(d => d.isWon);
    const wonCount = wonDeals.length;
    const wonValue = wonDeals.reduce((acc, d) => acc + (d.value || 0), 0);
    const winRate = total > 0 ? ((wonCount / total) * 100).toFixed(1) : '0';
    return { total, pipelineValue, wonCount, wonValue, winRate };
  }, [filteredDeals]);

  // --- Dynamic Cross-Analytics KPIs ---
  const crossKpis = useMemo(() => {
    const dealPhoneMap = new Map();
    filteredDeals.forEach(d => {
      if (d.phone) dealPhoneMap.set(d.phone, d);
    });

    let callsToLeads = 0;
    let contactedLeadSet = new Set();
    let wonFromCalls = 0;
    let wonRevenue = 0;

    filteredCalls.forEach(c => {
      if (c.phone && dealPhoneMap.has(c.phone)) {
        callsToLeads++;
        contactedLeadSet.add(c.phone);
        const deal = dealPhoneMap.get(c.phone);
        if (deal.isWon) {
          wonFromCalls++;
          wonRevenue += deal.value || 0;
        }
      }
    });

    const contactedCount = contactedLeadSet.size;
    const totalLeads = filteredDeals.length;
    const contactCoverage = totalLeads > 0 ? ((contactedCount / totalLeads) * 100).toFixed(1) : '0';
    const conversionRate = contactedCount > 0 ? ((wonFromCalls / contactedCount) * 100).toFixed(1) : '0';

    return {
      callsToLeads,
      contactedCount,
      totalLeads,
      contactCoverage,
      wonFromCalls,
      wonRevenue,
      conversionRate
    };
  }, [filteredCalls, filteredDeals]);

  // --- Dynamic Group By Aggregation Matrix ---
  const groupedData = useMemo(() => {
    const map = new Map();

    if (activeModule === 'telephony') {
      filteredCalls.forEach(c => {
        let key = c[groupByField] || 'Unspecified';
        if (!map.has(key)) {
          map.set(key, { key, count: 0, connected: 0, duration: 0, positive: 0, items: [] });
        }
        const row = map.get(key);
        row.count++;
        if (c.isConnected) row.connected++;
        row.duration += c.durationSec;
        const s = (c.status || '').toLowerCase();
        if (s.includes('interested') || s.includes('demo') || s.includes('closed')) {
          row.positive++;
        }
        row.items.push(c);
      });

      return Array.from(map.values())
        .map(r => ({
          ...r,
          rate: r.count > 0 ? ((r.connected / r.count) * 100).toFixed(1) : '0',
          conversion: r.count > 0 ? ((r.positive / r.count) * 100).toFixed(1) : '0',
          avgDuration: r.connected > 0 ? Math.round(r.duration / r.connected) : 0
        }))
        .sort((a, b) => b.count - a.count);
    }

    if (activeModule === 'crm') {
      filteredDeals.forEach(d => {
        let key = d[groupByField] || 'Unspecified';
        if (!map.has(key)) {
          map.set(key, { key, count: 0, totalValue: 0, wonCount: 0, wonValue: 0, items: [] });
        }
        const row = map.get(key);
        row.count++;
        row.totalValue += d.value || 0;
        if (d.isWon) {
          row.wonCount++;
          row.wonValue += d.value || 0;
        }
        row.items.push(d);
      });

      return Array.from(map.values())
        .map(r => ({
          ...r,
          winRate: r.count > 0 ? ((r.wonCount / r.count) * 100).toFixed(1) : '0',
          avgDealSize: r.count > 0 ? Math.round(r.totalValue / r.count) : 0
        }))
        .sort((a, b) => b.totalValue - a.totalValue);
    }

    if (activeModule === 'cross') {
      const dealPhoneMap = new Map();
      filteredDeals.forEach(d => { if (d.phone) dealPhoneMap.set(d.phone, d); });

      if (groupByField === 'source') {
        filteredDeals.forEach(d => {
          const key = d.source || 'Direct';
          if (!map.has(key)) {
            map.set(key, { key, leadsCount: 0, callsCount: 0, wonCount: 0, wonRevenue: 0 });
          }
          const row = map.get(key);
          row.leadsCount++;
          if (d.isWon) {
            row.wonCount++;
            row.wonRevenue += d.value || 0;
          }
        });
        filteredCalls.forEach(c => {
          if (c.phone && dealPhoneMap.has(c.phone)) {
            const d = dealPhoneMap.get(c.phone);
            const key = d.source || 'Direct';
            if (map.has(key)) {
              map.get(key).callsCount++;
            }
          }
        });
      } else {
        filteredCalls.forEach(c => {
          const key = c.agentName || 'Unassigned';
          if (!map.has(key)) {
            map.set(key, { key, callsCount: 0, matchedLeads: 0, wonCount: 0, wonRevenue: 0 });
          }
          const row = map.get(key);
          row.callsCount++;
          if (c.phone && dealPhoneMap.has(c.phone)) {
            row.matchedLeads++;
            const deal = dealPhoneMap.get(c.phone);
            if (deal.isWon) {
              row.wonCount++;
              row.wonRevenue += deal.value || 0;
            }
          }
        });
      }

      return Array.from(map.values()).sort((a, b) => (b.wonRevenue || b.callsCount || 0) - (a.wonRevenue || a.callsCount || 0));
    }

    return [];
  }, [activeModule, filteredCalls, filteredDeals, groupByField]);

  // --- Dynamic Custom Report Builder Aggregation ---
  const customBuilderData = useMemo(() => {
    let sourceRecords = [];
    if (builderModule === 'telephony') {
      sourceRecords = filteredCalls.map(c => ({
        ...c,
        metricVal: builderMetric === 'duration' ? c.durationSec : 1,
        dimKey: c[builderGroupBy] || 'Unassigned'
      }));
    } else {
      sourceRecords = filteredDeals.map(d => ({
        ...d,
        metricVal: d.value || 0,
        dimKey: d[builderGroupBy] || 'Unassigned'
      }));
    }

    const map = new Map();
    sourceRecords.forEach(item => {
      const k = String(item.dimKey || 'Unspecified');
      if (!map.has(k)) {
        map.set(k, { key: k, count: 0, sumVal: 0 });
      }
      const row = map.get(k);
      row.count++;
      row.sumVal += Number(item.metricVal || 0);
    });

    return Array.from(map.values())
      .map(r => ({
        ...r,
        avgVal: r.count > 0 ? Math.round(r.sumVal / r.count) : 0
      }))
      .sort((a, b) => (builderMetric === 'count' ? b.count - a.count : b.sumVal - a.sumVal));
  }, [builderModule, builderGroupBy, builderMetric, filteredCalls, filteredDeals]);

  // Custom Report Builder Action Handlers
  const handleSaveCustomReport = () => {
    const newReport = {
      id: `rep_${Date.now()}`,
      title: reportTitle.trim() || 'Untitled Report',
      module: builderModule,
      groupBy: builderGroupBy,
      metric: builderMetric,
      createdAt: new Date().toLocaleDateString()
    };
    const updated = [newReport, ...savedReports.filter(r => r.title !== newReport.title)];
    setSavedReports(updated);
    try {
      localStorage.setItem('ems_saved_custom_reports', JSON.stringify(updated));
    } catch (e) {}
    setSaveSuccessMsg(`Report "${newReport.title}" saved!`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleLoadCustomReport = (rep) => {
    setReportTitle(rep.title);
    setBuilderModule(rep.module);
    setBuilderGroupBy(rep.groupBy);
    setBuilderMetric(rep.metric || 'count');
  };

  const handleDeleteCustomReport = (id, e) => {
    e.stopPropagation();
    const updated = savedReports.filter(r => r.id !== id);
    setSavedReports(updated);
    try {
      localStorage.setItem('ems_saved_custom_reports', JSON.stringify(updated));
    } catch (e) {}
  };

  // CSV Export Function
  const exportToCsv = () => {
    let headers = [];
    let rows = [];

    if (activeModule === 'builder') {
      headers = [builderGroupBy, 'Record Count', 'Sum Metric', 'Average Metric'];
      rows = customBuilderData.map(r => [
        `"${r.key}"`,
        r.count,
        r.sumVal,
        r.avgVal
      ]);
    } else if (activeModule === 'telephony') {
      headers = [groupByField, 'Total Calls', 'Connected Calls', 'Connected Rate %', 'Total Duration', 'Avg Duration', 'Positive Dispositions'];
      rows = groupedData.map(r => [
        `"${r.key}"`,
        r.count,
        r.connected,
        `${r.rate}%`,
        `"${formatSeconds(r.duration)}"`,
        `"${formatSeconds(r.avgDuration)}"`,
        r.positive
      ]);
    } else if (activeModule === 'crm') {
      headers = [groupByField, 'Total Deals', 'Pipeline Value', 'Won Deals', 'Won Revenue', 'Win Rate %', 'Avg Deal Size'];
      rows = groupedData.map(r => [
        `"${r.key}"`,
        r.count,
        r.totalValue,
        r.wonCount,
        r.wonValue,
        `${r.winRate}%`,
        r.avgDealSize
      ]);
    } else {
      headers = ['Group', 'Calls', 'Leads', 'Won Count', 'Won Revenue'];
      rows = groupedData.map(r => [
        `"${r.key}"`,
        r.callsCount || 0,
        r.leadsCount || r.matchedLeads || 0,
        r.wonCount || 0,
        r.wonRevenue || 0
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeModule}_report_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group by field options depending on active module
  const groupByOptions = useMemo(() => {
    if (activeModule === 'telephony') {
      return [
        { id: 'agentName', label: '👤 Telecaller Agent' },
        { id: 'status', label: '🎯 Call Disposition' },
        { id: 'type', label: '📞 Call Type (In/Out)' },
        { id: 'channel', label: '📱 Channel (SIM/WA)' }
      ];
    }
    if (activeModule === 'crm') {
      return [
        { id: 'stage', label: '📊 Pipeline Stage' },
        { id: 'source', label: '🌐 Lead Source' },
        { id: 'agent', label: '👤 Assigned Telecaller' }
      ];
    }
    return [
      { id: 'agentName', label: '👤 Telecaller Agent' },
      { id: 'source', label: '🌐 Lead Source' }
    ];
  }, [activeModule]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflowY: 'auto' }}>
      {/* 🟢 TOP BRANDED HEADER (Emerald / Teal Palette) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #0d9488 100%)',
          padding: '10px 24px',
          color: '#ffffff',
          boxShadow: '0 2px 8px rgba(6, 78, 59, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ background: 'rgba(255,255,255,0.18)', padding: '5px', borderRadius: '7px' }}>
            <BarChart2 size={18} color="#a7f3d0" />
          </div>
          <span style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '-0.3px', color: '#ffffff' }}>
            Reports & Analytics
          </span>
        </div>

        {/* 4 Dedicated Module Switcher Tabs (In sync with sidebar) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.22)', padding: '3px', borderRadius: '9px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleSwitchModule('telephony')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 13px',
              borderRadius: '7px',
              border: 'none',
              background: activeModule === 'telephony' ? '#ffffff' : 'transparent',
              color: activeModule === 'telephony' ? '#064e3b' : '#d1fae5',
              fontWeight: activeModule === 'telephony' ? '800' : '600',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <PhoneCall size={13} />
            <span>Phone System</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchModule('crm')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 13px',
              borderRadius: '7px',
              border: 'none',
              background: activeModule === 'crm' ? '#ffffff' : 'transparent',
              color: activeModule === 'crm' ? '#064e3b' : '#d1fae5',
              fontWeight: activeModule === 'crm' ? '800' : '600',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={13} />
            <span>CRM Sales</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchModule('cross')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 13px',
              borderRadius: '7px',
              border: 'none',
              background: activeModule === 'cross' ? '#ffffff' : 'transparent',
              color: activeModule === 'cross' ? '#064e3b' : '#d1fae5',
              fontWeight: activeModule === 'cross' ? '800' : '600',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Share2 size={13} />
            <span>Cross-Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchModule('builder')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 13px',
              borderRadius: '7px',
              border: 'none',
              background: activeModule === 'builder' ? '#ffffff' : 'transparent',
              color: activeModule === 'builder' ? '#064e3b' : '#d1fae5',
              fontWeight: activeModule === 'builder' ? '800' : '600',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Sliders size={13} />
            <span>Report Builder</span>
          </button>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeModule !== 'telephony' && (
            <button
              type="button"
              onClick={exportToCsv}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 11px',
                borderRadius: '7px',
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          )}

          {onOpenModuleConfig && (
            <button
              type="button"
              onClick={() => onOpenModuleConfig(activeModule === 'telephony' ? 'telecalling' : 'crm_deals')}
              title="Configure Module Fields & Stages"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '7px',
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Settings size={13} />
              <span>Config Schema</span>
            </button>
          )}
        </div>
      </div>

      {/* 📞 IF ACTIVE MODULE IS PHONE SYSTEM: RENDER DEDICATED DARK EMERALD ANALYTICS */}
      {activeModule === 'telephony' ? (
        <PhoneSystemAnalyticsView
          callLogs={callLogs}
          employees={employees}
          authUser={authUser}
        />
      ) : (
        <>
          {/* 🔍 STANDARD ENGINE TOOLBAR (LayoutToolbar Style) */}
          <div
            style={{
              background: '#ffffff',
          padding: '12px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 260px', maxWidth: '340px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              width: '100%'
            }}
          >
            <Search size={15} color="#64748b" />
            <input
              type="text"
              placeholder={`Search ${activeModule === 'telephony' ? 'calls, agents, leads' : 'deals, sources, agents'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                width: '100%',
                color: '#1e293b'
              }}
            />
          </div>
        </div>

        {/* Date Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'all', label: 'All Time' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: period === p.id ? '#0d9488' : 'transparent',
                color: period === p.id ? '#ffffff' : '#475569',
                fontSize: '11.5px',
                fontWeight: period === p.id ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Dynamic Dropdown Selectors (for Standard Views) */}
        {activeModule !== 'builder' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b' }}>Group By:</span>
              <select
                value={groupByField}
                onChange={(e) => setGroupByField(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {groupByOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '12px',
                fontWeight: '500',
                color: selectedAgent === 'ALL' ? '#64748b' : '#0d9488',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">👤 All Agents</option>
              {distinctAgents.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {(activeModule === 'crm' || activeModule === 'cross') && (
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: selectedSource === 'ALL' ? '#64748b' : '#0d9488',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">🌐 All Sources</option>
                {distinctSources.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            {activeModule === 'telephony' && (
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: selectedStatus === 'ALL' ? '#64748b' : '#0d9488',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">🎯 All Dispositions</option>
                {distinctDispositions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* 📊 MAIN CONTENT CONTAINER */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ========================================================= */}
        {/* 🛠️ SPECIAL VIEW: DYNAMIC CUSTOM REPORT BUILDER              */}
        {/* ========================================================= */}
        {activeModule === 'builder' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* BUILDER CONFIGURATION CONSOLE */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '20px 24px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={18} color="#0d9488" />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Custom Dynamic Report Studio
                  </h3>
                  <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                    Client Self-Serve
                  </span>
                </div>
                {saveSuccessMsg && (
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', background: '#dcfce7', padding: '4px 10px', borderRadius: '6px' }}>
                    ✓ {saveSuccessMsg}
                  </span>
                )}
              </div>

              {/* Step Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {/* 1. Dataset */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '5px' }}>
                    1. Select Module / Dataset
                  </label>
                  <select
                    value={builderModule}
                    onChange={(e) => {
                      setBuilderModule(e.target.value);
                      setBuilderGroupBy(e.target.value === 'telephony' ? 'agentName' : 'stage');
                    }}
                    style={builderSelectStyle}
                  >
                    <option value="telephony">📞 Phone System (Call Logs)</option>
                    <option value="crm">💼 CRM Sales Deals</option>
                  </select>
                </div>

                {/* 2. Group By Dimension */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '5px' }}>
                    2. Group Dimension (X-Axis / Rows)
                  </label>
                  <select
                    value={builderGroupBy}
                    onChange={(e) => setBuilderGroupBy(e.target.value)}
                    style={builderSelectStyle}
                  >
                    {builderModule === 'telephony' ? (
                      <>
                        <option value="agentName">Telecaller Agent</option>
                        <option value="status">Call Disposition</option>
                        <option value="type">Call Type (Incoming / Outgoing)</option>
                        <option value="channel">Channel (SIM / WhatsApp)</option>
                      </>
                    ) : (
                      <>
                        <option value="stage">Pipeline Stage</option>
                        <option value="source">Lead Source</option>
                        <option value="agent">Assigned Telecaller</option>
                      </>
                    )}
                  </select>
                </div>

                {/* 3. Metric Calculation */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '5px' }}>
                    3. Metric Calculation
                  </label>
                  <select
                    value={builderMetric}
                    onChange={(e) => setBuilderMetric(e.target.value)}
                    style={builderSelectStyle}
                  >
                    <option value="count">Count of Records</option>
                    <option value="sum">{builderModule === 'crm' ? 'Sum of Deal Values (₹)' : 'Sum of Talk Duration (sec)'}</option>
                    <option value="avg">{builderModule === 'crm' ? 'Average Deal Size (₹)' : 'Average Duration (sec)'}</option>
                  </select>
                </div>

                {/* 4. Report Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '5px' }}>
                    4. Report Title
                  </label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g. Q4 Sales Conversion by Agent"
                    style={{ ...builderSelectStyle, background: '#f8fafc' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={handleSaveCustomReport}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(13, 148, 136, 0.2)'
                  }}
                >
                  <Save size={14} />
                  <span>Save Custom Report</span>
                </button>
              </div>
            </div>

            {/* LIVE CUSTOM RESULTS MATRIX */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '20px' }}>
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                    {reportTitle || 'Custom Report Results'}
                  </h4>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0d9488' }}>
                    {customBuilderData.length} Dimension Groups
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: '700' }}>
                        <th style={{ padding: '10px 16px' }}>Group Dimension ({builderGroupBy})</th>
                        <th style={{ padding: '10px 14px' }}>Count</th>
                        <th style={{ padding: '10px 14px' }}>
                          {builderModule === 'crm' ? 'Total Value' : 'Total Duration'}
                        </th>
                        <th style={{ padding: '10px 14px' }}>
                          {builderModule === 'crm' ? 'Average Value' : 'Average Duration'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {customBuilderData.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                            No data available matching filters.
                          </td>
                        </tr>
                      ) : (
                        customBuilderData.map((row, idx) => (
                          <tr key={row.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '11px 16px', fontWeight: '700', color: '#0f172a' }}>
                              #{idx + 1} {row.key}
                            </td>
                            <td style={{ padding: '11px 14px', fontWeight: '700', color: '#1e293b' }}>
                              {row.count}
                            </td>
                            <td style={{ padding: '11px 14px', fontWeight: '700', color: '#0d9488' }}>
                              {builderModule === 'crm' ? formatINR(row.sumVal) : formatSeconds(row.sumVal)}
                            </td>
                            <td style={{ padding: '11px 14px', color: '#475569' }}>
                              {builderModule === 'crm' ? formatINR(row.avgVal) : formatSeconds(row.avgVal)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chart for Builder */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                  Relative Proportions
                </h4>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                  {customBuilderData.slice(0, 6).map((item, idx) => {
                    const maxVal = Math.max(...customBuilderData.map(c => (builderMetric === 'count' ? c.count : c.sumVal) || 1));
                    const currentVal = (builderMetric === 'count' ? item.count : item.sumVal) || 0;
                    const pct = Math.max(4, Math.round((currentVal / maxVal) * 100));
                    const colors = ['#0d9488', '#059669', '#2563eb', '#d97706', '#8b5cf6'];
                    const barColor = colors[idx % colors.length];

                    return (
                      <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                          <span style={{ fontWeight: '700', color: '#334155' }}>{item.key}</span>
                          <span style={{ fontWeight: '800', color: barColor }}>
                            {builderModule === 'crm' && builderMetric !== 'count' ? formatINR(currentVal) : `${currentVal} items`}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '5px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SAVED CUSTOM REPORTS GALLERY */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <FolderOpen size={16} color="#0d9488" />
                <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                  Saved Custom Reports ({savedReports.length})
                </h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {savedReports.map(rep => (
                  <div
                    key={rep.id}
                    onClick={() => handleLoadCustomReport(rep)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0d9488')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  >
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>{rep.title}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Dataset: <strong>{rep.module === 'telephony' ? 'Phone System' : 'CRM'}</strong> • Group: <strong>{rep.groupBy}</strong>
                      </div>
                    </div>
                    {rep.createdAt !== 'Default' && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomReport(rep.id, e)}
                        title="Delete report"
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 📊 STANDARD MODULE VIEWS (Phone System, CRM, Cross)        */}
        {/* ========================================================= */}
        {activeModule !== 'builder' && (
          <>
            {/* 1. DYNAMIC KPI SUMMARY STRIP */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {activeModule === 'telephony' && (
                <>
                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Total Calls</span>
                      <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '8px' }}>
                        <PhoneCall size={18} color="#059669" />
                      </div>
                    </div>
                    <div style={kpiValStyle}>{telephonyKpis.total}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px' }}>
                      <span>Outbound: <strong>{telephonyKpis.outbound}</strong></span>
                      <span>• Inbound: <strong>{telephonyKpis.inbound}</strong></span>
                    </div>
                  </div>

                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Connected Rate</span>
                      <div style={{ background: '#f0fdfa', padding: '6px', borderRadius: '8px' }}>
                        <TrendingUp size={18} color="#0d9488" />
                      </div>
                    </div>
                    <div style={{ ...kpiValStyle, color: '#0d9488' }}>{telephonyKpis.rate}%</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {telephonyKpis.connected} of {telephonyKpis.total} calls connected
                    </div>
                  </div>

                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Total Talk Time</span>
                      <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>
                        <Clock size={18} color="#2563eb" />
                      </div>
                    </div>
                    <div style={kpiValStyle}>{formatSeconds(telephonyKpis.totalDuration)}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Avg length: <strong>{formatSeconds(telephonyKpis.avgDuration)}</strong> per call
                    </div>
                  </div>

                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Positive Dispositions</span>
                      <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '8px' }}>
                        <CheckCircle size={18} color="#d97706" />
                      </div>
                    </div>
                    <div style={{ ...kpiValStyle, color: '#d97706' }}>{telephonyKpis.interested}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {telephonyKpis.positiveRate}% of total dials converted
                    </div>
                  </div>
                </>
              )}

              {activeModule === 'crm' && (
                <>
                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Total Leads & Deals</span>
                      <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>
                        <Layers size={18} color="#2563eb" />
                      </div>
                    </div>
                    <div style={kpiValStyle}>{crmKpis.total}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Active pipeline in selected period
                    </div>
                  </div>

                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Pipeline Value</span>
                      <div style={{ background: '#f0fdfa', padding: '6px', borderRadius: '8px' }}>
                        <DollarSign size={18} color="#0d9488" />
                      </div>
                    </div>
                    <div style={{ ...kpiValStyle, color: '#0d9488' }}>{formatINR(crmKpis.pipelineValue)}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Total potential deal value
                    </div>
                  </div>

                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Deals Won (Closed)</span>
                      <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '8px' }}>
                        <CheckCircle size={18} color="#059669" />
                      </div>
                    </div>
                    <div style={{ ...kpiValStyle, color: '#059669' }}>{crmKpis.wonCount}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Won Revenue: <strong>{formatINR(crmKpis.wonValue)}</strong>
                    </div>
                  </div>

                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Pipeline Win Rate</span>
                      <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '8px' }}>
                        <TrendingUp size={18} color="#d97706" />
                      </div>
                    </div>
                    <div style={{ ...kpiValStyle, color: '#d97706' }}>{crmKpis.winRate}%</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Ratio of won deals in pipeline
                    </div>
                  </div>
                </>
              )}

              {activeModule === 'cross' && (
                <>
                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Contacted Leads</span>
                      <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '8px' }}>
                        <Share2 size={18} color="#059669" />
                      </div>
                    </div>
                    <div style={kpiValStyle}>{crossKpis.contactedCount}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {crossKpis.contactCoverage}% of {crossKpis.totalLeads} CRM leads called
                    </div>
                  </div>

                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Calls Made to Leads</span>
                      <div style={{ background: '#f0fdfa', padding: '6px', borderRadius: '8px' }}>
                        <PhoneCall size={18} color="#0d9488" />
                      </div>
                    </div>
                    <div style={{ ...kpiValStyle, color: '#0d9488' }}>{crossKpis.callsToLeads}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Avg {crossKpis.contactedCount > 0 ? (crossKpis.callsToLeads / crossKpis.contactedCount).toFixed(1) : 0} calls per contacted lead
                    </div>
                  </div>

                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Deals Won from Calls</span>
                      <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '8px' }}>
                        <CheckCircle size={18} color="#059669" />
                      </div>
                    </div>
                    <div style={{ ...kpiValStyle, color: '#059669' }}>{crossKpis.wonFromCalls}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {crossKpis.conversionRate}% call-to-close conversion
                    </div>
                  </div>

                  <div style={kpiCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={kpiLabelStyle}>Won Revenue Generated</span>
                      <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '8px' }}>
                        <DollarSign size={18} color="#d97706" />
                      </div>
                    </div>
                    <div style={{ ...kpiValStyle, color: '#d97706' }}>{formatINR(crossKpis.wonRevenue)}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      From phone-contacted deals
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 2. MAIN ANALYTICS GRID: MATRIX TABLE + VISUAL DISTRIBUTION */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '20px' }}>
              {/* LEFT: GROUPED PERFORMANCE TABLE */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="#0d9488" />
                    <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                      {activeModule === 'telephony'
                        ? (groupByField === 'agentName' ? 'Telecaller Leaderboard & Performance' : `Performance by ${groupByField.toUpperCase()}`)
                        : (activeModule === 'crm' ? `Deals Breakdown by ${groupByField.toUpperCase()}` : 'Cross-Module Matrix')}
                    </h3>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                    {groupedData.length} Grouped Items
                  </span>
                </div>

                <div style={{ overflowX: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: '700' }}>
                        <th style={{ padding: '10px 16px' }}>
                          {groupByOptions.find(o => o.id === groupByField)?.label || 'Dimension'}
                        </th>
                        {activeModule === 'telephony' && (
                          <>
                            <th style={{ padding: '10px 12px' }}>Calls</th>
                            <th style={{ padding: '10px 12px' }}>Connected %</th>
                            <th style={{ padding: '10px 12px' }}>Talk Time</th>
                            <th style={{ padding: '10px 12px' }}>Interested</th>
                            <th style={{ padding: '10px 12px' }}>Conv %</th>
                          </>
                        )}
                        {activeModule === 'crm' && (
                          <>
                            <th style={{ padding: '10px 12px' }}>Deals</th>
                            <th style={{ padding: '10px 12px' }}>Total Value</th>
                            <th style={{ padding: '10px 12px' }}>Won Deals</th>
                            <th style={{ padding: '10px 12px' }}>Win Rate %</th>
                          </>
                        )}
                        {activeModule === 'cross' && (
                          <>
                            <th style={{ padding: '10px 12px' }}>Calls</th>
                            <th style={{ padding: '10px 12px' }}>Leads</th>
                            <th style={{ padding: '10px 12px' }}>Won Deals</th>
                            <th style={{ padding: '10px 12px' }}>Won Revenue</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedData.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                            No records found matching the selected period and filters.
                          </td>
                        </tr>
                      ) : (
                        groupedData.map((row, idx) => (
                          <tr
                            key={row.key}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: '#e2e8f0',
                                  color: '#475569',
                                  fontSize: '10px',
                                  fontWeight: '800',
                                  lineHeight: '20px',
                                  textAlign: 'center'
                                }}>
                                  {idx + 1}
                                </span>
                                <span>{row.key}</span>
                              </div>
                            </td>

                            {activeModule === 'telephony' && (
                              <>
                                <td style={{ padding: '12px 12px', fontWeight: '700', color: '#1e293b' }}>
                                  {row.count}
                                </td>
                                <td style={{ padding: '12px 12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '45px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.min(100, row.rate)}%`, height: '100%', background: '#0d9488' }} />
                                    </div>
                                    <span style={{ fontWeight: '700', color: '#0d9488', fontSize: '11px' }}>{row.rate}%</span>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 12px', color: '#475569' }}>
                                  {formatSeconds(row.duration)}
                                </td>
                                <td style={{ padding: '12px 12px', fontWeight: '700', color: '#059669' }}>
                                  {row.positive}
                                </td>
                                <td style={{ padding: '12px 12px' }}>
                                  <span style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: Number(row.conversion) > 20 ? '#dcfce7' : '#f1f5f9',
                                    color: Number(row.conversion) > 20 ? '#15803d' : '#64748b',
                                    fontSize: '10.5px',
                                    fontWeight: '800'
                                  }}>
                                    {row.conversion}%
                                  </span>
                                </td>
                              </>
                            )}

                            {activeModule === 'crm' && (
                              <>
                                <td style={{ padding: '12px 12px', fontWeight: '700', color: '#1e293b' }}>
                                  {row.count}
                                </td>
                                <td style={{ padding: '12px 12px', fontWeight: '700', color: '#0d9488' }}>
                                  {formatINR(row.totalValue)}
                                </td>
                                <td style={{ padding: '12px 12px', fontWeight: '700', color: '#059669' }}>
                                  {row.wonCount}
                                </td>
                                <td style={{ padding: '12px 12px' }}>
                                  <span style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: Number(row.winRate) > 30 ? '#dcfce7' : '#f1f5f9',
                                    color: Number(row.winRate) > 30 ? '#15803d' : '#64748b',
                                    fontSize: '10.5px',
                                    fontWeight: '800'
                                  }}>
                                    {row.winRate}%
                                  </span>
                                </td>
                              </>
                            )}

                            {activeModule === 'cross' && (
                              <>
                                <td style={{ padding: '12px 12px', fontWeight: '700', color: '#1e293b' }}>
                                  {row.callsCount || 0}
                                </td>
                                <td style={{ padding: '12px 12px', color: '#475569' }}>
                                  {row.leadsCount || row.matchedLeads || 0}
                                </td>
                                <td style={{ padding: '12px 12px', fontWeight: '700', color: '#059669' }}>
                                  {row.wonCount || 0}
                                </td>
                                <td style={{ padding: '12px 12px', fontWeight: '700', color: '#d97706' }}>
                                  {formatINR(row.wonRevenue || 0)}
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RIGHT: VISUAL DISTRIBUTION CHART */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PieChart size={16} color="#0d9488" />
                    <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                      Distribution & Proportions
                    </h3>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                  {groupedData.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '20px' }}>
                      No chart data available
                    </div>
                  ) : (
                    groupedData.slice(0, 7).map((item, idx) => {
                      const maxVal = Math.max(...groupedData.map(g => (activeModule === 'crm' ? g.totalValue : g.count) || 1));
                      const currentVal = (activeModule === 'crm' ? item.totalValue : item.count) || 0;
                      const pct = Math.max(4, Math.round((currentVal / maxVal) * 100));

                      const colors = ['#0d9488', '#059669', '#10b981', '#34d399', '#2563eb', '#d97706', '#64748b'];
                      const barColor = colors[idx % colors.length];

                      return (
                        <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                            <span style={{ fontWeight: '700', color: '#334155' }}>{item.key}</span>
                            <span style={{ fontWeight: '800', color: barColor }}>
                              {activeModule === 'crm' ? formatINR(currentVal) : `${currentVal} items`}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: barColor,
                                borderRadius: '5px',
                                transition: 'width 0.4s ease'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Summary Pill at Bottom */}
                <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
                  💡 <strong>Dynamic Intelligence Tip:</strong> Select different dimensions under <em>"Group By"</em> above to recalculate metrics across agents, channels, and pipelines in real-time.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )}
    </div>
  );
}

const kpiCardStyle = {
  background: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  padding: '16px 18px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const kpiLabelStyle = {
  fontSize: '11.5px',
  fontWeight: '700',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.4px'
};

const kpiValStyle = {
  fontSize: '24px',
  fontWeight: '800',
  color: '#0f172a',
  letterSpacing: '-0.5px'
};

const builderSelectStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  fontSize: '12.5px',
  fontWeight: '600',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box'
};
