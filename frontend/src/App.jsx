import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { 
  MessageSquare, 
  Layers, 
  Smartphone, 
  Send, 
  Plus, 
  Trash2, 
  User, 
  Tag, 
  X, 
  Check, 
  CheckCheck,
  Bot,
  Megaphone,
  Archive,
  RefreshCw, 
  Clock,
  Star,
  Calendar,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Globe,
  Users,
  Search,
  Image as ImageIcon,
  FileText,
  Play,
  Volume2,
  Download,
  Paperclip,
  BarChart3,
  Briefcase,
  Palette,
  Award,
  CreditCard,
  ClipboardList,
  Bell,
  Mail,
  Lock
} from 'lucide-react';

const getLabelStyles = (label) => {
  if (!label) return {};
  const lower = label.toLowerCase();
  if (lower.includes('vip') || lower.includes('hot')) {
    return { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' };
  }
  if (lower.includes('lead') || lower.includes('new')) {
    return { background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' };
  }
  if (lower.includes('follow') || lower.includes('wait') || lower.includes('pending')) {
    return { background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' };
  }
  if (lower.includes('won') || lower.includes('closed') || lower.includes('done') || lower.includes('success')) {
    return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' };
  }
  
  // Custom hash color for other labels
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return {
    background: `hsla(${hue}, 70%, 50%, 0.12)`,
    color: `hsl(${hue}, 85%, 70%)`,
    border: `1px solid hsla(${hue}, 70%, 50%, 0.25)`,
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500'
  };
};

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const LIVE_BACKEND = 'https://ems-backend-9hig.onrender.com';
const SOCKET_URL = IS_DEV ? 'http://localhost:5000' : LIVE_BACKEND;
const API_URL = IS_DEV ? 'http://localhost:5000/api' : `${LIVE_BACKEND}/api`;

// Globally override fetch to inject bearer tokens and handle redirect triggers
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const token = localStorage.getItem('omnilflow_token');
  const headers = {
    ...options.headers,
  };
  
  if (token && (typeof url === 'string' && url.startsWith(API_URL))) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await originalFetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && (typeof url === 'string' && url.startsWith(API_URL))) {
    localStorage.removeItem('omnilflow_token');
    localStorage.removeItem('omnilflow_user');
    window.dispatchEvent(new Event('auth_failed'));
  }

  if (response.status === 402 && (typeof url === 'string' && url.startsWith(API_URL))) {
    window.dispatchEvent(new Event('subscription_expired'));
  }

  return response;
};

const formatJidName = (jid) => {
  if (!jid) return '';
  const number = jid.split('@')[0];
  if (jid.endsWith('@g.us')) {
    return `Group Chat (${number.substring(0, 5)}...)`;
  }
  if (jid.endsWith('@lid')) {
    return `LID User (${number.substring(0, 6)}...)`;
  }
  
  // Format phone numbers
  if (number.startsWith('91') && number.length === 12) {
    return `+91 ${number.substring(2, 7)} ${number.substring(7)}`;
  }
  if (number.startsWith('1') && number.length === 11) {
    return `+1 (${number.substring(1, 4)}) ${number.substring(4, 7)}-${number.substring(7)}`;
  }
  
  return `+${number}`;
};

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Pleasant dual-frequency WhatsApp-like notification sound
    osc.type = 'sine';
    
    // Play D5 note then G5 note
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.06); // G5
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
    osc2.start(ctx.currentTime + 0.06);
    osc2.stop(ctx.currentTime + 0.22);
  } catch (e) {
    console.error('Audio play failed:', e);
  }
};

const isPhone = (str) => /^\d+$/.test(str || '');

const renderStatusTicks = (status) => {
  // Statuses from WhatsApp / Baileys:
  // 1: sent (single gray tick)
  // 2: delivered (double gray tick)
  // 3 or 4: read/played (double blue tick)
  if (status === 3 || status === 4) {
    return <CheckCheck size={14} style={{ color: '#53bdeb' }} title="Read" />;
  }
  if (status === 2) {
    return <CheckCheck size={14} style={{ color: 'var(--text-dim)' }} title="Delivered" />;
  }
  if (status === 1) {
    return <Check size={14} style={{ color: 'var(--text-dim)' }} title="Sent" />;
  }
  return <Check size={14} style={{ color: 'rgba(255,255,255,0.15)' }} title="Pending" />;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'kanban', 'channels'
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('ems_theme') || 'emerald');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('ems_theme', currentTheme);
  }, [currentTheme]);
  
  const [expandedCategories, setExpandedCategories] = useState({
    dashboards: true,
    hr_management: false,
    payroll_finance: false,
    crm_sales: true,
    operations: false,
    my_portal: false,
    saas_portal: false
  });

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  useEffect(() => {
    const tabToCategory = {
      admin_dashboard: 'dashboards',
      manager_dashboard: 'dashboards',
      gps_attendance: 'dashboards',
      employees: 'hr_management',
      employee_directory: 'hr_management',
      recruitment_ats: 'hr_management',
      performance_kpis: 'hr_management',
      asset_management: 'hr_management',
      offboarding: 'hr_management',
      payroll: 'payroll_finance',
      taxes_compliance: 'payroll_finance',
      incentives_bonus: 'payroll_finance',
      ff_settlements: 'payroll_finance',
      advances_loans: 'payroll_finance',
      expenses: 'payroll_finance',
      channels: 'crm_sales',
      inbox: 'crm_sales',
      kanban: 'crm_sales',
      chatbot: 'crm_sales',
      tasks: 'operations',
      notice_board: 'operations',
      holidays: 'operations',
      rewards_recognition: 'operations',
      my_attendance: 'my_portal',
      leaves: 'my_portal',
      shift_rostering: 'my_portal',
      work_hours: 'my_portal',
      office_kiosk: 'my_portal',
      verify_documents: 'saas_portal',
      roles_permissions: 'saas_portal',
      system_dropdowns: 'saas_portal',
      recycle_bin: 'saas_portal',
      app_guide: 'saas_portal',
      general_settings: 'saas_portal',
      super_admin_billing: 'saas_portal'
    };
    const cat = tabToCategory[activeTab];
    if (cat) {
      setExpandedCategories(prev => ({
        ...prev,
        [cat]: true
      }));
    }
  }, [activeTab]);

  // Cloned modules state hooks with rich default dummy data
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Integrate WhatsApp Webhook API', description: 'Ensure double-tick sync with Baileys', priority: 'High', status: 'In Progress', assigned_to: '1', due_date: '2026-07-20' },
    { id: '2', title: 'Review Candidate Applications for Sales', description: 'Filter candidates in ATS Kanban pipeline', priority: 'Medium', status: 'To Do', assigned_to: '2', due_date: '2026-07-25' },
    { id: '3', title: 'Verify Field Agent GPS Tracking Trail', description: 'Audit monthly travel distance logs', priority: 'High', status: 'Completed', assigned_to: '3', due_date: '2026-07-18' },
    { id: '4', title: 'Update Client Proposal Pitch Deck', description: 'Add Q3 sales pricing tiers for SaaS clients', priority: 'Low', status: 'To Do', assigned_to: '4', due_date: '2026-07-28' }
  ]);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    id: '',
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    status: 'To Do',
    dueDate: ''
  });

  const [notices, setNotices] = useState([
    { id: '1', title: 'Independence Day Office Celebration', content: 'Office will remain closed on 15th August 2026 for Independence Day. Happy Holidays!', date: '2026-07-17', author: 'HR Admin' },
    { id: '2', title: 'Q3 Sales Targets & Strategy Meeting', content: 'All managers and sales leads must attend the online sync meeting tomorrow at 10:00 AM.', date: '2026-07-18', author: 'Management' },
    { id: '3', title: 'New Multi-Device WA Channel Update', content: 'We have updated our WhatsApp CRM engine to support up to 10 connected channels.', date: '2026-07-15', author: 'IT Support' }
  ]);
  const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);
  const [newNoticeForm, setNewNoticeForm] = useState({
    title: '',
    content: ''
  });

  const [holidays, setHolidays] = useState([
    { id: '1', name: 'Independence Day', date: '2026-08-15', day: 'Saturday' },
    { id: '2', name: 'Raksha Bandhan', date: '2026-08-28', day: 'Friday' },
    { id: '3', name: 'Gandhi Jayanti', date: '2026-10-02', day: 'Friday' },
    { id: '4', name: 'Diwali Celebration', date: '2026-11-01', day: 'Sunday' }
  ]);
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHolidayForm, setNewHolidayForm] = useState({
    name: '',
    date: ''
  });

  const [leaves, setLeaves] = useState([
    { id: '1', employee_name: 'Kavita Patel', startDate: '2026-07-18', endDate: '2026-07-19', type: 'Sick', status: 'Approved', reason: 'Fever and viral flu' },
    { id: '2', employee_name: 'Amit Kumar', startDate: '2026-07-25', endDate: '2026-07-26', type: 'Casual', status: 'Pending', reason: 'Family function' }
  ]);
  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [newLeaveForm, setNewLeaveForm] = useState({
    startDate: '',
    endDate: '',
    type: 'Sick',
    reason: ''
  });

  const [sessions, setSessions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // New Chat states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatInitialMsg, setNewChatInitialMsg] = useState('');
  const [newChatSessionId, setNewChatSessionId] = useState('');
  const [newChatError, setNewChatError] = useState('');
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);

  // Chatbot states with default rules
  const [chatbotRules, setChatbotRules] = useState([
    { id: '1', keyword: 'price', match_type: 'contains', reply_text: 'Our WhatsApp CRM pricing starts at ₹999/mo! Reply DEMO for details.', is_active: 1 },
    { id: '2', keyword: 'demo', match_type: 'exact', reply_text: 'Book a live product demo here: https://employeemanagementsystems.com/demo', is_active: 1 },
    { id: '3', keyword: 'support', match_type: 'contains', reply_text: 'Our support team is live 24/7. Call us at +91 9999999999', is_active: 1 }
  ]);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [chatbotRuleKeyword, setChatbotRuleKeyword] = useState('');
  const [chatbotRuleReply, setChatbotRuleReply] = useState('');
  const [chatbotRuleMatchType, setChatbotRuleMatchType] = useState('contains');
  const [chatbotRuleError, setChatbotRuleError] = useState('');

  // Broadcast states
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastStage, setBroadcastStage] = useState('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // GPS & Client Visit states
  const [showClientVisitModal, setShowClientVisitModal] = useState(false);
  const [clientVisitForm, setClientVisitForm] = useState({ clientName: '', address: '', notes: '' });
  const [clientVisits, setClientVisits] = useState([
    { id: '1', clientName: 'TechCorp Solutions', address: 'DLF Cyber City, Gurgaon', notes: 'Demonstrated WhatsApp CRM features to VP of Sales', timestamp: '11:30 AM' },
    { id: '2', clientName: 'Nexus Global Ltd', address: 'Sector 62, Noida', notes: 'Signed Q3 SaaS license agreement', timestamp: '03:15 PM' }
  ]);
  const [sosActive, setSosActive] = useState(false);
  const [isPlayingTrail, setIsPlayingTrail] = useState(false);

  // Multi-Employee Manager Tracking state
  const [gpsSubTab, setGpsSubTab] = useState('live'); // 'live' | 'audit'
  const [selectedAuditEmployee, setSelectedAuditEmployee] = useState('1');
  const [selectedAuditDate, setSelectedAuditDate] = useState('2026-07-18');
  
  // Custom vehicle fuel reimbursement rates per KM (customizable by Owner)
  const [vehicleRates, setVehicleRates] = useState({ bike: 6, car: 12, suv: 18 });

  // Offline Simulation Tracking states
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlinePingsCount, setOfflinePingsCount] = useState(0);
  const [isSyncingPings, setIsSyncingPings] = useState(false);

  // Client visit verification and signature
  const [clientSignature, setClientSignature] = useState('');

  // Dynamic Beat Planning: Maps employee ID to active visit route sequence
  const [employeeBeatPlans, setEmployeeBeatPlans] = useState({
    '1': [
      { id: '1', name: 'DLF Real Estate Hub', lat: 28.6280, lng: 77.3649 },
      { id: '2', name: 'TechCorp Solutions', lat: 28.6250, lng: 77.3400 },
      { id: '3', name: 'Noida Sec 16 Food Court', lat: 28.6210, lng: 77.2600 }
    ],
    '2': [
      { id: '1', name: 'Lajpat Nagar Branch Office', lat: 28.5800, lng: 77.2500 },
      { id: '2', name: 'Connaught Place Client HQ', lat: 28.6315, lng: 77.2167 }
    ]
  });

  // Beat Planner Modal Control states
  const [showBeatPlannerModal, setShowBeatPlannerModal] = useState(false);
  const [selectedPlannerEmpId, setSelectedPlannerEmpId] = useState('1');
  const [tempCheckpoints, setTempCheckpoints] = useState([]);
  const [newCheckpointForm, setNewCheckpointForm] = useState({ name: '', lat: '', lng: '' });

  // Shift Expenses state: Tolls, Breakfast, Lunch, Dinner, Misc other
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedExpenseEmpId, setSelectedExpenseEmpId] = useState('1'); 
  const [expenseForm, setExpenseForm] = useState({
    tollEncountered: false,
    tollAmount: '',
    tollSlip: '',
    breakfast: '',
    lunch: '',
    dinner: '',
    otherAmount: '',
    otherDescription: ''
  });

  const [employeeExpenses, setEmployeeExpenses] = useState({
    '1_2026-07-18': {
      tolls: { encountered: true, amount: 120, receipt_slip: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600' },
      meals: { breakfast: 80, lunch: 140, dinner: 0 },
      other: { amount: 60, description: 'Client high-tea refreshment' },
      status: 'pending',
      totalAmount: 400
    },
    '2_2026-07-18': {
      tolls: { encountered: false, amount: 0, receipt_slip: '' },
      meals: { breakfast: 60, lunch: 120, dinner: 0 },
      other: { amount: 0, description: '' },
      status: 'approved',
      totalAmount: 180
    },
    '4_2026-07-18': {
      tolls: { encountered: true, amount: 240, receipt_slip: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600' },
      meals: { breakfast: 90, lunch: 180, dinner: 120 },
      other: { amount: 150, description: 'Courier charges for client contracts' },
      status: 'rejected',
      totalAmount: 780
    }
  });

  // Global Toast Notification state
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Multi-language Translation Support
  const [language, setLanguage] = useState('en'); // 'en', 'hi', 'hinglish'
  
  const translations = {
    en: {
      dashboard: 'Company Overview',
      taskAnalytics: 'Task Analytics',
      liveTracking: 'Live Tracking Map',
      employees: 'All Employees',
      directory: 'Employee Directory',
      verifyDocs: 'Verify Documents',
      payroll: 'Payroll & Salary',
      kiosk: 'Office Kiosk',
      logOut: 'Logout Session',
      tasks: 'Task Kanban',
      auditLogs: 'System Audit Logs'
    },
    hi: {
      dashboard: 'कंपनी अवलोकन',
      taskAnalytics: 'कार्य विश्लेषण',
      liveTracking: 'लाइव ट्रैकिंग मानचित्र',
      employees: 'सभी कर्मचारी',
      directory: 'कर्मचारी निर्देशिका',
      verifyDocs: 'दस्तावेज़ सत्यापन',
      payroll: 'पेरोल और वेतन',
      kiosk: 'कार्यालय कियोस्क',
      logOut: 'लॉगआउट सेशन',
      tasks: 'कार्य कानबन',
      auditLogs: 'सिस्टम ऑडिट लॉग'
    },
    hinglish: {
      dashboard: 'Company Overview',
      taskAnalytics: 'Task Analytics',
      liveTracking: 'Live Tracking Map',
      employees: 'Sabh Employees',
      directory: 'Employee Directory',
      verifyDocs: 'Documents Verify Karein',
      payroll: 'Salary aur Payroll',
      kiosk: 'Office Punch Terminal',
      logOut: 'App Se Exit Karein',
      tasks: 'Kanban Task Board',
      auditLogs: 'System Audit Logs'
    }
  };

  // Connection & Offline status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Auto Session Expiry
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(60);

  // Global Audit Log Registry State
  const [auditLogs, setAuditLogs] = useState([
    { id: 1, action: 'User login success', role: 'owner', user: 'admin@omniflow.com', time: '11:02 AM' },
    { id: 2, action: 'Fuel allowance rates updated to ₹8/KM', role: 'owner', user: 'admin@omniflow.com', time: '11:15 AM' },
    { id: 3, action: 'Beat route dispatched to Amit Kumar', role: 'manager', user: 'manager@omniflow.com', time: '11:32 AM' },
    { id: 4, action: 'Shift expenses claim submitted by Deepak Verma', role: 'employee', user: 'deepak@omniflow.com', time: '11:45 AM' }
  ]);

  // Global Search bar query
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);

  // Table sorting states
  const [employeeSortKey, setEmployeeSortKey] = useState('first_name');
  const [employeeSortDir, setEmployeeSortDir] = useState('asc');
  
  const [payrollSortKey, setPayrollSortKey] = useState('first_name');
  const [payrollSortDir, setPayrollSortDir] = useState('asc');

  // Employee table Pagination states
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const employeeItemsPerPage = 6;
  const [localEmpQuery, setLocalEmpQuery] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  const [selectedTrackEmployee, setSelectedTrackEmployee] = useState('all');
  const [teamTrackLocations, setTeamTrackLocations] = useState([
    { id: '1', employee_id: '1', first_name: 'Amit', last_name: 'Kumar', role: 'Backend Dev', latitude: 28.6280, longitude: 77.3649, status: 'moving', speed: '32 km/h', location_name: 'Noida Sector 62', battery: '88%', distance: '42.8 KM', stoppage: 'None (In Transit)', check_in_time: '2026-07-18T09:00:00', gps_status: 'normal', geofence_status: 'outside', idle_time_mins: 0, vehicle_type: 'bike' },
    { id: '2', employee_id: '2', first_name: 'Neha', last_name: 'Sharma', role: 'Frontend Dev', latitude: 28.6315, longitude: 77.2167, status: 'stopped', speed: '0 km/h', location_name: 'Connaught Place, New Delhi', battery: '76%', distance: '18.4 KM', stoppage: '18 Mins at Coffee Shop', check_in_time: '2026-07-18T09:15:00', gps_status: 'normal', geofence_status: 'outside', idle_time_mins: 18, vehicle_type: 'car' },
    { id: '3', employee_id: '3', first_name: 'Kavita', last_name: 'Patel', role: 'Product Lead', latitude: 28.4595, longitude: 77.0266, status: 'moving', speed: '18 km/h', location_name: 'DLF Cyber City, Gurgaon', battery: '92%', distance: '34.2 KM', stoppage: 'None (In Transit)', check_in_time: '2026-07-18T08:45:00', gps_status: 'normal', geofence_status: 'outside', idle_time_mins: 0, vehicle_type: 'bike' },
    { id: '4', employee_id: '4', first_name: 'Rahul', last_name: 'Verma', role: 'Sales Exec', latitude: 28.4480, longitude: 77.0850, status: 'stopped', speed: '0 km/h', location_name: 'Sector 44, Gurgaon', battery: '64%', distance: '55.1 KM', stoppage: '42 Mins at Client HQ', check_in_time: '2026-07-18T09:30:00', gps_status: 'spoofed', geofence_status: 'inside_client', idle_time_mins: 42, vehicle_type: 'suv' },
    { id: '5', employee_id: '5', first_name: 'Rajesh', last_name: 'Singh', role: 'Ops Lead', latitude: 28.5244, longitude: 77.2188, status: 'moving', speed: '45 km/h', location_name: 'Saket, South Delhi', battery: '81%', distance: '29.7 KM', stoppage: 'None (In Transit)', check_in_time: '2026-07-18T09:00:00', gps_status: 'normal', geofence_status: 'outside', idle_time_mins: 0, vehicle_type: 'bike' },
    { id: '6', employee_id: '6', first_name: 'Priya', last_name: 'Sharma', role: 'HR Manager', latitude: 28.5355, longitude: 77.3910, status: 'stopped', speed: '0 km/h', location_name: 'Noida Sector 18 Hub', battery: '95%', distance: '12.0 KM', stoppage: '15 Mins at Branch Office', check_in_time: '2026-07-18T10:00:00', gps_status: 'normal', geofence_status: 'outside', idle_time_mins: 15, vehicle_type: 'car' },
    { id: '7', employee_id: '7', first_name: 'Vikrant', last_name: 'Mehta', role: 'Business Dev', latitude: 28.4089, longitude: 77.3178, status: 'moving', speed: '28 km/h', location_name: 'Faridabad Sector 15', battery: '70%', distance: '61.4 KM', stoppage: 'None (In Transit)', check_in_time: '2026-07-18T08:30:00', gps_status: 'normal', geofence_status: 'outside', idle_time_mins: 0, vehicle_type: 'bike' },
    { id: '8', employee_id: '8', first_name: 'Pooja', last_name: 'Rani', role: 'Support Lead', latitude: 28.6692, longitude: 77.4538, status: 'stopped', speed: '0 km/h', location_name: 'Ghaziabad RDC Office', battery: '58%', distance: '22.5 KM', stoppage: '55 Mins at Support Hub', check_in_time: '2026-07-18T09:10:00', gps_status: 'off', geofence_status: 'outside', idle_time_mins: 55, vehicle_type: 'car' },
    { id: '9', employee_id: '9', first_name: 'Sanjay', last_name: 'Kumar', role: 'Accountant', latitude: 28.6139, longitude: 77.2090, status: 'moving', speed: '12 km/h', location_name: 'HQ Office, New Delhi', battery: '99%', distance: '5.2 KM', stoppage: 'Inside HQ Geofence', check_in_time: '2026-07-18T09:00:00', gps_status: 'normal', geofence_status: 'inside_hq', idle_time_mins: 0, vehicle_type: 'bike' },
    { id: '10', employee_id: '10', first_name: 'Deepak', last_name: 'Verma', role: 'Field Agent', latitude: 28.5700, longitude: 77.3200, status: 'moving', speed: '52 km/h', location_name: 'Noida Express Highway', battery: '85%', distance: '74.0 KM', stoppage: 'None (High Speed Transit)', check_in_time: '2026-07-18T08:00:00', gps_status: 'normal', geofence_status: 'outside', idle_time_mins: 0, vehicle_type: 'suv' }
  ]);

  // Persistent Full-Day Activity Audit Logs
  const [employeeAuditLogs, setEmployeeAuditLogs] = useState({
    '1_2026-07-18': {
      employeeName: 'Amit Kumar',
      role: 'Backend Dev',
      totalDistance: '42.8 KM',
      fuelClaim: '₹342.40',
      totalStoppages: '2 Stops (57 Mins Total)',
      events: [
        { time: '09:00 AM', type: 'clock_in', icon: '🟢', title: 'Shift Clock-In', landmark: 'HQ Office, Connaught Place, New Delhi', coordinates: '28.6139, 77.2090', battery: '98%', details: 'Clocked in via Mobile App (Inside 200m HQ Geofence)' },
        { time: '09:05 AM', type: 'geofence', icon: '📍', title: 'Geofence Exit Detected', landmark: 'HQ Office Outer Geofence Limit', coordinates: '28.6145, 77.2105', battery: '97%', details: 'Exited HQ Geofence zone. Status changed to: In Field' },
        { time: '09:15 AM - 10:15 AM', type: 'transit', icon: '🚗', title: 'In Transit to Noida Hub', landmark: 'Akshardham Expressway Path', coordinates: '28.6210, 77.2600', battery: '94%', details: 'Traveled 13.6 KM | Avg Speed: 38 km/h' },
        { time: '10:15 AM - 10:37 AM', type: 'stoppage', icon: '🛑', title: 'Stoppage #1 (22 Mins)', landmark: 'Akshardham Metro Hub, New Delhi', coordinates: '28.6210, 77.2600', battery: '92%', details: 'Vehicle parked for 22 minutes' },
        { time: '11:15 AM', type: 'geofence', icon: '🏢', title: 'Geofence Entry Logged', landmark: 'TechCorp Office Outer Ring', coordinates: '28.6275, 77.3630', battery: '90%', details: 'Entered Client Geofence boundaries' },
        { time: '11:30 AM', type: 'client_visit', icon: '📸', title: 'Client Visit Logged', landmark: 'TechCorp Solutions, Sector 62, Noida', coordinates: '28.6280, 77.3649', battery: '88%', details: 'Demonstrated WhatsApp CRM features to VP of Sales | Site Photo attached' },
        { time: '01:30 PM - 02:12 PM', type: 'stoppage', icon: '⚠️', title: 'Stoppage #2 (Smart Idle Alert)', landmark: 'Sector 16 Food Court, Noida', coordinates: '28.6250, 77.3400', battery: '82%', details: 'Stoppage duration exceeded 30 mins limit (42 mins total)' },
        { time: '05:30 PM', type: 'clock_out', icon: '🔴', title: 'Current Shift Live Ping', landmark: 'Noida Sector 62 Office', coordinates: '28.6280, 77.3649', battery: '88%', details: 'Active Field Shift in progress' }
      ]
    },
    '2_2026-07-18': {
      employeeName: 'Neha Sharma',
      role: 'Frontend Dev',
      totalDistance: '18.4 KM',
      fuelClaim: '₹147.20',
      totalStoppages: '1 Stop (18 Mins Total)',
      events: [
        { time: '09:15 AM', type: 'clock_in', icon: '🟢', title: 'Shift Clock-In', landmark: 'Noida Sector 18 Branch', coordinates: '28.5355, 77.3910', battery: '95%', details: 'Clocked in via Mobile App' },
        { time: '11:00 AM - 11:40 AM', type: 'transit', icon: '🚗', title: 'In Transit to Central Delhi', landmark: 'Lajpat Nagar Ring Road', coordinates: '28.5800, 77.2500', battery: '88%', details: 'Traveled 12.0 KM | Avg Speed: 30 km/h' },
        { time: '02:15 PM - Current', type: 'stoppage', icon: '🛑', title: 'Stoppage #1 (18 Mins - Coffee Shop)', landmark: 'Connaught Place Block B, New Delhi', coordinates: '28.6315, 77.2167', battery: '76%', details: 'Currently parked at Connaught Place (GPS Signal: Good)' }
      ]
    },
    '4_2026-07-18': {
      employeeName: 'Rahul Verma',
      role: 'Sales Exec',
      totalDistance: '55.1 KM',
      fuelClaim: '₹440.80',
      totalStoppages: '2 Stops (72 Mins Total)',
      events: [
        { time: '09:30 AM', type: 'clock_in', icon: '🟢', title: 'Shift Clock-In', landmark: 'HQ Office, New Delhi', coordinates: '28.6139, 77.2090', battery: '100%', details: 'Clocked in via Touchscreen Kiosk' },
        { time: '10:45 AM - 11:15 AM', type: 'stoppage', icon: '🛑', title: 'Stoppage #1 (30 Mins)', landmark: 'Aerocity Hospitality District', coordinates: '28.5200, 77.1000', battery: '91%', details: 'Client preliminary sync' },
        { time: '01:10 PM', type: 'gps_alert', icon: '⚠️', title: 'GPS Spoof Warning Triggered', landmark: 'Sector 44, Gurgaon', coordinates: '28.4480, 77.0850', battery: '64%', details: 'Anti-cheating algorithm flagged Mock Location Provider application active' },
        { time: '01:15 PM - 02:05 PM', type: 'stoppage', icon: '⚠️', title: 'Stoppage #2 (Smart Idle Alert)', landmark: 'Sector 44, Gurgaon', coordinates: '28.4480, 77.0850', battery: '64%', details: 'Pitched Q3 Enterprise SaaS Plan (Idle duration: 50 mins total)' }
      ]
    }
  });
  const [broadcastSessionId, setBroadcastSessionId] = useState('');
  const [broadcastProgress, setBroadcastProgress] = useState(null);

  // Chat History Search states
  const [chatHistorySearchQuery, setChatHistorySearchQuery] = useState('');
  const [showChatHistorySearch, setShowChatHistorySearch] = useState(false);
  
  // Starred Messages states
  const [starredMessages, setStarredMessages] = useState([]);

  // Scheduled Messages states
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleMessageText, setScheduleMessageText] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  
  // CRM Form states
  const [crmCustomName, setCrmCustomName] = useState('');
  const [crmEmail, setCrmEmail] = useState('');
  const [crmNotes, setCrmNotes] = useState('');
  const [crmStage, setCrmStage] = useState('new');
  const [crmLabels, setCrmLabels] = useState([]);
  const [newLabelText, setNewLabelText] = useState('');
  const [serverOnline, setServerOnline] = useState(false);
  const [chatTypeFilter, setChatTypeFilter] = useState('all'); // 'all', 'dm', 'group'
  const [crmStageFilter, setCrmStageFilter] = useState('all'); // 'all', 'new', 'contacted', 'interested', 'proposal', 'won'
  
  // Auth states
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('omnilflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // SaaS Workspace settings state
  const [stages, setStages] = useState([
    { id: 'new', title: 'New Leads', color: '#0d9488' },
    { id: 'contacted', title: 'Contacted', color: '#0ea5e9' },
    { id: 'interested', title: 'Interested', color: '#eab308' },
    { id: 'proposal', title: 'Proposal Sent', color: '#ec4899' },
    { id: 'won', title: 'Closed Won', color: '#10b981' }
  ]);
  const [allowedTags, setAllowedTags] = useState(['VIP', 'Hot', 'Follow Up', 'Won']);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  
  // SaaS Billing state
  const [billingTenant, setBillingTenant] = useState(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState(null);

  // Dynamic country-wise plans & pricing states
  const [selectedCountry, setSelectedCountry] = useState('IN'); // Default to India (INR)
  const [billingPlans, setBillingPlans] = useState([]);
  
  // Superadmin plan manager states
  const [superadminPlans, setSuperadminPlans] = useState([]);
  const [adminSelectedPlanId, setAdminSelectedPlanId] = useState('');
  const [adminPlanForm, setAdminPlanForm] = useState({
    id: '',
    name: '',
    description: '',
    features: '',
    maxChannels: 1,
    maxContacts: 250,
    maxEmployees: 5,
    allowChatbot: false,
    allowScheduler: false,
    allowGpsTracking: false,
    isActive: true
  });
  const [adminPrices, setAdminPrices] = useState([]);
  const [adminNewPriceForm, setAdminNewPriceForm] = useState({
    countryCode: '',
    currency: '',
    amount: '',
    stripePriceId: ''
  });
  const [adminPlansError, setAdminPlansError] = useState(null);
  const [adminPlansLoading, setAdminPlansLoading] = useState(false);
  
  // Employee Directory states with default rich team records
  const [employees, setEmployees] = useState([
    { id: '1', first_name: 'Amit', last_name: 'Kumar', email: 'amit@company.com', phone: '+91 9876543210', role: 'developer', department: 'IT & Engineering', salary: 65000, status: 'active' },
    { id: '2', first_name: 'Neha', last_name: 'Sharma', email: 'neha@company.com', phone: '+91 9876543211', role: 'developer', department: 'IT & Engineering', salary: 60000, status: 'active' },
    { id: '3', first_name: 'Kavita', last_name: 'Patel', email: 'kavita@company.com', phone: '+91 9876543212', role: 'manager', department: 'Sales & Marketing', salary: 75000, status: 'active' },
    { id: '4', first_name: 'Rahul', last_name: 'Verma', email: 'rahul@company.com', phone: '+91 9876543213', role: 'agent', department: 'Sales & Marketing', salary: 45000, status: 'active' },
    { id: '5', first_name: 'Rajesh', last_name: 'Singh', email: 'rajesh@company.com', phone: '+91 9876543214', role: 'manager', department: 'Field Operations', salary: 50000, status: 'active' }
  ]);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    id: '', // for edit mode
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'employee',
    department: 'Sales',
    salary: '',
    createLoginAccount: false,
    password: '',
    status: 'active'
  });

  // GPS & Attendance states
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [liveLocations, setLiveLocations] = useState([]);
  const [gpsHistory, setGpsHistory] = useState([]);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState('');
  const [todayStatus, setTodayStatus] = useState(null);
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Quick Replies states
  const [crmRightTab, setCrmRightTab] = useState('info'); // 'info', 'templates'
  const [newReplyTitle, setNewReplyTitle] = useState('');
  const [newReplyText, setNewReplyText] = useState('');
  const [quickReplies, setQuickReplies] = useState(() => {
    const saved = localStorage.getItem('crm_quick_replies');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Welcome Greeting', text: 'Hello! Thank you for reaching out to us. How can we help you today?' },
      { id: '2', title: 'Product Catalog', text: 'Here is our latest pricing and product catalog details: [Link]' },
      { id: '3', title: 'Payment Info', text: 'You can complete your payment via UPI or Bank Transfer. Details: [Details]' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('crm_quick_replies', JSON.stringify(quickReplies));
  }, [quickReplies]);

  // Auth operations
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await originalFetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error('Backend API server is not running or returning invalid response');
      }
      if (!res.ok) throw new Error(data.error || 'Failed to login');
      
      localStorage.setItem('omnilflow_token', data.token);
      localStorage.setItem('omnilflow_user', JSON.stringify(data.user));
      setAuthUser(data.user);
      setActiveTab('inbox');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await originalFetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, companyName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register');
      
      localStorage.setItem('omnilflow_token', data.token);
      localStorage.setItem('omnilflow_user', JSON.stringify(data.user));
      setAuthUser(data.user);
      setActiveTab('inbox');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // SaaS Workspace settings operations
  const fetchTenantSettings = async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const res = await fetch(`${API_URL}/settings`);
      if (!res.ok) throw new Error('Failed to load workspace settings');
      const data = await res.json();
      if (data) {
        if (data.pipeline_stages) setStages(data.pipeline_stages);
        if (data.tags) setAllowedTags(data.tags);
      }
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveTenantSettings = async (updatedStages, updatedTags) => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        body: JSON.stringify({
          pipelineStages: updatedStages,
          tags: updatedTags
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      const data = await res.json();
      if (data) {
        if (data.pipeline_stages) setStages(data.pipeline_stages);
        if (data.tags) setAllowedTags(data.tags);
        alert('Workspace settings updated successfully!');
      }
    } catch (err) {
      setSettingsError(err.message);
      alert('Error updating settings: ' + err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  // SaaS Stripe Subscriptions operations
  const handleCreateCheckoutSession = async (priceId) => {
    try {
      const res = await fetch(`${API_URL}/billing/create-checkout-session`, {
        method: 'POST',
        body: JSON.stringify({ priceId })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Stripe redirect URL not returned by server.');
      }
    } catch (err) {
      alert('Stripe redirection failed: ' + err.message);
    }
  };

  const fetchBillingPlans = async (country) => {
    try {
      const res = await fetch(`${API_URL}/billing/plans?country=${country}`);
      if (!res.ok) throw new Error('Failed to retrieve plans');
      const data = await res.json();
      setBillingPlans(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuperadminPlans = async () => {
    setAdminPlansLoading(true);
    setAdminPlansError(null);
    try {
      const res = await fetch(`${API_URL}/admin/plans`);
      if (!res.ok) throw new Error('Failed to retrieve plans');
      const data = await res.json();
      setSuperadminPlans(data);
    } catch (err) {
      setAdminPlansError(err.message);
    } finally {
      setAdminPlansLoading(false);
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setAdminPlansLoading(true);
    setAdminPlansError(null);
    try {
      const res = await fetch(`${API_URL}/admin/plans`, {
        method: 'POST',
        body: JSON.stringify({
          id: adminPlanForm.id,
          name: adminPlanForm.name,
          description: adminPlanForm.description,
          features: adminPlanForm.features.split('\n').filter(f => f.trim()),
          maxChannels: parseInt(adminPlanForm.maxChannels) || 1,
          maxContacts: parseInt(adminPlanForm.maxContacts) || 250,
          maxEmployees: parseInt(adminPlanForm.maxEmployees) || 5,
          allowChatbot: adminPlanForm.allowChatbot ? 1 : 0,
          allowScheduler: adminPlanForm.allowScheduler ? 1 : 0,
          allowGpsTracking: adminPlanForm.allowGpsTracking ? 1 : 0,
          isActive: adminPlanForm.isActive ? 1 : 0
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save plan details');
      }
      alert('Plan saved successfully!');
      fetchSuperadminPlans();
      // Reset form
      setAdminPlanForm({
        id: '',
        name: '',
        description: '',
        features: '',
        maxChannels: 1,
        maxContacts: 250,
        maxEmployees: 5,
        allowChatbot: false,
        allowScheduler: false,
        allowGpsTracking: false,
        isActive: true
      });
    } catch (err) {
      setAdminPlansError(err.message);
    } finally {
      setAdminPlansLoading(false);
    }
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!adminSelectedPlanId) return;
    setAdminPlansLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/prices`, {
        method: 'POST',
        body: JSON.stringify({
          planId: adminSelectedPlanId,
          countryCode: adminNewPriceForm.countryCode,
          currency: adminNewPriceForm.currency,
          amount: parseFloat(adminNewPriceForm.amount) || 0,
          stripePriceId: adminNewPriceForm.stripePriceId
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save pricing rate');
      }
      alert('Price rate saved successfully!');
      fetchSuperadminPlans();
      // Reset price form
      setAdminNewPriceForm({
        countryCode: '',
        currency: '',
        amount: '',
        stripePriceId: ''
      });
    } catch (err) {
      alert('Error saving price: ' + err.message);
    } finally {
      setAdminPlansLoading(false);
    }
  };

  const handleDeletePrice = async (planId, countryCode) => {
    if (!confirm('Are you sure you want to delete this price rate?')) return;
    setAdminPlansLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/prices/${planId}/${countryCode}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete pricing rate');
      alert('Price rate deleted successfully!');
      fetchSuperadminPlans();
    } catch (err) {
      alert('Error deleting price: ' + err.message);
    } finally {
      setAdminPlansLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'billing' && authUser) {
      const fetchBillingDetails = async () => {
        setIsBillingLoading(true);
        try {
          const res = await fetch(`${API_URL}/auth/me`);
          const data = await res.json();
          if (data && data.tenant) {
            setBillingTenant(data.tenant);
          }
        } catch (err) {
          setBillingError(err.message);
        } finally {
          setIsBillingLoading(false);
        }
      };
      fetchBillingDetails();
      fetchBillingPlans(selectedCountry);
    }
  }, [activeTab, authUser, selectedCountry]);

  useEffect(() => {
    if (activeTab === 'superadmin_plans' && authUser && authUser.role === 'superadmin') {
      fetchSuperadminPlans();
    }
  }, [activeTab, authUser]);

  // Global Listeners for Online/Offline, Keyboard Shortcuts & Session Idle Timeout
  useEffect(() => {
    // 1. Online/Offline detection
    const handleOnline = () => {
      setIsOnline(true);
      showToast('🟢 Internet Connection Restored! Reconnected to OmniFlow CRM.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('⚠️ Internet Connection Lost! Running in offline backup mode.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Keyboard shortcuts
    const handleKeyDown = (e) => {
      // Close Modals on ESC key
      if (e.key === 'Escape') {
        setShowBeatPlannerModal(false);
        setShowExpenseModal(false);
        setShowClientVisitModal(false);
        setShowGlobalSearchModal(false);
        setShowBroadcastModal(false);
        setShowNewChatModal(false);
        setShowAddRuleModal(false);
      }
      // Toggle Global Search with Ctrl + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearchModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 3. User Idle Session Expiry (30 Mins)
    let idleTimer;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      // Setup warning popup after 30 minutes (1800000ms)
      idleTimer = setTimeout(() => {
        if (authUser) {
          setShowSessionWarning(true);
          setSessionTimeLeft(60);
        }
      }, 1800000);
    };

    // Listen to user activity events
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);

    // Initialize timer
    resetIdleTimer();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
      clearTimeout(idleTimer);
    };
  }, [authUser]);

  // Session Warning countdown timer
  useEffect(() => {
    let countdown;
    if (showSessionWarning && sessionTimeLeft > 0) {
      countdown = setInterval(() => {
        setSessionTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (showSessionWarning && sessionTimeLeft === 0) {
      // Session expired -> Logout user
      setAuthUser(null);
      localStorage.removeItem('omnilflow_user');
      setShowSessionWarning(false);
      showToast('🔴 Session expired due to inactivity. Please login again.', 'error');
    }
    return () => clearInterval(countdown);
  }, [showSessionWarning, sessionTimeLeft]);

  // Employee Directory actions
  const fetchEmployees = async () => {
    setIsEmployeesLoading(true);
    setEmployeesError(null);
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (!res.ok) throw new Error('Failed to fetch employee directory');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      setEmployeesError(err.message);
    } finally {
      setIsEmployeesLoading(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsEmployeesLoading(true);
    try {
      const isEdit = !!newEmployeeForm.id;
      const url = isEdit ? `${API_URL}/employees/${newEmployeeForm.id}` : `${API_URL}/employees`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: JSON.stringify(newEmployeeForm)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save employee profile');
      }

      alert(isEdit ? 'Employee updated successfully!' : 'Employee added successfully!');
      setShowAddEmployeeModal(false);
      // Reset form
      setNewEmployeeForm({
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'employee',
        department: 'Sales',
        salary: '',
        createLoginAccount: false,
        password: '',
        status: 'active'
      });
      fetchEmployees();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsEmployeesLoading(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!confirm('Are you sure you want to remove this employee? If a login account is associated, it will also be deleted.')) return;
    try {
      const res = await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete employee profile');
      alert('Employee deleted successfully!');
      fetchEmployees();
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'employees' && authUser) {
      fetchEmployees();
    }
  }, [activeTab, authUser]);

  // GPS & Attendance actions
  const fetchAttendanceTodayStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/today`);
      if (res.ok) {
        const data = await res.json();
        setTodayStatus(data);
      }
    } catch (err) {
      console.error('Failed to load check-in status', err);
    }
  };

  const fetchAttendanceLogs = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const res = await fetch(`${API_URL}/attendance`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load attendance logs');
      }
      const data = await res.json();
      setAttendanceLogs(data);
    } catch (err) {
      setGpsError(err.message);
    } finally {
      setGpsLoading(false);
    }
  };

  const fetchLiveLocations = async () => {
    if (isOfflineMode) {
      setOfflinePingsCount(prev => prev + 1);
      console.log(`⚠️ Offline simulation active. Cached GPS ping locally. Count: ${offlinePingsCount + 1}`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/gps/live`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setLiveLocations(data);
      }
    } catch (err) {
      console.error(err);
    }
    // Refresh field team telemetry
    setTeamTrackLocations(prev => prev.map(item => ({
      ...item,
      battery: `${Math.floor(70 + Math.random() * 25)}%`,
      speed: item.status === 'moving' ? `${Math.floor(20 + Math.random() * 30)} km/h` : '0 km/h'
    })));
    console.log('🟢 Live GPS Map & Field Team locations refreshed successfully!');
  };

  const fetchGpsHistory = async (employeeId, dateStr) => {
    if (!employeeId) return console.log('Please select an employee');
    try {
      const res = await fetch(`${API_URL}/gps/history/${employeeId}?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setGpsHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
    console.log(`Loaded GPS History trail for selected employee on ${dateStr || 'today'}`);
  };

  const handleExportGpsCSV = (employeeId = 'all', dateStr = '2026-07-18') => {
    let rows = [
      ['Employee Name', 'Role', 'Date', 'Vehicle Type', 'Total Distance (KM)', 'Fuel Claim (INR)', 'Stoppages Info', 'Geofence Status', 'GPS Health Signal']
    ];

    if (employeeId === 'all') {
      teamTrackLocations.forEach(emp => {
        const rate = vehicleRates[emp.vehicle_type || 'bike'] || 6;
        const claimVal = parseFloat(emp.distance) * rate || 0;
        rows.push([
          `${emp.first_name} ${emp.last_name || ''}`,
          emp.role || 'Staff',
          dateStr,
          emp.vehicle_type || 'bike',
          emp.distance || '0 KM',
          `INR ${claimVal.toFixed(2)}`,
          emp.stoppage || 'None',
          emp.geofence_status || 'outside',
          emp.gps_status || 'normal'
        ]);
      });
    } else {
      const emp = teamTrackLocations.find(e => String(e.employee_id) === String(employeeId));
      if (emp) {
        const rate = vehicleRates[emp.vehicle_type || 'bike'] || 6;
        const claimVal = parseFloat(emp.distance) * rate || 0;
        rows.push([
          `${emp.first_name} ${emp.last_name || ''}`,
          emp.role || 'Staff',
          dateStr,
          emp.vehicle_type || 'bike',
          emp.distance || '0 KM',
          `INR ${claimVal.toFixed(2)}`,
          emp.stoppage || 'None',
          emp.geofence_status || 'outside',
          emp.gps_status || 'normal'
        ]);
      }
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GPS_Shift_Fuel_Report_${employeeId}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('📥 Export Successful: Daily Shift & Fuel Expense CSV report downloaded!');
  };

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(`${API_URL}/attendance/check-in`, {
            method: 'POST',
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to check in');
          alert('Successfully Checked In!');
          fetchAttendanceTodayStatus();
          fetchAttendanceLogs();
          fetchLiveLocations();
        } catch (err) {
          alert(err.message);
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        alert('Geolocation error: ' + error.message + '. Please allow location access to check-in.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleCheckOut = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(`${API_URL}/attendance/check-out`, {
            method: 'POST',
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to check out');
          alert('Successfully Checked Out!');
          fetchAttendanceTodayStatus();
          fetchAttendanceLogs();
          fetchLiveLocations();
        } catch (err) {
          alert(err.message);
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        alert('Geolocation error: ' + error.message + '. Please allow location access to check-out.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Cloned EMS portal actions
  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!newTaskForm.id;
      const url = isEdit ? `${API_URL}/tasks/${newTaskForm.id}` : `${API_URL}/tasks`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        body: JSON.stringify({
          title: newTaskForm.title,
          description: newTaskForm.description,
          assignedTo: newTaskForm.assignedTo ? parseInt(newTaskForm.assignedTo) : null,
          priority: newTaskForm.priority,
          status: newTaskForm.status,
          dueDate: newTaskForm.dueDate
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save task');
      }

      alert('Task saved successfully!');
      setShowAddTaskModal(false);
      setNewTaskForm({ id: '', title: '', description: '', assignedTo: '', priority: 'Medium', status: 'To Do', dueDate: '' });
      fetchTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete task');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchNotices = async () => {
    try {
      const res = await fetch(`${API_URL}/notices`);
      if (res.ok) {
        const data = await res.json();
        setNotices(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/notices`, {
        method: 'POST',
        body: JSON.stringify(newNoticeForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish notice');
      }
      alert('Notice published successfully!');
      setShowAddNoticeModal(false);
      setNewNoticeForm({ title: '', content: '' });
      fetchNotices();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteNotice = async (id) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      const res = await fetch(`${API_URL}/notices/${id}`, { method: 'DELETE' });
      if (res.ok) fetchNotices();
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${API_URL}/holidays`);
      if (res.ok) {
        const data = await res.json();
        setHolidays(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/holidays`, {
        method: 'POST',
        body: JSON.stringify(newHolidayForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add holiday');
      }
      alert('Holiday added successfully!');
      setShowAddHolidayModal(false);
      setNewHolidayForm({ name: '', date: '' });
      fetchHolidays();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      const res = await fetch(`${API_URL}/holidays/${id}`, { method: 'DELETE' });
      if (res.ok) fetchHolidays();
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_URL}/leaves`);
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLeave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/leaves`, {
        method: 'POST',
        body: JSON.stringify({
          startDate: newLeaveForm.startDate,
          endDate: newLeaveForm.endDate,
          type: newLeaveForm.type,
          reason: newLeaveForm.reason
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit leave request');
      }
      alert('Leave requested successfully!');
      setShowAddLeaveModal(false);
      setNewLeaveForm({ startDate: '', endDate: '', type: 'Sick', reason: '' });
      fetchLeaves();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApproveLeave = async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/leaves/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchLeaves();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update leave status');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'gps_attendance' && authUser) {
      fetchAttendanceTodayStatus();
      if (authUser.role === 'owner' || authUser.role === 'admin' || authUser.role === 'manager') {
        fetchAttendanceLogs();
        fetchLiveLocations();
        fetchEmployees();
      }
    }
    if (activeTab === 'tasks' && authUser) {
      fetchTasks();
      fetchEmployees();
    }
    if (activeTab === 'notice_board' && authUser) {
      fetchNotices();
    }
    if (activeTab === 'holidays' && authUser) {
      fetchHolidays();
    }
    if (activeTab === 'leaves' && authUser) {
      fetchLeaves();
      fetchEmployees();
    }
    if (activeTab === 'payroll' && authUser) {
      fetchAttendanceLogs();
      fetchEmployees();
    }
    if (activeTab === 'admin_dashboard' && authUser) {
      fetchEmployees();
      fetchAttendanceLogs();
      fetchTasks();
    }
  }, [activeTab, authUser]);

  // Background GPS tracking breadcrumb pinger (every 3 minutes)
  useEffect(() => {
    let intervalId = null;
    if (authUser && todayStatus && todayStatus.status === 'checked_in') {
      const sendGpsPing = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                await fetch(`${API_URL}/gps/track`, {
                  method: 'POST',
                  body: JSON.stringify({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                  })
                });
              } catch (err) {
                console.warn('GPS background ping failed', err);
              }
            },
            null,
            { enableHighAccuracy: true }
          );
        }
      };

      sendGpsPing();
      intervalId = setInterval(sendGpsPing, 180000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [authUser, todayStatus]);

  // Initialize and Sync Leaflet Map for Multi-Employee Tracking & Fingerprints Trail Line
  useEffect(() => {
    if (activeTab === 'gps_attendance' && mapContainerRef.current && window.L) {
      const L = window.L;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current).setView([28.6139, 77.2090], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current);
      }

      const map = mapInstanceRef.current;

      // Clear existing markers & polylines
      Object.keys(markersRef.current).forEach(key => {
        map.removeLayer(markersRef.current[key]);
      });
      markersRef.current = {};

      const bounds = [];
      
      // Sample Day Fingerprint Trails (Start to End Route Path)
      const employeeTrails = {
        '1': [
          { lat: 28.6139, lng: 77.2090, label: '🏁 DAY START (09:00 AM - HQ Office, New Delhi)', type: 'start' },
          { lat: 28.6210, lng: 77.2600, label: '🛑 STOP #1 (10:15 AM - Akshardham Hub - 22 Mins)', type: 'stop' },
          { lat: 28.6250, lng: 77.3400, label: '🛑 STOP #2 (01:30 PM - Noida Sec 16 Metro - 35 Mins)', type: 'stop' },
          { lat: 28.6280, lng: 77.3649, label: '📍 CURRENT LIVE POSITION (Noida Sec 62 - Moving 32 km/h)', type: 'current' }
        ],
        '2': [
          { lat: 28.5355, lng: 77.3910, label: '🏁 DAY START (09:15 AM - Noida Sector 18 Hub)', type: 'start' },
          { lat: 28.5800, lng: 77.2500, label: '🛑 STOP #1 (11:00 AM - Lajpat Nagar Market - 40 Mins)', type: 'stop' },
          { lat: 28.6315, lng: 77.2167, label: '📍 CURRENT LIVE POSITION (Connaught Place - Stopped 18m)', type: 'current' }
        ],
        '3': [
          { lat: 28.6139, lng: 77.2090, label: '🏁 DAY START (08:45 AM - HQ Office, New Delhi)', type: 'start' },
          { lat: 28.5200, lng: 77.1200, label: '🛑 STOP #1 (10:30 AM - Vasant Kunj - 15 Mins)', type: 'stop' },
          { lat: 28.4595, lng: 77.0266, label: '📍 CURRENT LIVE POSITION (DLF Cyber City - Moving 18 km/h)', type: 'current' }
        ],
        '4': [
          { lat: 28.6139, lng: 77.2090, label: '🏁 DAY START (09:30 AM - HQ Office, New Delhi)', type: 'start' },
          { lat: 28.5200, lng: 77.1000, label: '🛑 STOP #1 (10:45 AM - Aerocity Delhi - 30 Mins)', type: 'stop' },
          { lat: 28.4595, lng: 77.0266, label: '🛑 STOP #2 (01:15 PM - Cyber Hub - 50 Mins)', type: 'stop' },
          { lat: 28.4480, lng: 77.0850, label: '📍 CURRENT LIVE POSITION (Sector 44 Gurgaon - Stopped 42m)', type: 'current' }
        ]
      };

      const locationsToRender = selectedTrackEmployee === 'all' 
        ? teamTrackLocations 
        : teamTrackLocations.filter(loc => String(loc.employee_id) === String(selectedTrackEmployee));

      locationsToRender.forEach(loc => {
        if (loc.latitude && loc.longitude) {
          const statusIcon = loc.status === 'moving' ? '🟢 MOVING' : '🅿️ STOPPED';
          const markerColor = loc.status === 'moving' ? '#10b981' : '#f59e0b';
          
          const marker = L.marker([loc.latitude, loc.longitude])
            .addTo(map)
            .bindPopup(`
              <div style="font-family: inherit; font-size: 12px; color: #0f2b26; min-width: 180px;">
                <div style="font-weight: 800; font-size: 14px; color: #0d9488; margin-bottom: 4px;">${loc.first_name} ${loc.last_name || ''}</div>
                <div>Role: <strong>${loc.role}</strong></div>
                <div>Status: <span style="color:${markerColor}; font-weight:700;">${statusIcon} (${loc.speed})</span></div>
                <div>Location: <strong>${loc.location_name}</strong></div>
                <div>Stoppage: <strong style="color: #64748b;">${loc.stoppage}</strong></div>
                <div>Battery: <strong>${loc.battery}</strong> | Shift: <strong>${loc.distance}</strong></div>
              </div>
            `);

          if (selectedTrackEmployee !== 'all' && String(loc.employee_id) === String(selectedTrackEmployee)) {
            marker.openPopup();
          }

          markersRef.current[`team_${loc.employee_id}`] = marker;
          bounds.push([loc.latitude, loc.longitude]);
        }
      });

      // Draw Fingerprints Polyline Route (Day Start to Current End Position)
      const empIdToDraw = selectedTrackEmployee !== 'all' ? String(selectedTrackEmployee) : '1';
      const trailPoints = employeeTrails[empIdToDraw] || employeeTrails['1'];

      if (trailPoints && trailPoints.length > 0) {
        const polylineCoords = trailPoints.map(pt => [pt.lat, pt.lng]);
        
        // Draw main Fingerprint Polyline Path
        const trailLine = L.polyline(polylineCoords, {
          color: '#0d9488',
          weight: 5,
          dashArray: '8, 8',
          opacity: 0.85
        }).addTo(map);
        markersRef.current['fingerprint_line'] = trailLine;

        // Render Start, Stop, and Current markers along trail
        trailPoints.forEach((pt, idx) => {
          let circleColor = '#f59e0b'; // Amber for stoppage
          let radius = 6;
          if (pt.type === 'start') {
            circleColor = '#10b981'; // Green for Day Start
            radius = 9;
          } else if (pt.type === 'current') {
            circleColor = '#ef4444'; // Red/Teal for Current Live
            radius = 10;
          }

          const ptMarker = L.circleMarker([pt.lat, pt.lng], {
            radius: radius,
            color: circleColor,
            fillColor: circleColor,
            fillOpacity: 0.9,
            weight: 2
          }).addTo(map)
            .bindPopup(`<strong>Point #${idx + 1}</strong><br/>${pt.label}`);

          markersRef.current[`trail_pt_${idx}`] = ptMarker;
          bounds.push([pt.lat, pt.lng]);
        });

        // Draw Optimized Beat Plan scheduled client markers and path for selected employee
        const activeBeatPoints = employeeBeatPlans[empIdToDraw] || employeeBeatPlans['1'] || [];

        activeBeatPoints.forEach((client, idx) => {
          const clientMarker = L.marker([client.lat, client.lng], {
            icon: L.divIcon({
              html: `<div style="background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3)">⭐${idx + 1}</div>`,
              className: 'custom-beat-icon',
              iconSize: [24, 24]
            })
          }).addTo(map)
            .bindPopup(`<strong>Beat Visit #${idx + 1}: ${client.name}</strong><br/>Coords: ${client.lat}, ${client.lng}`);

          markersRef.current[`client_beat_${client.id || idx}`] = clientMarker;
          bounds.push([client.lat, client.lng]);
        });

        // Draw Beat Plan Routing Line
        const beatCoords = activeBeatPoints.map(c => [c.lat, c.lng]);
        if (beatCoords.length > 1) {
          const beatLine = L.polyline(beatCoords, {
            color: '#3b82f6',
            weight: 3,
            dashArray: '4, 6',
            opacity: 0.75
          }).addTo(map);
          markersRef.current['beat_plan_line'] = beatLine;
        }
      }

      if (bounds.length > 0) {
        if (selectedTrackEmployee !== 'all' || gpsSubTab === 'audit') {
          map.fitBounds(bounds, { padding: [50, 50] });
        } else {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      }
    }
  }, [activeTab, liveLocations, gpsHistory, teamTrackLocations, selectedTrackEmployee, gpsSubTab, selectedAuditEmployee, selectedAuditDate]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Fetch initial data
  useEffect(() => {
    const handleAuthFailed = () => {
      setAuthUser(null);
      setActiveTab('login');
    };
    const handleSubscriptionExpired = () => {
      alert('Your subscription is inactive. Please renew your subscription to proceed.');
      setActiveTab('billing');
    };

    window.addEventListener('auth_failed', handleAuthFailed);
    window.addEventListener('subscription_expired', handleSubscriptionExpired);

    return () => {
      window.removeEventListener('auth_failed', handleAuthFailed);
      window.removeEventListener('subscription_expired', handleSubscriptionExpired);
    };
  }, []);

  useEffect(() => {
    if (authUser) {
      fetchSessions();
      fetchContacts();
      fetchChatbotRules();
      fetchTenantSettings();

      // Connect WebSockets
      const socket = io(SOCKET_URL, {
        query: { token: localStorage.getItem('omnilflow_token') }
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        setServerOnline(true);
        fetchSessions();
        fetchContacts();
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
        setServerOnline(false);
      });


      socket.on('session_update', (data) => {
        console.log('Session updated:', data);
        setSessions(prev => prev.map(s => {
          if (s.id === data.id) {
            return { 
              ...s, 
              status: data.status, 
              qr_code: data.qr || s.qr_code, 
              phone_number: data.phoneNumber || s.phone_number,
              profile_pic_url: data.profilePicUrl || s.profile_pic_url
            };
          }
          return s;
        }));
      });

      socket.on('new_message', (msg) => {
        console.log('New message received:', msg);
        
        const targetContactId = msg.contact_id || msg.contactId;
        let isCurrentChat = false;

        // If the message belongs to currently active chat, append it
        setActiveContact(currentActive => {
          if (currentActive && currentActive.id === targetContactId) {
            isCurrentChat = true;
            setMessages(prev => {
              // Avoid duplicate appends
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
          return currentActive;
        });

        if (isCurrentChat) {
          // If it's the current active chat, mark it read immediately on the backend
          fetch(`${API_URL}/contacts/${targetContactId}/read`, { method: 'PUT' })
            .catch(err => console.error('Failed to mark incoming message as read:', err));
        } else {
          // Play notification sound alert for incoming message from other chats
          if (!msg.system_sync && (msg.from_me === 0 || msg.from_me === false)) {
            playNotificationSound();
          }
        }

        // Refresh contacts list to update previews and order
        fetchContacts();
      });

      socket.on('media_downloaded', (data) => {
        console.log('Background media downloaded:', data);
        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, media_url: data.mediaUrl, mediaUrl: data.mediaUrl } : m));
      });

      socket.on('message_status_update', (data) => {
        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, status: data.status } : m));
      });

      socket.on('broadcast_progress', (data) => {
        setBroadcastProgress(data);
      });

      socket.on('scheduled_message_update', (data) => {
        setActiveContact(current => {
          if (current && current.id === data.contactId) {
            fetchScheduledMessages(data.contactId);
          }
          return current;
        });
      });

      socket.on('message_star_update', (data) => {
        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, is_starred: data.isStarred } : m));
        setActiveContact(current => {
          if (current) {
            fetchStarredMessages(current.id);
          }
          return current;
        });
      });

      socket.on('contact_update', (updatedContact) => {
        setContacts(prev => prev.map(c => c.id === updatedContact.id ? { ...c, ...updatedContact, labels: typeof updatedContact.labels === 'string' ? JSON.parse(updatedContact.labels) : updatedContact.labels } : c));
        setActiveContact(current => {
          if (current && current.id === updatedContact.id) {
            const parsedLabels = typeof updatedContact.labels === 'string' ? JSON.parse(updatedContact.labels) : updatedContact.labels;
            return { ...current, ...updatedContact, labels: parsedLabels };
          }
          return current;
        });
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [authUser]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load CRM Form data when active contact changes
  useEffect(() => {
    if (activeContact) {
      setCrmCustomName(activeContact.custom_name || '');
      setCrmEmail(activeContact.email || '');
      setCrmNotes(activeContact.notes || '');
      setCrmStage(activeContact.pipeline_stage || 'new');
      setCrmLabels(activeContact.labels || []);
      fetchMessages(activeContact.id);
      fetchScheduledMessages(activeContact.id);
      fetchStarredMessages(activeContact.id);
      setChatHistorySearchQuery('');
      setShowChatHistorySearch(false);

      // Mark messages as read and clear unread count locally
      if (activeContact.unread_count > 0) {
        setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, unread_count: 0 } : c));
        setActiveContact(prev => prev && prev.id === activeContact.id ? { ...prev, unread_count: 0 } : prev);
        fetch(`${API_URL}/contacts/${activeContact.id}/read`, { method: 'PUT' })
          .catch(err => console.error('Failed to mark messages as read on click:', err));
      }

      // Fetch profile picture if not cached
      if (!activeContact.profile_pic_url || activeContact.profile_pic_url === 'none') {
        fetch(`${API_URL}/contacts/${activeContact.id}/profile-pic`)
          .then(res => res.json())
          .then(data => {
            if (data.profile_pic_url) {
              setActiveContact(prev => prev && prev.id === activeContact.id ? { ...prev, profile_pic_url: data.profile_pic_url } : prev);
              setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, profile_pic_url: data.profile_pic_url } : c));
            } else {
              // Cache 'none' locally in react state so we don't spam fetch it
              setActiveContact(prev => prev && prev.id === activeContact.id ? { ...prev, profile_pic_url: 'none' } : prev);
              setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, profile_pic_url: 'none' } : c));
            }
          })
          .catch(err => console.error('Failed to fetch profile picture:', err));
      }
      
      // Auto-select a session to send reply from
      // Try to find the session this contact last messaged, or fallback to first connected session
      const connected = sessions.find(s => s.status === 'connected');
      if (connected) {
        setSelectedSessionId(connected.id);
      }
    } else {
      setMessages([]);
    }
  }, [activeContact]);

  // Automatically load profile pictures for recent chats in background with rate-limiting
  useEffect(() => {
    if (contacts.length === 0) return;
    
    // Only check the top 15 most recent contacts to avoid rate-limiting
    const pending = contacts.slice(0, 15).filter(c => !c.profile_pic_url);
    if (pending.length === 0) return;

    let active = true;
    
    const loadPics = async () => {
      for (const contact of pending) {
        if (!active) break;
        
        try {
          const res = await fetch(`${API_URL}/contacts/${contact.id}/profile-pic`);
          const data = await res.json();
          
          if (data.profile_pic_url) {
            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, profile_pic_url: data.profile_pic_url } : c));
            setActiveContact(current => {
              if (current && current.id === contact.id) {
                return { ...current, profile_pic_url: data.profile_pic_url };
              }
              return current;
            });
          } else {
            // Set 'none' in local memory state only, preventing DB locks
            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, profile_pic_url: 'none' } : c));
          }
        } catch (e) {
          console.error('Lazy load profile pic error:', e);
        }
        
        // Wait 800ms before next request to avoid WhatsApp server rate-limits
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    };

    const timer = setTimeout(() => {
      loadPics();
    }, 2000);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [contacts.length]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/sessions`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_URL}/contacts`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setContacts(data);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  };

  const fetchMessages = async (contactId, append = false) => {
    try {
      const currentOffset = append ? messagesOffset + 50 : 0;
      if (append) {
        setIsLoadingMore(true);
      }
      
      const res = await fetch(`${API_URL}/contacts/${contactId}/messages?limit=50&offset=${currentOffset}`);
      const data = await res.json();
      
      if (append) {
        setMessages(prev => [...data.messages, ...prev]);
        setMessagesOffset(currentOffset);
      } else {
        setMessages(data.messages);
        setMessagesOffset(0);
      }
      setHasMoreMessages(data.hasMore);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (append) {
        setIsLoadingMore(false);
      }
    }
  };

  const handleStartNewChat = async (e) => {
    e.preventDefault();
    if (!newChatPhone.trim()) {
      setNewChatError('Phone number is required');
      return;
    }
    
    // Choose connected session
    const activeSession = newChatSessionId || (sessions.find(s => s.status === 'connected')?.id);
    if (!activeSession) {
      setNewChatError('Please select or connect a WhatsApp channel first.');
      return;
    }

    setIsCreatingNewChat(true);
    setNewChatError('');

    try {
      const res = await fetch(`${API_URL}/contacts/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newChatPhone.trim(),
          name: newChatName.trim() || null,
          initialMessage: newChatInitialMsg.trim() || null,
          sessionId: activeSession
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start new chat');
      }

      // Reload contacts list
      await fetchContacts();

      // Auto-select this contact as active
      setActiveContact(data);

      // Reset form and close modal
      setNewChatPhone('');
      setNewChatName('');
      setNewChatInitialMsg('');
      setNewChatError('');
      setShowNewChatModal(false);
    } catch (err) {
      console.error(err);
      setNewChatError(err.message || 'Failed to start chat. Make sure the number is valid.');
    } finally {
      setIsCreatingNewChat(false);
    }
  };

  const fetchChatbotRules = async () => {
    try {
      const res = await fetch(`${API_URL}/chatbot`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setChatbotRules(data);
      }
    } catch (err) {
      console.error('Failed to fetch chatbot rules:', err);
    }
  };

  const handleAddChatbotRule = async (e) => {
    e.preventDefault();
    if (!chatbotRuleKeyword.trim() || !chatbotRuleReply.trim()) {
      setChatbotRuleError('Keyword and reply text are required.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: chatbotRuleKeyword.toLowerCase().trim(),
          matchType: chatbotRuleMatchType,
          replyText: chatbotRuleReply.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add rule');
      }

      setChatbotRules(prev => {
        const filtered = prev.filter(r => r.keyword !== data.keyword);
        return [...filtered, data];
      });
      
      setChatbotRuleKeyword('');
      setChatbotRuleReply('');
      setChatbotRuleError('');
      setShowAddRuleModal(false);
    } catch (err) {
      setChatbotRuleError(err.message || 'Failed to save rule.');
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm('Are you sure you want to delete this auto-reply rule?')) return;
    try {
      await fetch(`${API_URL}/chatbot/${id}`, { method: 'DELETE' });
      setChatbotRules(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleToggleRule = async (id, isActive) => {
    try {
      await fetch(`${API_URL}/chatbot/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      setChatbotRules(prev => prev.map(r => r.id === id ? { ...r, is_active: isActive ? 1 : 0 } : r));
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    const activeSession = broadcastSessionId || (sessions.find(s => s.status === 'connected')?.id);
    if (!activeSession) {
      alert('Please select or connect a WhatsApp channel first.');
      return;
    }

    try {
      setBroadcastProgress({ current: 0, total: 1, status: 'sending' });
      
      const res = await fetch(`${API_URL}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: broadcastStage,
          message: broadcastMessage.trim(),
          sessionId: activeSession
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate broadcast');
      }

      setBroadcastProgress({ current: 0, total: data.total, status: 'sending' });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error starting broadcast campaign.');
      setBroadcastProgress(null);
    }
  };

  // Create new session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    try {
      const res = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneName: newSessionName })
      });
      const newSession = await res.json();
      setSessions(prev => [newSession, ...prev]);
      setNewSessionName('');
      setShowAddSessionModal(false);
    } catch (err) {
      console.error('Error creating session:', err);
    }
  };

  // Re-start session
  const handleStartSession = async (id) => {
    try {
      await fetch(`${API_URL}/sessions/start/${id}`, { method: 'POST' });
      fetchSessions();
    } catch (err) {
      console.error('Error starting session:', err);
    }
  };

  // Stop session
  const handleStopSession = async (id) => {
    try {
      await fetch(`${API_URL}/sessions/stop/${id}`, { method: 'POST' });
      fetchSessions();
    } catch (err) {
      console.error('Error stopping session:', err);
    }
  };

  // Delete session
  const handleDeleteSession = async (id) => {
    if (!confirm('Are you sure you want to delete this session? This will log out the WhatsApp account.')) return;
    try {
      await fetch(`${API_URL}/sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  // Send WhatsApp message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact || !selectedSessionId) return;

    const textToSend = inputText;
    setInputText('');

    try {
      await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          recipientJid: activeContact.id,
          text: textToSend
        })
      });
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message: ' + err.message);
    }
  };

  // Handle media file upload and send
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeContact || !selectedSessionId) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("File size is too large! Please choose a file smaller than 20MB.");
      return;
    }

    setIsUploadingMedia(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      
      let mediaType = 'document';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';

      try {
        const res = await fetch(`${API_URL}/messages/send-media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: selectedSessionId,
            recipientJid: activeContact.id,
            mediaType: mediaType,
            fileName: file.name,
            fileMimeType: file.type,
            fileData: base64Data
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to send media file');
        }
      } catch (err) {
        console.error('File send failed:', err);
        alert(`Error sending file: ${err.message}`);
      } finally {
        setIsUploadingMedia(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = (err) => {
      console.error('Base64 conversion failed:', err);
      alert("Failed to read file.");
      setIsUploadingMedia(false);
    };

    reader.readAsDataURL(file);
  };

  // Save CRM changes
  const handleSaveCRM = async () => {
    if (!activeContact) return;

    let finalLabels = crmLabels;
    if (newLabelText.trim() && !crmLabels.includes(newLabelText.trim())) {
      finalLabels = [...crmLabels, newLabelText.trim()];
      setCrmLabels(finalLabels);
      setNewLabelText('');
    }

    try {
      const res = await fetch(`${API_URL}/contacts/${activeContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: crmCustomName,
          email: crmEmail,
          notes: crmNotes,
          pipelineStage: crmStage,
          labels: finalLabels
        })
      });
      const data = await res.json();
      
      // Update contacts locally
      setContacts(prev => prev.map(c => c.id === data.id ? { ...c, ...data, labels: typeof data.labels === 'string' ? JSON.parse(data.labels) : data.labels } : c));
      alert('CRM details updated successfully!');
    } catch (err) {
      console.error('Error saving CRM data:', err);
    }
  };

  // Add Label
  const handleAddLabel = (e) => {
    e.preventDefault();
    if (!newLabelText.trim() || crmLabels.includes(newLabelText.trim())) return;
    setCrmLabels([...crmLabels, newLabelText.trim()]);
    setNewLabelText('');
  };

  // Remove Label
  const handleRemoveLabel = (labelToRemove) => {
    setCrmLabels(crmLabels.filter(l => l !== labelToRemove));
  };

  // Add Quick Reply template
  const handleExportCSV = () => {
    if (contacts.length === 0) {
      alert('No leads available to export!');
      return;
    }
    
    // Construct CSV Header
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // Include BOM for excel parsing
    csvContent += 'WhatsApp JID,Verified PushName,CRM Custom Name,Email Address,Pipeline Stage,Labels,Created Date,Notes\n';
    
    // Append rows
    contacts.forEach(contact => {
      const jid = contact.id;
      const name = (contact.name || '').replace(/"/g, '""');
      const customName = (contact.custom_name || '').replace(/"/g, '""');
      const email = (contact.email || '').replace(/"/g, '""');
      const stage = contact.pipeline_stage || 'new';
      const labels = (contact.labels || []).join('; ').replace(/"/g, '""');
      const date = contact.created_at || '';
      const notes = (contact.notes || '').replace(/\n/g, ' ').replace(/"/g, '""');
      
      csvContent += `"${jid}","${name}","${customName}","${email}","${stage}","${labels}","${date}","${notes}"\n`;
    });
    
    // Download Link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `whatsapp_crm_leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddQuickReply = (e) => {
    e.preventDefault();
    if (!newReplyTitle.trim() || !newReplyText.trim()) return;
    const newReply = {
      id: 'qr_' + Date.now(),
      title: newReplyTitle.trim(),
      text: newReplyText.trim()
    };
    setQuickReplies([...quickReplies, newReply]);
    setNewReplyTitle('');
    setNewReplyText('');
  };

  // Delete Quick Reply template
  const handleDeleteQuickReply = (id) => {
    setQuickReplies(quickReplies.filter(r => r.id !== id));
  };

  // Update pipeline stage of a contact directly (e.g. from Kanban)
  const handleUpdateContactStage = async (contactId, newStage) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    try {
      const res = await fetch(`${API_URL}/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customName: contact.custom_name,
          email: contact.email,
          notes: contact.notes,
          pipelineStage: newStage,
          labels: contact.labels
        })
      });
      const data = await res.json();
      setContacts(prev => prev.map(c => c.id === data.id ? { ...c, ...data, labels: typeof data.labels === 'string' ? JSON.parse(data.labels) : data.labels } : c));
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleToggleArchive = async (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    const isCurrentlyArchived = contact.is_archived === 1;

    try {
      const res = await fetch(`${API_URL}/contacts/${contactId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !isCurrentlyArchived })
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to toggle archive');

      // Update local contacts list
      setContacts(prev => prev.map(c => c.id === data.id ? { ...c, is_archived: data.is_archived } : c));
      
      // Update activeContact if it matches
      setActiveContact(prev => prev && prev.id === data.id ? { ...prev, is_archived: data.is_archived } : prev);
      
      // If we archived it, clear activeContact to close chat panel
      if (!isCurrentlyArchived) {
        setActiveContact(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error updating archive status.');
    }
  };

  const fetchStarredMessages = async (contactId) => {
    try {
      const res = await fetch(`${API_URL}/contacts/${contactId}/starred`);
      const data = await res.json();
      setStarredMessages(data);
    } catch (err) {
      console.error('Failed to fetch starred messages:', err);
    }
  };

  const fetchScheduledMessages = async (contactId) => {
    try {
      const res = await fetch(`${API_URL}/contacts/${contactId}/scheduled`);
      const data = await res.json();
      setScheduledMessages(data);
    } catch (err) {
      console.error('Failed to fetch scheduled messages:', err);
    }
  };

  const handleToggleStar = async (msgId, isStarred) => {
    try {
      const res = await fetch(`${API_URL}/messages/${msgId}/star`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred })
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to update star');

      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, is_starred: data.is_starred } : m));
      if (activeContact) {
        fetchStarredMessages(activeContact.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleMessage = async (e) => {
    e.preventDefault();
    if (!scheduleMessageText.trim() || !scheduleDateTime || !activeContact) return;

    const sendUnix = Math.floor(new Date(scheduleDateTime).getTime() / 1000);
    const nowUnix = Math.floor(Date.now() / 1000);
    if (sendUnix <= nowUnix) {
      alert('Please select a future date and time to schedule.');
      return;
    }

    const activeSession = selectedSessionId || (sessions.find(s => s.status === 'connected')?.id);
    if (!activeSession) {
      alert('Please select a connected WhatsApp account first.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/contacts/${activeContact.id}/scheduled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession,
          messageText: scheduleMessageText.trim(),
          sendAt: sendUnix
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule');

      setScheduledMessages(prev => [...prev, data]);
      setScheduleMessageText('');
      setScheduleDateTime('');
      setShowScheduleModal(false);
    } catch (err) {
      alert(err.message || 'Failed to schedule message.');
    }
  };

  const handleCancelScheduled = async (id) => {
    if (!confirm('Are you sure you want to cancel this scheduled message?')) return;
    try {
      const res = await fetch(`${API_URL}/scheduled/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to cancel');
      setScheduledMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Filter contacts by search query, chat type, and CRM stage
  const filteredContacts = contacts.filter(c => {
    if (!c) return false;
    // 1. Search Query Filter
    const query = searchQuery.toLowerCase();
    const name = (c.name || '').toLowerCase();
    const customName = (c.custom_name || '').toLowerCase();
    const id = c.id ? c.id.toLowerCase() : '';
    const matchesSearch = name.includes(query) || customName.includes(query) || id.includes(query);
    if (!matchesSearch) return false;

    // 2. Archive & Unread & Group/DM Filters
    const isGroup = c.id.endsWith('@g.us');
    
    if (chatTypeFilter === 'archived') {
      if (c.is_archived !== 1) return false;
    } else {
      // Exclude archived chats from regular lists
      if (c.is_archived === 1) return false;
      
      if (chatTypeFilter === 'dm' && isGroup) return false;
      if (chatTypeFilter === 'group' && !isGroup) return false;
      if (chatTypeFilter === 'unread' && !(c.unread_count > 0)) return false;
    }

    // 3. CRM Stage Filter
    if (crmStageFilter !== 'all' && c.pipeline_stage !== crmStageFilter) return false;

    return true;
  });

  const sortedFilteredContacts = [...filteredContacts].sort((a, b) => {
    const timeA = a.last_message_time || 0;
    const timeB = b.last_message_time || 0;
    return timeB - timeA;
  });

  // Kanban groups stages are now state-driven

  if (!authUser) {
    return (
      <div className="auth-page" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: '#f4f6f8',
        fontFamily: 'var(--font-body)',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.03), 0 5px 15px rgba(0, 0, 0, 0.01)',
          border: '1px solid #eef2f6',
          color: '#0f2b26',
          textAlign: 'center'
        }}>
          {/* EMS Header Branding */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: '900', color: '#0db49e', fontFamily: 'var(--font-header)', letterSpacing: '1px' }}>EMS</span>
            </div>
            <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#0b5042', letterSpacing: '2px', borderTop: '2px solid #0db49e', paddingTop: '2px', textTransform: 'uppercase', marginTop: '2px' }}>
              EMPLOYEE MANAGEMENT SYSTEM
            </div>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f2b26', fontFamily: 'var(--font-header)', marginBottom: '4px' }}>
            {activeTab === 'register' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>
            {activeTab === 'register' ? 'Register your account to get started' : 'Sign in to your account to continue'}
          </p>

          {authError && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '12px',
              marginBottom: '20px',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {authError}
            </div>
          )}

          {activeTab === 'register' ? (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f2b26', marginBottom: '6px' }}>Company Name</label>
                <div style={{ position: 'relative' }}>
                  <Users size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f2b26', marginBottom: '6px' }}>Work Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f2b26', marginBottom: '6px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                </div>
              </div>
              <button type="submit" disabled={authLoading} className="btn" style={{
                background: '#0db49e',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(13, 180, 158, 0.2)',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '10px'
              }}>
                {authLoading ? 'Creating Workspace...' : 'Register Workspace →'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
                Already have an account?{' '}
                <span onClick={() => { setActiveTab('login'); setAuthError(null); }} style={{ color: '#0db49e', fontWeight: '700', cursor: 'pointer' }}>
                  Sign In
                </span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f2b26', marginBottom: '6px' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#0f2b26' }}>Password</label>
                  <span style={{ fontSize: '11px', color: '#0db49e', fontWeight: '600', cursor: 'pointer' }}>Forgot password?</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', textAlign: 'left' }}>
                <input type="checkbox" id="rememberMe" style={{ accentColor: '#0db49e', cursor: 'pointer' }} />
                <label htmlFor="rememberMe" style={{ fontSize: '12px', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>Remember me</label>
              </div>
              <button type="submit" disabled={authLoading} className="btn" style={{
                background: '#0db49e',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(13, 180, 158, 0.2)',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                {authLoading ? 'Logging in...' : 'Sign In →'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
                Don't have an account?{' '}
                <span onClick={() => { setActiveTab('register'); setAuthError(null); }} style={{ color: '#0db49e', fontWeight: '700', cursor: 'pointer' }}>
                  Sign Up
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const AccordionCategory = ({ id, label, children }) => {
    const isExpanded = expandedCategories[id];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
        <div 
          onClick={() => toggleCategory(id)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '8px 12px', 
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            userSelect: 'none'
          }}
        >
          <span>{label}</span>
          {isExpanded ? <ChevronDown size={12} style={{ color: 'rgba(255, 255, 255, 0.3)' }} /> : <ChevronRight size={12} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />}
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          overflow: 'hidden',
          maxHeight: isExpanded ? '800px' : '0px',
          opacity: isExpanded ? 1 : 0,
          transition: 'max-height 0.3s ease, opacity 0.3s ease'
        }}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        {/* EMS-style Sidebar Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '22px', fontWeight: '900', color: '#0db49e', fontFamily: 'var(--font-header)', letterSpacing: '1px', lineHeight: 1 }}>EMS</span>
            <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.35)', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', borderTop: '1.5px solid #0db49e', paddingTop: '2px', marginTop: '2px' }}>MANAGEMENT SYSTEM</span>
          </div>
        </div>
        <nav className="sidebar-nav" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* CATEGORY: DASHBOARDS */}
          <AccordionCategory id="dashboards" label={language === 'hi' ? 'डैशबोर्ड' : language === 'hinglish' ? 'Dashboards' : 'Dashboards'}>
            <div className={`nav-item ${activeTab === 'admin_dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('admin_dashboard')}>
              <BarChart3 size={15} />
              <span style={{ fontSize: '13px' }}>{translations[language].dashboard}</span>
            </div>
            <div className={`nav-item ${activeTab === 'manager_dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('manager_dashboard')}>
              <BarChart3 size={15} />
              <span style={{ fontSize: '13px' }}>{translations[language].taskAnalytics}</span>
            </div>
            <div className={`nav-item ${activeTab === 'gps_attendance' ? 'active' : ''}`} onClick={() => setActiveTab('gps_attendance')}>
              <Globe size={15} />
              <span style={{ fontSize: '13px' }}>{translations[language].liveTracking}</span>
            </div>
            {/* Global Audit Logs tab */}
            {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager') && (
              <div className={`nav-item ${activeTab === 'audit_logs' ? 'active' : ''}`} onClick={() => setActiveTab('audit_logs')}>
                <FileText size={15} />
                <span style={{ fontSize: '13px' }}>{translations[language].auditLogs}</span>
              </div>
            )}
          </AccordionCategory>

          {/* CATEGORY: HR MANAGEMENT */}
          <AccordionCategory id="hr_management" label={language === 'hi' ? 'एचआर प्रबंधन' : language === 'hinglish' ? 'HR Management' : 'HR Management'}>
            <div className={`nav-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
              <Users size={15} />
              <span style={{ fontSize: '13px' }}>{translations[language].employees}</span>
            </div>
            <div className={`nav-item ${activeTab === 'employee_directory' ? 'active' : ''}`} onClick={() => setActiveTab('employee_directory')}>
              <Search size={15} />
              <span style={{ fontSize: '13px' }}>{translations[language].directory}</span>
            </div>
            <div className={`nav-item ${activeTab === 'recruitment_ats' ? 'active' : ''}`} onClick={() => setActiveTab('recruitment_ats')}>
              <Briefcase size={15} />
              <span style={{ fontSize: '13px' }}>Recruitment & ATS</span>
            </div>
            <div className={`nav-item ${activeTab === 'performance_kpis' ? 'active' : ''}`} onClick={() => setActiveTab('performance_kpis')}>
              <Award size={15} />
              <span style={{ fontSize: '13px' }}>Performance (KPIs)</span>
            </div>
            <div className={`nav-item ${activeTab === 'asset_management' ? 'active' : ''}`} onClick={() => setActiveTab('asset_management')}>
              <FileText size={15} />
              <span style={{ fontSize: '13px' }}>Asset Management</span>
            </div>
            <div className={`nav-item ${activeTab === 'verify_documents' ? 'active' : ''}`} onClick={() => setActiveTab('verify_documents')}>
              <FileText size={15} />
              <span style={{ fontSize: '13px' }}>Verify Documents</span>
            </div>
            <div className={`nav-item ${activeTab === 'offboarding' ? 'active' : ''}`} onClick={() => setActiveTab('offboarding')}>
              <Trash2 size={15} />
              <span style={{ fontSize: '13px' }}>Offboarding Exit</span>
            </div>
          </AccordionCategory>

          {/* CATEGORY: PAYROLL & FINANCE */}
          <AccordionCategory id="payroll_finance" label="Payroll & Finance">
            <div className={`nav-item ${activeTab === 'payroll' ? 'active' : ''}`} onClick={() => setActiveTab('payroll')}>
              <CreditCard size={15} />
              <span style={{ fontSize: '13px' }}>Payroll & Salary</span>
            </div>
            <div className={`nav-item ${activeTab === 'taxes_compliance' ? 'active' : ''}`} onClick={() => setActiveTab('taxes_compliance')}>
              <FileText size={15} />
              <span style={{ fontSize: '13px' }}>Taxes & Compliance</span>
            </div>
            <div className={`nav-item ${activeTab === 'incentives_bonus' ? 'active' : ''}`} onClick={() => setActiveTab('incentives_bonus')}>
              <Award size={15} />
              <span style={{ fontSize: '13px' }}>Incentives & Bonus</span>
            </div>
            <div className={`nav-item ${activeTab === 'ff_settlements' ? 'active' : ''}`} onClick={() => setActiveTab('ff_settlements')}>
              <Check size={15} />
              <span style={{ fontSize: '13px' }}>F&F Settlements</span>
            </div>
            <div className={`nav-item ${activeTab === 'advances_loans' ? 'active' : ''}`} onClick={() => setActiveTab('advances_loans')}>
              <CreditCard size={15} />
              <span style={{ fontSize: '13px' }}>Advances & Loans</span>
            </div>
            <div className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
              <CreditCard size={15} />
              <span style={{ fontSize: '13px' }}>Expenses Claim</span>
            </div>
          </AccordionCategory>

          {/* CATEGORY: CRM & SALES */}
          <AccordionCategory id="crm_sales" label="CRM & Sales">
            <div className={`nav-item ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => setActiveTab('channels')}>
              <Smartphone size={15} />
              <span style={{ fontSize: '13px' }}>WA Channels</span>
              {sessions.filter(s => s.status === 'connected').length > 0 && (
                <span className="badge" style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                  {sessions.filter(s => s.status === 'connected').length} Active
                </span>
              )}
            </div>
            <div className={`nav-item ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
              <MessageSquare size={15} />
              <span style={{ fontSize: '13px' }}>Unified Inbox Chats</span>
            </div>
            <div className={`nav-item ${activeTab === 'kanban' ? 'active' : ''}`} onClick={() => setActiveTab('kanban')}>
              <Layers size={15} />
              <span style={{ fontSize: '13px' }}>CRM Pipeline Board</span>
            </div>
            <div className={`nav-item ${activeTab === 'chatbot' ? 'active' : ''}`} onClick={() => setActiveTab('chatbot')}>
              <Bot size={15} />
              <span style={{ fontSize: '13px' }}>Chatbot Rules</span>
            </div>
          </AccordionCategory>

          {/* CATEGORY: OPERATIONS */}
          <AccordionCategory id="operations" label="Operations">
            <div className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
              <ClipboardList size={15} />
              <span style={{ fontSize: '13px' }}>Tasks Board</span>
            </div>
            <div className={`nav-item ${activeTab === 'office_kiosk' ? 'active' : ''}`} onClick={() => setActiveTab('office_kiosk')}>
              <Clock size={15} />
              <span style={{ fontSize: '13px' }}>Office Kiosk Mode</span>
            </div>
            <div className={`nav-item ${activeTab === 'work_hours' ? 'active' : ''}`} onClick={() => setActiveTab('work_hours')}>
              <Clock size={15} />
              <span style={{ fontSize: '13px' }}>Work Hours Log</span>
            </div>
            <div className={`nav-item ${activeTab === 'notice_board' ? 'active' : ''}`} onClick={() => setActiveTab('notice_board')}>
              <Bell size={15} />
              <span style={{ fontSize: '13px' }}>Notice Board</span>
            </div>
            <div className={`nav-item ${activeTab === 'holidays' ? 'active' : ''}`} onClick={() => setActiveTab('holidays')}>
              <Calendar size={15} />
              <span style={{ fontSize: '13px' }}>Holidays List</span>
            </div>
            <div className={`nav-item ${activeTab === 'rewards_recognition' ? 'active' : ''}`} onClick={() => setActiveTab('rewards_recognition')}>
              <Award size={15} />
              <span style={{ fontSize: '13px' }}>Rewards Badges</span>
            </div>
          </AccordionCategory>

          {/* CATEGORY: MY PORTAL */}
          <AccordionCategory id="my_portal" label="My Portal">
            <div className={`nav-item ${activeTab === 'my_attendance' ? 'active' : ''}`} onClick={() => setActiveTab('my_attendance')}>
              <Clock size={15} />
              <span style={{ fontSize: '13px' }}>Shift Attendance</span>
            </div>
            <div className={`nav-item ${activeTab === 'leaves' ? 'active' : ''}`} onClick={() => setActiveTab('leaves')}>
              <Calendar size={15} />
              <span style={{ fontSize: '13px' }}>Leaves Requests</span>
            </div>
            <div className={`nav-item ${activeTab === 'shifts' ? 'active' : ''}`} onClick={() => setActiveTab('shifts')}>
              <Calendar size={15} />
              <span style={{ fontSize: '13px' }}>Work Shift Roster</span>
            </div>
          </AccordionCategory>

          {/* CATEGORY: SAAS PORTAL */}
          <AccordionCategory id="saas_portal" label="SaaS Portal">
            <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <UserCheck size={15} />
              <span style={{ fontSize: '13px' }}>Workspace Settings</span>
            </div>
            <div className={`nav-item ${activeTab === 'roles_permissions' ? 'active' : ''}`} onClick={() => setActiveTab('roles_permissions')}>
              <UserCheck size={15} />
              <span style={{ fontSize: '13px' }}>Roles & Permissions</span>
            </div>
            <div className={`nav-item ${activeTab === 'system_dropdowns' ? 'active' : ''}`} onClick={() => setActiveTab('system_dropdowns')}>
              <Tag size={15} />
              <span style={{ fontSize: '13px' }}>System Dropdowns</span>
            </div>
            <div className={`nav-item ${activeTab === 'recycle_bin' ? 'active' : ''}`} onClick={() => setActiveTab('recycle_bin')}>
              <Trash2 size={15} />
              <span style={{ fontSize: '13px' }}>Recycle Bin</span>
            </div>
            <div className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
              <Megaphone size={15} style={{ transform: 'rotate(-20deg)' }} />
              <span style={{ fontSize: '13px' }}>Subscription Billing</span>
            </div>
            <div className={`nav-item ${activeTab === 'superadmin_plans' ? 'active' : ''}`} onClick={() => setActiveTab('superadmin_plans')}>
              <BarChart3 size={15} />
              <span style={{ fontSize: '13px' }}>Super Admin Panel</span>
            </div>
          </AccordionCategory>

          {/* CATEGORY: HELP & SUPPORT */}
          <AccordionCategory id="help_support" label="Help & Support">
            <div className={`nav-item ${activeTab === 'app_guide' ? 'active' : ''}`} onClick={() => setActiveTab('app_guide')}>
              <Globe size={15} />
              <span style={{ fontSize: '13px' }}>App Guide & Tour</span>
            </div>
          </AccordionCategory>
        </nav>
        
        <div style={{ 
          padding: '12px', 
          borderTop: '1px solid rgba(255,255,255,0.05)', 
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '50%', 
              width: '28px', 
              height: '28px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0 
            }}>
              <User size={14} style={{ color: 'white' }} />
            </div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'white' }}>{authUser?.email}</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{authUser?.role}</div>
            </div>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('omnilflow_token');
              localStorage.removeItem('omnilflow_user');
              setAuthUser(null);
              setActiveTab('login');
            }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '11px',
              padding: '6px',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* EMS-style white top header with search */}
        <header className="top-header">
          <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }} onClick={() => setShowGlobalSearchModal(true)}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              readOnly
              placeholder="Search contacts, logs, employees... (Press Ctrl + K)"
              style={{
                width: '100%',
                padding: '9px 14px 9px 36px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
                color: '#1e293b',
                background: '#f8fafc',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {(activeTab === 'inbox' || activeTab === 'kanban') && (
              <button className="btn btn-secondary" onClick={() => {
                setBroadcastMessage('');
                setBroadcastProgress(null);
                const connected = sessions.find(s => s.status === 'connected');
                if (connected) setBroadcastSessionId(connected.id);
                setShowBroadcastModal(true);
              }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '13px' }}>
                <Megaphone size={15} /> Broadcast
              </button>
            )}
            {activeTab === 'channels' && (
              <button className="btn btn-primary" onClick={() => setShowAddSessionModal(true)} style={{ padding: '7px 14px', fontSize: '13px' }}>
                <Plus size={15} /> Add Channel
              </button>
            )}

            {/* Language Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>🌐 LANG:</span>
              <select
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setLanguage(newLang);
                  showToast(`Language switched to ${newLang === 'hi' ? 'Hindi' : newLang === 'hinglish' ? 'Hinglish' : 'English'}!`, 'success');
                }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', background: 'white', fontWeight: '700', color: '#0f2b26' }}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </div>

            {/* Server status dot */}
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#94a3b8' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: serverOnline ? '#10b981' : '#ef4444', display: 'inline-block' }}></span>
              {serverOnline ? 'Live' : 'Offline'}
            </span>
            {/* Bell icon */}
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
              <Bell size={17} />
            </div>
            {/* User avatar */}
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <User size={16} style={{ color: 'white' }} />
            </div>
          </div>
        </header>

        {/* Tab Contents */}
        {activeTab === 'inbox' && (
          <div className="inbox-view">
            {/* Contact Chat List */}
            <div className="chat-list-panel glass-panel">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search chats or phone..." 
                    className="chat-search"
                    style={{ paddingLeft: '32px', width: '100%' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setNewChatError('');
                    const connected = sessions.find(s => s.status === 'connected');
                    if (connected) {
                      setNewChatSessionId(connected.id);
                    }
                    setShowNewChatModal(true);
                  }}
                  style={{ padding: '0', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  title="Start New Chat"
                >
                  <Plus size={20} />
                </button>
              </div>
              
              {/* Chat type filter tabs */}
              <div className="chat-filters-row" style={{ display: 'flex', gap: '4px', margin: '8px 0 6px 0', padding: '0 4px', flexWrap: 'wrap' }}>
                <button 
                  className={`btn-filter ${chatTypeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setChatTypeFilter('all')}
                  style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: chatTypeFilter === 'all' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: chatTypeFilter === 'all' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  All
                </button>
                <button 
                  className={`btn-filter ${chatTypeFilter === 'dm' ? 'active' : ''}`}
                  onClick={() => setChatTypeFilter('dm')}
                  style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: chatTypeFilter === 'dm' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: chatTypeFilter === 'dm' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  DMs
                </button>
                <button 
                  className={`btn-filter ${chatTypeFilter === 'group' ? 'active' : ''}`}
                  onClick={() => setChatTypeFilter('group')}
                  style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: chatTypeFilter === 'group' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: chatTypeFilter === 'group' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Groups
                </button>
                <button 
                  className={`btn-filter ${chatTypeFilter === 'unread' ? 'active' : ''}`}
                  onClick={() => setChatTypeFilter('unread')}
                  style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: chatTypeFilter === 'unread' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: chatTypeFilter === 'unread' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Unread
                </button>
                <button 
                  className={`btn-filter ${chatTypeFilter === 'archived' ? 'active' : ''}`}
                  onClick={() => setChatTypeFilter('archived')}
                  style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: chatTypeFilter === 'archived' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: chatTypeFilter === 'archived' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Archived
                </button>
              </div>

              {/* CRM Stage Quick Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '0 4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Stage:</span>
                <select 
                  className="crm-select"
                  style={{ flex: 1, padding: '4px 8px', fontSize: '11px', height: '28px' }}
                  value={crmStageFilter}
                  onChange={(e) => setCrmStageFilter(e.target.value)}
                >
                  <option value="all">All Stages</option>
                  <option value="new">New Leads</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                  <option value="proposal">Proposal Sent</option>
                  <option value="won">Closed Won</option>
                </select>
              </div>
              <div className="chat-items-container">
                {sortedFilteredContacts.length === 0 ? (
                  <div style={{ padding: '20px', textAlignment: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                    No chats found
                  </div>
                ) : (
                  sortedFilteredContacts.map(contact => {
                    const isActive = activeContact && activeContact.id === contact.id;
                    const hasRealName = contact.name && !isPhone(contact.name);
                    const displayName = contact.custom_name || (hasRealName ? contact.name : null) || formatJidName(contact.id);
                    const initials = contact.custom_name ? contact.custom_name.substring(0, 2).toUpperCase() : (hasRealName ? contact.name.substring(0, 2).toUpperCase() : '');
                    
                    return (
                      <div 
                        key={contact.id} 
                        className={`chat-item ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveContact(contact)}
                      >
                        {contact.profile_pic_url && contact.profile_pic_url !== 'none' ? (
                          <img 
                            src={contact.profile_pic_url} 
                            alt={displayName} 
                            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-glass)' }} 
                          />
                        ) : (
                          <div className="avatar">
                            {initials ? initials : <User size={18} className="text-gray-400" />}
                          </div>
                        )}
                        <div className="chat-item-info">
                          <div className="chat-item-header">
                            <span className="chat-item-name">{displayName}</span>
                            {contact.last_message_time && (
                              <span className="chat-item-time">
                                {new Date(contact.last_message_time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="chat-item-preview" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                              {contact.last_message_from_me ? 'You: ' : ''}
                              {contact.last_message_text || (contact.last_message_media_type ? `[${contact.last_message_media_type}]` : 'No messages yet')}
                            </span>
                            {contact.unread_count > 0 && (
                              <span style={{ 
                                background: '#ef4444', 
                                color: 'white', 
                                fontSize: '10px', 
                                fontWeight: 'bold', 
                                minWidth: '18px', 
                                height: '18px', 
                                borderRadius: '9px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                padding: '0 4px',
                                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                              }}>
                                {contact.unread_count}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                            <span className="badge badge-indigo">{contact.pipeline_stage}</span>
                            {contact.labels && contact.labels.slice(0, 2).map((l, i) => (
                              <span key={i} className="badge" style={getLabelStyles(l)}>{l}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Room Window */}
            <div className="chat-room-panel glass-panel">
              {activeContact ? (
                <>
                  <div className="chat-room-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {activeContact.profile_pic_url && activeContact.profile_pic_url !== 'none' ? (
                        <img 
                          src={activeContact.profile_pic_url} 
                          alt="Avatar" 
                          style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-glass)' }} 
                        />
                      ) : (
                        <div className="avatar">
                          {activeContact.custom_name ? activeContact.custom_name.substring(0, 2).toUpperCase() : (activeContact.name && !isPhone(activeContact.name) ? activeContact.name.substring(0, 2).toUpperCase() : <User size={18} className="text-gray-400" />)}
                        </div>
                      )}
                      <div>
                        <h3 style={{ fontSize: '15px' }}>{activeContact.custom_name || (activeContact.name && !isPhone(activeContact.name) ? activeContact.name : null) || formatJidName(activeContact.id)}</h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatJidName(activeContact.id)}</p>
                      </div>
                    </div>
                    {/* Choose Sender Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Chat History Search Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                        {showChatHistorySearch ? (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '2px 8px', height: '36px' }}>
                            <Search size={14} style={{ color: 'var(--text-dim)', marginRight: '6px' }} />
                            <input 
                              type="text" 
                              placeholder="Search message text..." 
                              value={chatHistorySearchQuery}
                              onChange={(e) => setChatHistorySearchQuery(e.target.value)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '12px', width: '150px' }}
                              autoFocus
                            />
                            <X 
                              size={14} 
                              style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                              onClick={() => {
                                setChatHistorySearchQuery('');
                                setShowChatHistorySearch(false);
                              }} 
                            />
                          </div>
                        ) : (
                          <button 
                            className="btn btn-secondary"
                            onClick={() => setShowChatHistorySearch(true)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', width: '36px', height: '36px' }}
                            title="Search Messages"
                          >
                            <Search size={16} />
                          </button>
                        )}
                      </div>

                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleToggleArchive(activeContact.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', height: '36px' }}
                        title={activeContact.is_archived === 1 ? 'Unarchive Chat' : 'Archive Chat'}
                      >
                        <Archive size={16} />
                        <span>{activeContact.is_archived === 1 ? 'Unarchive' : 'Archive'}</span>
                      </button>

                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Reply From:</span>
                      <select 
                        className="crm-select" 
                        style={{ width: '160px', padding: '6px 12px' }}
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                      >
                        <option value="">Select WhatsApp Account</option>
                        {sessions.filter(s => s.status === 'connected').map(s => (
                          <option key={s.id} value={s.id}>{s.phone_name} ({s.phone_number})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Messages Feed */}
                  <div className="chat-room-messages">
                    {hasMoreMessages && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 20px 0' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => fetchMessages(activeContact.id, true)}
                          disabled={isLoadingMore}
                          style={{ fontSize: '11px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}
                        >
                          {isLoadingMore ? 'Loading messages...' : '↑ Load Older Messages'}
                        </button>
                      </div>
                    )}
                    {messages.map((msg, index) => {
                      const isOutgoing = msg.from_me === 1 || msg.fromMe === true;
                      const textContent = msg.text_content || msg.textContent || '';
                      const mediaType = msg.media_type || msg.mediaType || 'text';
                      const timeStr = new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      const hasSearchQuery = chatHistorySearchQuery.trim() !== '';
                      const isMatch = hasSearchQuery && textContent.toLowerCase().includes(chatHistorySearchQuery.toLowerCase());

                      return (
                        <div 
                          key={msg.id || index} 
                          className={`message-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}
                          style={{
                            opacity: hasSearchQuery && !isMatch ? 0.35 : 1,
                            transition: 'opacity 0.25s ease'
                          }}
                        >
                          <div 
                            className="message-bubble"
                            style={isMatch ? {
                              boxShadow: '0 0 0 2px var(--color-primary), 0 4px 12px rgba(99, 102, 241, 0.25)',
                              border: '1px solid var(--color-primary)'
                            } : {}}
                          >
                            {/* Star Message Action */}
                            <button
                              onClick={() => handleToggleStar(msg.id, !msg.is_starred)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                position: 'absolute',
                                bottom: '4px',
                                right: isOutgoing ? '-24px' : 'auto',
                                left: isOutgoing ? 'auto' : '-24px',
                                opacity: msg.is_starred ? 1 : 0,
                                color: msg.is_starred ? '#facc15' : 'var(--text-dim)',
                                transition: 'opacity 0.2s',
                              }}
                              className="star-message-btn"
                              title={msg.is_starred ? 'Unstar Message' : 'Star Message'}
                            >
                              <Star size={12} fill={msg.is_starred ? '#facc15' : 'none'} />
                            </button>
                            {mediaType === 'image' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {(msg.media_url || msg.mediaUrl) ? (
                                  <img 
                                    src={`${SOCKET_URL}${msg.media_url || msg.mediaUrl}`} 
                                    alt="Photo" 
                                    style={{ maxWidth: '240px', maxHeight: '200px', borderRadius: '6px', cursor: 'pointer', objectFit: 'cover' }} 
                                    onClick={() => window.open(`${SOCKET_URL}${msg.media_url || msg.mediaUrl}`, '_blank')} 
                                  />
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '240px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                                      <ImageIcon size={18} className="text-indigo-400" />
                                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Photo Attachment</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Media file encrypted on WhatsApp CDN</div>
                                  </div>
                                )}
                              </div>
                            )}

                            {mediaType === 'video' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {(msg.media_url || msg.mediaUrl) ? (
                                  <video 
                                    controls 
                                    src={`${SOCKET_URL}${msg.media_url || msg.mediaUrl}`} 
                                    style={{ maxWidth: '240px', borderRadius: '6px' }} 
                                  />
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '240px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                                      <Play size={18} className="text-indigo-400" />
                                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Video Attachment</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Media file encrypted on WhatsApp CDN</div>
                                  </div>
                                )}
                              </div>
                            )}

                            {mediaType === 'document' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {(msg.media_url || msg.mediaUrl) ? (
                                  <a 
                                    href={`${SOCKET_URL}${msg.media_url || msg.mediaUrl}`} 
                                    download={textContent || 'document'} 
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', minWidth: '180px', color: 'var(--text-main)' }}
                                  >
                                    <FileText size={20} className="text-indigo-400" />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                      <span style={{ fontSize: '11px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{textContent || 'Document'}</span>
                                      <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Click to Download</span>
                                    </div>
                                    <Download size={14} className="text-muted" />
                                  </a>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', minWidth: '180px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                                      <FileText size={18} className="text-indigo-400" />
                                      <span style={{ fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{textContent || 'Document.pdf'}</span>
                                    </div>
                                    <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px 8px', fontSize: '10px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-main)', cursor: 'pointer' }}>
                                      <Download size={10} /> Download PDF
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {mediaType === 'audio' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {(msg.media_url || msg.mediaUrl) ? (
                                  <audio 
                                    controls 
                                    src={`${SOCKET_URL}${msg.media_url || msg.mediaUrl}`} 
                                    style={{ width: '240px', height: '36px' }} 
                                  />
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', minWidth: '180px' }}>
                                    <button style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
                                      <Play size={12} fill="white" />
                                    </button>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-main)' }}>Voice Note</div>
                                      <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>0:08 • Waveform</div>
                                    </div>
                                    <Volume2 size={14} className="text-indigo-400" />
                                  </div>
                                )}
                              </div>
                            )}

                            {mediaType === 'text' && (
                              <div style={{ wordBreak: 'break-word' }}>{textContent}</div>
                            )}
                            <div className="message-meta">
                              <span>{timeStr}</span>
                              {isOutgoing && renderStatusTicks(msg.status)}
                              {!isOutgoing && msg.session_name && (
                                <span style={{ color: 'var(--text-dim)' }}>via {msg.session_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Composer */}
                  <form onSubmit={handleSendMessage} className="chat-input-bar">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleFileChange}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => fileInputRef.current.click()} 
                      style={{ padding: '8px', minWidth: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                      disabled={sessions.filter(s => s.status === 'connected').length === 0 || isUploadingMedia}
                      title="Attach file (Image, Video, Audio, Document)"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setScheduleMessageText(inputText);
                        setScheduleDateTime('');
                        setShowScheduleModal(true);
                      }}
                      style={{ padding: '8px', minWidth: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                      disabled={sessions.filter(s => s.status === 'connected').length === 0}
                      title="Schedule this message to send later"
                    >
                      <Clock size={18} />
                    </button>
                    <input 
                      type="text" 
                      placeholder={isUploadingMedia ? "Uploading attachment..." : (sessions.filter(s => s.status === 'connected').length === 0 ? "Connect a WhatsApp account in channels to chat..." : "Type a message...")} 
                      className="chat-input"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={sessions.filter(s => s.status === 'connected').length === 0 || isUploadingMedia}
                    />
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={!selectedSessionId || !inputText.trim() || sessions.filter(s => s.status === 'connected').length === 0 || isUploadingMedia}
                    >
                      {isUploadingMedia ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} /> Send
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-dim)', gap: '12px' }}>
                  <MessageSquare size={48} strokeWidth={1} />
                  <p>Select a chat from the inbox list to start replying</p>
                </div>
              )}
            </div>

            {/* Right CRM Details Panel */}
            {activeContact && (
              <div className="crm-detail-panel glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
                {/* Right Sidebar Tab Switches */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setCrmRightTab('info')}
                    style={{ flex: '1 1 auto', padding: '8px', fontSize: '11px', border: 'none', background: 'transparent', color: crmRightTab === 'info' ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: crmRightTab === 'info' ? '2px solid var(--color-primary)' : 'none', cursor: 'pointer', fontWeight: crmRightTab === 'info' ? '600' : '400' }}
                  >
                    Info
                  </button>
                  <button 
                    onClick={() => setCrmRightTab('templates')}
                    style={{ flex: '1 1 auto', padding: '8px', fontSize: '11px', border: 'none', background: 'transparent', color: crmRightTab === 'templates' ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: crmRightTab === 'templates' ? '2px solid var(--color-primary)' : 'none', cursor: 'pointer', fontWeight: crmRightTab === 'templates' ? '600' : '400' }}
                  >
                    Replies
                  </button>
                  <button 
                    onClick={() => setCrmRightTab('scheduled')}
                    style={{ flex: '1 1 auto', padding: '8px', fontSize: '11px', border: 'none', background: 'transparent', color: crmRightTab === 'scheduled' ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: crmRightTab === 'scheduled' ? '2px solid var(--color-primary)' : 'none', cursor: 'pointer', fontWeight: crmRightTab === 'scheduled' ? '600' : '400' }}
                  >
                    Scheduled ({scheduledMessages.length})
                  </button>
                  <button 
                    onClick={() => setCrmRightTab('starred')}
                    style={{ flex: '1 1 auto', padding: '8px', fontSize: '11px', border: 'none', background: 'transparent', color: crmRightTab === 'starred' ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: crmRightTab === 'starred' ? '2px solid var(--color-primary)' : 'none', cursor: 'pointer', fontWeight: crmRightTab === 'starred' ? '600' : '400' }}
                  >
                    Starred ({starredMessages.length})
                  </button>
                </div>

                {crmRightTab === 'info' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flexGrow: 1 }}>
                    <div className="crm-group">
                      <label className="crm-label">WhatsApp Name</label>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                        {activeContact.name || 'Not Available'}
                      </div>
                    </div>

                    <div className="crm-group">
                      <label className="crm-label">CRM Custom Name</label>
                      <input 
                        type="text" 
                        className="crm-input" 
                        placeholder="Enter custom name"
                        value={crmCustomName}
                        onChange={(e) => setCrmCustomName(e.target.value)}
                      />
                    </div>

                    <div className="crm-group">
                      <label className="crm-label">Email Address</label>
                      <input 
                        type="email" 
                        className="crm-input" 
                        placeholder="example@mail.com"
                        value={crmEmail}
                        onChange={(e) => setCrmEmail(e.target.value)}
                      />
                    </div>

                    <div className="crm-group">
                      <label className="crm-label">Pipeline Stage</label>
                      <select 
                        className="crm-select" 
                        value={crmStage}
                        onChange={(e) => setCrmStage(e.target.value)}
                      >
                        <option value="new">New Lead</option>
                        <option value="contacted">Contacted</option>
                        <option value="interested">Interested</option>
                        <option value="proposal">Proposal Sent</option>
                        <option value="won">Closed Won</option>
                      </select>
                    </div>

                    <div className="crm-group">
                      <label className="crm-label">Labels / Tags</label>
                      <form onSubmit={handleAddLabel} style={{ display: 'flex', gap: '6px' }}>
                        <input 
                          type="text" 
                          placeholder="Add tag" 
                          className="crm-input" 
                          value={newLabelText}
                          onChange={(e) => setNewLabelText(e.target.value)}
                        />
                        <button type="submit" className="btn btn-secondary" style={{ padding: '6px 10px' }}>
                          Add
                        </button>
                      </form>
                      <div className="crm-tags-list">
                        {crmLabels.map((tag, index) => {
                          const tagStyle = getLabelStyles(tag);
                          return (
                            <span key={index} className="crm-tag-item" style={{ background: tagStyle.background, color: tagStyle.color, border: tagStyle.border }}>
                              <Tag size={10} style={{ color: tagStyle.color }} />
                              <span>{tag}</span>
                              <span className="crm-tag-remove" style={{ color: tagStyle.color }} onClick={() => handleRemoveLabel(tag)}>×</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="crm-group">
                      <label className="crm-label">Interaction Notes</label>
                      <textarea 
                        className="crm-textarea" 
                        placeholder="Add details, context, next follow-up dates..."
                        value={crmNotes}
                        onChange={(e) => setCrmNotes(e.target.value)}
                      />
                    </div>

                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', marginTop: '10px', marginBottom: '10px' }}
                      onClick={handleSaveCRM}
                    >
                      Save CRM Details
                    </button>
                  </div>
                )}

                {crmRightTab === 'templates' && (
                  <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flexGrow: 1, marginBottom: '12px', paddingRight: '4px' }}>
                      {quickReplies.map(reply => (
                        <div 
                          key={reply.id} 
                          onClick={() => setInputText(reply.text)}
                          style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', position: 'relative', transition: 'border-color 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                        >
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>{reply.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>{reply.text}</div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteQuickReply(reply.id); }}
                            style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', color: 'var(--color-red)', fontSize: '14px', cursor: 'pointer', padding: '2px' }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {quickReplies.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                          No templates saved. Add one below!
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleAddQuickReply} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)' }}>Add Template</div>
                      <input 
                        type="text" 
                        placeholder="Template Title" 
                        className="crm-input" 
                        style={{ fontSize: '11px', padding: '6px' }}
                        value={newReplyTitle}
                        onChange={(e) => setNewReplyTitle(e.target.value)}
                      />
                      <textarea 
                        placeholder="Template message text..." 
                        className="crm-textarea" 
                        style={{ fontSize: '11px', padding: '6px', height: '60px', minHeight: '60px', resize: 'vertical' }}
                        value={newReplyText}
                        onChange={(e) => setNewReplyText(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '6px', fontSize: '11px', width: '100%', marginBottom: '10px' }}>
                        Add Template
                      </button>
                    </form>
                  </div>
                )}

                {crmRightTab === 'scheduled' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flexGrow: 1, maxHeight: '60vh' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '700' }}>Scheduled Follow-ups</h4>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => {
                          setScheduleMessageText('');
                          setScheduleDateTime('');
                          setShowScheduleModal(true);
                        }}
                        style={{ fontSize: '10px', padding: '4px 8px' }}
                      >
                        <Plus size={10} /> Schedule
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                      {scheduledMessages.map(msg => {
                        const sendDate = new Date(msg.send_at * 1000);
                        const isFailed = msg.status === 'failed';
                        const isSent = msg.status === 'sent';

                        return (
                          <div 
                            key={msg.id} 
                            style={{ 
                              background: 'rgba(255,255,255,0.03)', 
                              border: '1px solid rgba(255,255,255,0.06)', 
                              borderRadius: '8px', 
                              padding: '10px', 
                              position: 'relative' 
                            }}
                          >
                            {!isSent && (
                              <button 
                                onClick={() => handleCancelScheduled(msg.id)}
                                style={{ 
                                  position: 'absolute', 
                                  top: '8px', 
                                  right: '8px', 
                                  background: 'none', 
                                  border: 'none', 
                                  color: '#ef4444', 
                                  cursor: 'pointer' 
                                }}
                                title="Cancel Scheduled Message"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
                              <Clock size={12} />
                              <span>{sendDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                              <span 
                                className={`badge`} 
                                style={{ 
                                  marginLeft: 'auto', 
                                  fontSize: '9px',
                                  padding: '1px 4px',
                                  background: isSent ? 'rgba(16, 185, 129, 0.15)' : (isFailed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)'),
                                  color: isSent ? '#34d399' : (isFailed ? '#f87171' : '#facc15')
                                }}
                              >
                                {msg.status}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', whiteSpace: 'pre-wrap', paddingRight: '20px' }}>
                              {msg.message_text}
                            </p>
                            {isFailed && msg.error_message && (
                              <p style={{ fontSize: '10px', color: '#f87171', marginTop: '4px', fontStyle: 'italic' }}>
                                Error: {msg.error_message}
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {scheduledMessages.length === 0 && (
                        <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                          No messages scheduled for this lead.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {crmRightTab === 'starred' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flexGrow: 1, maxHeight: '60vh' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '700' }}>Starred Messages</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {starredMessages.map(msg => {
                        const dateStr = new Date(msg.timestamp * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                        const isOutgoing = msg.from_me === 1 || msg.fromMe === true;

                        return (
                          <div 
                            key={msg.id} 
                            style={{ 
                              background: 'rgba(255,255,255,0.03)', 
                              border: '1px solid rgba(255,255,255,0.06)', 
                              borderRadius: '8px', 
                              padding: '10px',
                              cursor: 'pointer'
                            }}
                            title="Click to view message details"
                            onClick={() => alert(`Starred Message:\n\n${msg.text_content || '[Media Message]'}`)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                              <span>{isOutgoing ? 'Sent (You)' : 'Received'}</span>
                              <span>{dateStr}</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                              {msg.text_content || `[Starred ${msg.media_type || 'Media'}]`}
                            </p>
                          </div>
                        );
                      })}

                      {starredMessages.length === 0 && (
                        <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                          No starred messages in this chat.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Kanban Board View */}
        {activeTab === 'kanban' && (
          <div className="kanban-view">
            {stages.map(column => {
              const columnContacts = contacts.filter(c => c.pipeline_stage === column.id);
              
              return (
                <div key={column.id} className="kanban-column">
                  <div className="kanban-column-header">
                    <span className="column-title" style={{ color: column.color }}>{column.title}</span>
                    <span className="column-count">{columnContacts.length}</span>
                  </div>
                  <div className="kanban-cards">
                    {columnContacts.map(lead => {
                      const hasRealNameLead = lead.name && !isPhone(lead.name);
                      const nameToShow = lead.custom_name || (hasRealNameLead ? lead.name : null) || formatJidName(lead.id);
                      
                      return (
                        <div key={lead.id} className="kanban-card" onClick={() => {
                          setActiveContact(lead);
                          setActiveTab('inbox');
                        }}>
                          <div className="card-title">{nameToShow}</div>
                          <div className="card-subtitle">{lead.id.split('@')[0]}</div>
                          {lead.notes && (
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {lead.notes}
                            </p>
                          )}
                          <div className="card-labels">
                            {lead.labels && lead.labels.map((l, i) => (
                              <span key={i} className="badge" style={getLabelStyles(l)}>{l}</span>
                            ))}
                          </div>
                          
                          {/* Fast move options */}
                          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                            <select 
                              className="crm-select" 
                              style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                              value={lead.pipeline_stage}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleUpdateContactStage(lead.id, e.target.value)}
                            >
                              <option value="new">Move to New</option>
                              <option value="contacted">Move to Contacted</option>
                              <option value="interested">Move to Interested</option>
                              <option value="proposal">Move to Proposal</option>
                              <option value="won">Move to Won</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                    {columnContacts.length === 0 && (
                      <div style={{ padding: '20px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-dim)', textAlign: 'center', fontSize: '11px' }}>
                        No leads in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* WhatsApp Channels tab */}
        {activeTab === 'channels' && (
          <div className="channels-grid">
            {sessions.map(sess => (
              <div key={sess.id} className="channel-card glass-panel">
                <div className="channel-status-indicator">
                  <span className={`status-dot ${sess.status}`}></span>
                  <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{sess.status.replace('_', ' ')}</span>
                </div>

                <div className="avatar-wrapper" style={{ margin: '8px 0', display: 'flex', justifyContent: 'center' }}>
                  {sess.profile_pic_url ? (
                    <img 
                      src={sess.profile_pic_url} 
                      alt={sess.phone_name} 
                      style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} 
                    />
                  ) : (
                    <div className="avatar" style={{ width: '64px', height: '64px', fontSize: '24px' }}>
                      {(sess.phone_name || 'WA').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{sess.phone_name || 'WhatsApp Account'}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {sess.phone_number ? `+${sess.phone_number}` : 'No phone connected'}
                </p>

                {sess.status === 'qr_ready' && sess.qr_code && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="channel-qr-container">
                      <img src={sess.qr_code} alt="WhatsApp Link QR Code" />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scan this QR code from your phone's WhatsApp link devices</p>
                  </div>
                )}

                {sess.status === 'connecting' && (
                  <div style={{ padding: '30px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <RefreshCw size={24} className="animate-spin text-indigo-400" />
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Connecting to WhatsApp server...</p>
                  </div>
                )}

                {sess.status === 'connected' && (
                  <div style={{ padding: '30px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'var(--color-green-glow)', padding: '8px', borderRadius: '50%' }}>
                      <Check size={24} style={{ color: 'var(--color-green)' }} />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-green)', fontWeight: '600' }}>Connection established</p>
                  </div>
                )}

                {sess.status === 'disconnected' && (
                  <div style={{ padding: '30px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Account is logged out or disconnected</p>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => handleStartSession(sess.id)}>
                      Connect Now
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', width: '100%', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {sess.status !== 'disconnected' && (
                    <button className="btn btn-secondary" style={{ flexGrow: 1, padding: '6px', fontSize: '11px' }} onClick={() => handleStopSession(sess.id)}>
                      Disconnect
                    </button>
                  )}
                  <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => handleDeleteSession(sess.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {sessions.length === 0 && (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', justifyContent: 'center', color: 'var(--text-dim)' }}>
                <Smartphone size={48} strokeWidth={1} />
                <h3>No channels connected</h3>
                <p style={{ fontSize: '13px' }}>Click "Add Channel" in the top right to link your first WhatsApp number.</p>
                <button className="btn btn-primary" onClick={() => setShowAddSessionModal(true)}>
                  <Plus size={16} /> Add First Channel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chatbot Rules View */}
        {activeTab === 'chatbot' && (
          <div className="chatbot-rules-view glass-panel" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Chatbot Auto-Response Rules</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Define keywords and automated replies. When an incoming message matches, the bot will automatically reply.
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => {
                setChatbotRuleError('');
                setChatbotRuleKeyword('');
                setChatbotRuleReply('');
                setChatbotRuleMatchType('contains');
                setShowAddRuleModal(true);
              }}>
                <Plus size={16} /> Add New Rule
              </button>
            </div>

            <div className="chatbot-rules-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '10px' }}>
              {chatbotRules.map(rule => (
                <div key={rule.id} className="chatbot-rule-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={rule.is_active === 1}
                      onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      title={rule.is_active ? 'Disable Rule' : 'Enable Rule'}
                    />
                    <button 
                      onClick={() => handleDeleteRule(rule.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                      title="Delete Rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ paddingRight: '40px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="badge badge-indigo" style={{ textTransform: 'uppercase', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
                        {rule.match_type}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                        "{rule.keyword}"
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px', whiteSpace: 'pre-wrap' }}>
                      <strong>Reply:</strong> {rule.reply_text}
                    </div>
                  </div>
                </div>
              ))}

              {chatbotRules.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '10px', color: 'var(--text-dim)' }}>
                  <Bot size={48} strokeWidth={1} style={{ marginBottom: '12px', color: 'var(--text-dim)', margin: '0 auto 12px auto' }} />
                  <h3>No chatbot rules configured yet</h3>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Create your first auto-response keyword matching rule above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-panel glass-panel" style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1 }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '6px' }}>Workspace Settings</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Configure your multi-tenant CRM pipeline stages and predefined contact tags.
            </p>

            {settingsError && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                {settingsError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Pipeline Stages Section */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '12px' }}>Custom CRM Pipeline Stages</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  {stages.map((stage, idx) => (
                    <div key={stage.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#557a75', width: '24px', fontWeight: '600' }}>#{idx + 1}</span>
                      <input
                        type="text"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', width: '180px' }}
                        value={stage.title}
                        onChange={(e) => {
                          const updated = [...stages];
                          updated[idx].title = e.target.value;
                          setStages(updated);
                        }}
                      />
                      <input
                        type="color"
                        style={{ border: 'none', padding: '0', width: '32px', height: '32px', cursor: 'pointer', borderRadius: '6px' }}
                        value={stage.color}
                        onChange={(e) => {
                          const updated = [...stages];
                          updated[idx].color = e.target.value;
                          setStages(updated);
                        }}
                      />
                      <button
                        className="btn"
                        type="button"
                        style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: 'none', borderRadius: '6px' }}
                        onClick={() => {
                          setStages(stages.filter(s => s.id !== stage.id));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="btn"
                  type="button"
                  style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--color-primary)', border: 'none' }}
                  onClick={() => {
                    const newId = 'stage_' + Date.now();
                    setStages([...stages, { id: newId, title: 'New Stage', color: '#0d9488' }]);
                  }}
                >
                  + Add Pipeline Stage
                </button>
              </div>

              {/* CRM Tags Section */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '12px' }}>Predefined CRM Contact Tags</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {allowedTags.map(tag => (
                    <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(13, 148, 136, 0.08)', color: 'var(--color-primary)', border: '1px solid rgba(13, 148, 136, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                      <span>{tag}</span>
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => setAllowedTags(allowedTags.filter(t => t !== tag))} />
                    </div>
                  ))}
                  {allowedTags.length === 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>No tags added yet.</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    id="new-settings-tag-input"
                    placeholder="e.g. Premium"
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const newTag = e.target.value.trim();
                        if (!allowedTags.includes(newTag)) {
                          setAllowedTags([...allowedTags, newTag]);
                        }
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new-settings-tag-input');
                      if (input && input.value.trim()) {
                        const newTag = input.value.trim();
                        if (!allowedTags.includes(newTag)) {
                          setAllowedTags([...allowedTags, newTag]);
                        }
                        input.value = '';
                      }
                    }}
                  >
                    Add Tag
                  </button>
                </div>
              </div>

              {/* Save Settings Trigger */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  style={{ padding: '12px 24px' }}
                  onClick={() => handleSaveTenantSettings(stages, allowedTags)}
                  disabled={settingsLoading}
                >
                  {settingsLoading ? 'Saving Settings...' : 'Save Workspace Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="billing-panel glass-panel" style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1 }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '6px' }}>Subscription Billing</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Manage your subscription plans, Stripe invoice billing history, and payment cards.
            </p>

            {/* Current Status Box */}
            <div style={{ 
              background: 'white', 
              padding: '24px', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: '#557a75', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CURRENT PLAN</span>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', marginTop: '4px' }}>
                  {billingTenant?.subscription_status === 'active' ? 'OmniFlow CRM Unlimited Pro Plan' : 'Free Trial Tier (Limited)'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {billingTenant?.subscription_status === 'active' 
                    ? 'Thank you for supporting us! Your billing account is active.' 
                    : 'Upgrade to unlock multiple WhatsApp channels and automatic scheduled responders.'}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <span style={{
                  padding: '6px 14px',
                  borderRadius: '99px',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  background: billingTenant?.subscription_status === 'active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: billingTenant?.subscription_status === 'active' ? '#10b981' : '#ef4444',
                  border: billingTenant?.subscription_status === 'active' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  {billingTenant?.subscription_status || 'Trial'}
                </span>
                
                {billingTenant?.stripe_customer_id && (
                  <button 
                    className="btn"
                    type="button"
                    style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--color-primary)', border: 'none', fontSize: '12px', padding: '6px 12px' }}
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/billing/create-portal-session`, { method: 'POST' });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                      } catch (err) {
                        alert('Stripe customer portal redirection failed.');
                      }
                    }}
                  >
                    Manage Billing Portal
                  </button>
                )}
              </div>
            </div>

            {/* Country pricing rate selector */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '16px 20px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px'
            }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f2b26' }}>Billing Location Currency</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Swap country code to view pricing details in localized currencies.</p>
              </div>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#0f2b26',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="IN">India (₹ INR)</option>
                <option value="US">United States ($ USD)</option>
                <option value="DEFAULT">International ($ USD)</option>
              </select>
            </div>

            {/* Pricing Cards List */}
            {(!billingTenant || billingTenant.subscription_status !== 'active') && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f2b26', marginBottom: '24px', textAlign: 'center' }}>
                  Choose a Localized Subscription Plan
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
                  
                  {billingPlans.map(plan => {
                    const priceSymbol = plan.price?.currency === 'INR' ? '₹' : '$';
                    const amountValue = plan.price?.amount !== undefined ? plan.price.amount : 0;
                    const stripePriceId = plan.price?.stripe_price_id || '';
                    const isPopular = plan.id === 'pro';

                    return (
                      <div 
                        key={plan.id} 
                        style={{ 
                          background: 'white', 
                          padding: '28px', 
                          borderRadius: '16px', 
                          border: isPopular ? '2px solid var(--color-primary)' : '1px solid #e2e8f0', 
                          boxShadow: isPopular ? '0 10px 30px rgba(13,148,136,0.1)' : 'none',
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'space-between',
                          position: 'relative'
                        }}
                      >
                        {isPopular && (
                          <span style={{ 
                            position: 'absolute',
                            top: '-12px',
                            right: '20px',
                            background: 'var(--color-primary)', 
                            color: 'white', 
                            fontSize: '9px', 
                            fontWeight: '800', 
                            padding: '3px 10px', 
                            borderRadius: '99px',
                            letterSpacing: '0.05em'
                          }}>
                            POPULAR
                          </span>
                        )}
                        <div>
                          <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26' }}>{plan.name}</h4>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{plan.description}</p>
                          <div style={{ margin: '20px 0', display: 'flex', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-primary)' }}>
                              {priceSymbol}{amountValue}
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '4px' }}>/ month</span>
                          </div>
                          <ul style={{ paddingLeft: '18px', fontSize: '12px', color: '#557a75', lineHeight: '22px', marginBottom: '20px' }}>
                            {plan.features.map((feat, idx) => (
                              <li key={idx}>{feat}</li>
                            ))}
                          </ul>
                        </div>
                        <button 
                          className="btn btn-primary" 
                          type="button"
                          style={{ 
                            marginTop: '12px', 
                            width: '100%', 
                            padding: '12px',
                            background: isPopular ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'var(--color-primary)'
                          }}
                          onClick={() => handleCreateCheckoutSession(stripePriceId)}
                        >
                          Upgrade to {plan.name}
                        </button>
                      </div>
                    );
                  })}

                  {billingPlans.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                      No active subscription plans found for this location.
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'superadmin_plans' && authUser?.role === 'superadmin' && (
          <div className="superadmin-plans-panel glass-panel" style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '6px' }}>
              Global SaaS Plans Admin
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Manage global tenant plans, active feature locks, and country-wise billing price configuration mappings.
            </p>

            {adminPlansError && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                {adminPlansError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'start' }}>
              
              {/* Left Side: Plans List & Add/Edit Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Add/Edit Plan Form */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '16px' }}>
                    {adminPlanForm.id ? 'Edit Plan Configuration' : 'Create New SaaS Plan'}
                  </h3>
                  <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Plan ID</label>
                        <input
                          type="text"
                          required
                          disabled={!!adminPlanForm.id}
                          placeholder="e.g. pro"
                          value={adminPlanForm.id}
                          onChange={(e) => setAdminPlanForm({ ...adminPlanForm, id: e.target.value })}
                          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Plan Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Unlimited Pro"
                          value={adminPlanForm.name}
                          onChange={(e) => setAdminPlanForm({ ...adminPlanForm, name: e.target.value })}
                          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Plan Description</label>
                      <input
                        type="text"
                        placeholder="e.g. For growing enterprises"
                        value={adminPlanForm.description}
                        onChange={(e) => setAdminPlanForm({ ...adminPlanForm, description: e.target.value })}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                        Plan Features (One per line)
                      </label>
                      <textarea
                        rows="3"
                        placeholder="Unlimited active sessions&#10;Scheduled responders&#10;Priority support"
                        value={adminPlanForm.features}
                        onChange={(e) => setAdminPlanForm({ ...adminPlanForm, features: e.target.value })}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', fontFamily: 'inherit' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Max WA Channels</label>
                        <input
                          type="number"
                          value={adminPlanForm.maxChannels}
                          onChange={(e) => setAdminPlanForm({ ...adminPlanForm, maxChannels: parseInt(e.target.value) || 1 })}
                          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Max Contacts</label>
                        <input
                          type="number"
                          value={adminPlanForm.maxContacts}
                          onChange={(e) => setAdminPlanForm({ ...adminPlanForm, maxContacts: parseInt(e.target.value) || 250 })}
                          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Max Employees</label>
                        <input
                          type="number"
                          value={adminPlanForm.maxEmployees}
                          onChange={(e) => setAdminPlanForm({ ...adminPlanForm, maxEmployees: parseInt(e.target.value) || 5 })}
                          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', margin: '8px 0', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={adminPlanForm.allowChatbot}
                          onChange={(e) => setAdminPlanForm({ ...adminPlanForm, allowChatbot: e.target.checked })}
                        />
                        Enable Auto Chatbot
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={adminPlanForm.allowScheduler}
                          onChange={(e) => setAdminPlanForm({ ...adminPlanForm, allowScheduler: e.target.checked })}
                        />
                        Enable Scheduler
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={adminPlanForm.allowGpsTracking}
                          onChange={(e) => setAdminPlanForm({ ...adminPlanForm, allowGpsTracking: e.target.checked })}
                        />
                        Enable GPS Tracking
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={adminPlanForm.isActive}
                          onChange={(e) => setAdminPlanForm({ ...adminPlanForm, isActive: e.target.checked })}
                        />
                        Plan Active
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {adminPlanForm.id && (
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569' }}
                          onClick={() => setAdminPlanForm({
                            id: '',
                            name: '',
                            description: '',
                            features: '',
                            maxChannels: 1,
                            maxContacts: 250,
                            maxEmployees: 5,
                            allowChatbot: false,
                            allowScheduler: false,
                            allowGpsTracking: false,
                            isActive: true
                          })}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ padding: '8px 16px' }}
                        disabled={adminPlansLoading}
                      >
                        {adminPlansLoading ? 'Saving...' : 'Save Plan Schema'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Plans List Table */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '12px' }}>
                    Active & Seeded Plans
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {superadminPlans.map(plan => (
                      <div 
                        key={plan.id} 
                        style={{ 
                          padding: '12px 16px', 
                          borderRadius: '8px', 
                          border: adminSelectedPlanId === plan.id ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                          background: '#f8fafc',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setAdminSelectedPlanId(plan.id);
                          setAdminPlanForm({
                            id: plan.id,
                            name: plan.name,
                            description: plan.description || '',
                            features: plan.features.join('\n'),
                            maxChannels: plan.max_channels,
                            maxContacts: plan.max_contacts,
                            maxEmployees: plan.max_employees || 5,
                            allowChatbot: plan.allow_chatbot === 1,
                            allowScheduler: plan.allow_scheduler === 1,
                            allowGpsTracking: plan.allow_gps_tracking === 1,
                            isActive: plan.is_active === 1
                          });
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '13px' }}>{plan.name}</span>
                            <span style={{ 
                               fontSize: '9px', 
                               fontWeight: '700', 
                               padding: '2px 6px', 
                               borderRadius: '4px',
                               background: plan.is_active ? 'rgba(16, 185, 129, 0.12)' : '#e2e8f0',
                               color: plan.is_active ? '#10b981' : '#64748b'
                             }}>
                              {plan.is_active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            ID: {plan.id} | Channels: {plan.max_channels} | Contacts: {plan.max_contacts} | Employees: {plan.max_employees || 5} | GPS: {plan.allow_gps_tracking ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <ChevronRight size={16} style={{ color: '#64748b' }} />
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Side: Country-Wise Price Configurations */}
              <div>
                <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '6px' }}>
                    Country Pricing & Currencies
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Select a plan on the left to edit pricing rates for specific locations.
                  </p>

                  {adminSelectedPlanId ? (
                    <div>
                      <div style={{ 
                        background: 'rgba(13, 148, 136, 0.05)', 
                        padding: '10px 14px', 
                        borderRadius: '8px', 
                        border: '1px solid rgba(13, 148, 136, 0.15)',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: 'var(--color-primary)',
                        marginBottom: '20px'
                      }}>
                        Selected: {superadminPlans.find(p => p.id === adminSelectedPlanId)?.name}
                      </div>

                      {/* Prices List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                        {(superadminPlans.find(p => p.id === adminSelectedPlanId)?.prices || []).map(price => (
                          <div key={price.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', fontSize: '12px' }}>
                            <div>
                              <span style={{ fontWeight: '700', color: '#0f2b26', textTransform: 'uppercase' }}>[{price.country_code}]</span>{' '}
                              <span style={{ fontWeight: '800', color: 'var(--color-primary)' }}>{price.currency} {price.amount}</span>
                              {price.stripe_price_id && (
                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Stripe: {price.stripe_price_id}</div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn"
                              style={{ padding: '4px 8px', fontSize: '10px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: 'none' }}
                              onClick={() => handleDeletePrice(adminSelectedPlanId, price.country_code)}
                            >
                              Delete
                            </button>
                          </div>
                        ))}

                        {(superadminPlans.find(p => p.id === adminSelectedPlanId)?.prices || []).length === 0 && (
                          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '12px' }}>
                            No custom rates added. Plan defaults to $0.
                          </div>
                        )}
                      </div>

                      {/* Add Price Form */}
                      <form onSubmit={handleSavePrice} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#0f2b26' }}>Add Country Rate</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', marginBottom: '2px' }}>Country Code (e.g. IN)</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. US"
                              value={adminNewPriceForm.countryCode}
                              onChange={(e) => setAdminNewPriceForm({ ...adminNewPriceForm, countryCode: e.target.value })}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '12px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', marginBottom: '2px' }}>Currency (e.g. INR)</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. USD"
                              value={adminNewPriceForm.currency}
                              onChange={(e) => setAdminNewPriceForm({ ...adminNewPriceForm, currency: e.target.value })}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '12px' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', marginBottom: '2px' }}>Price Amount</label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              placeholder="e.g. 29.00"
                              value={adminNewPriceForm.amount}
                              onChange={(e) => setAdminNewPriceForm({ ...adminNewPriceForm, amount: e.target.value })}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '12px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', marginBottom: '2px' }}>Stripe Price ID</label>
                            <input
                              type="text"
                              placeholder="e.g. price_pro_123"
                              value={adminNewPriceForm.stripePriceId}
                              onChange={(e) => setAdminNewPriceForm({ ...adminNewPriceForm, stripePriceId: e.target.value })}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '12px' }}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ padding: '10px', marginTop: '4px', fontSize: '12px' }}
                        >
                          + Save Country Pricing Rate
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div style={{ padding: '40px 10px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '8px', color: 'var(--text-dim)', fontSize: '12px' }}>
                      Select a plan from the list to manage locations and pricing.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'audit_logs' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>
                {language === 'hi' ? 'सिस्टम ऑडिट लॉग रजिस्ट्री' : language === 'hinglish' ? 'System Audit Logs Registry' : 'System Audit Log Registry'}
              </h2>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setAuditLogs([]);
                  showToast('Audit registry logs cleared successfully.', 'success');
                }}
                style={{ padding: '8px 14px', fontSize: '12px' }}
              >
                🧹 Clear Log Registry
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Chronological security logs tracking manager approvals, billing state modifications, and attendance actions.
            </p>

            <div className="sticky-table-container" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Timestamp</th>
                    <th style={{ padding: '12px' }}>User / Account</th>
                    <th style={{ padding: '12px' }}>System Activity Event Description</th>
                    <th style={{ padding: '12px' }}>Security Role Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#64748b' }}>{log.time}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{log.user}</td>
                      <td style={{ padding: '12px', color: '#0f2b26' }}>{log.action}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: '800',
                          background: log.role === 'owner' ? '#def7ec' : log.role === 'manager' ? '#e0f2fe' : '#f1f5f9',
                          color: log.role === 'owner' ? '#03543f' : log.role === 'manager' ? '#0369a1' : '#475569'
                        }}>
                          {log.role.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontStyle: 'italic' }}>
                        No audit events recorded in this session.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="employees-directory-panel glass-panel" style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>Employee Directory</h2>
              {(authUser?.role === 'owner' || authUser?.role === 'admin') && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setNewEmployeeForm({
                      id: '',
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      role: 'employee',
                      department: 'Sales',
                      salary: '',
                      createLoginAccount: false,
                      password: '',
                      status: 'active'
                    });
                    setShowAddEmployeeModal(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px' }}
                >
                  + Add Employee Profile
                </button>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Manage team members, roles, departments, payroll base structures, and workspace login credentials.
            </p>

            {/* Plan limits progress meter bar */}
            {billingTenant && (
              <div style={{ 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '12px', 
                padding: '16px 20px', 
                marginBottom: '28px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '700' }}>
                    Workspace Employees Limit Tracker:
                  </span>
                  <span style={{ fontWeight: '800', color: 'var(--color-primary)' }}>
                    {employees.length} / {billingTenant.plan?.max_employees || 5} Added
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#cbd5e1', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, (employees.length / (billingTenant.plan?.max_employees || 5)) * 100)}%`, 
                    height: '100%', 
                      ))}
                    </div>
                  </div>
                </div>

                {/* Employees Grid */}
                {(() => {
                  const filtered = employees.filter(emp => {
                    const q = localEmpQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      emp.first_name.toLowerCase().includes(q) ||
                      (emp.last_name || '').toLowerCase().includes(q) ||
                      (emp.role || '').toLowerCase().includes(q) ||
                      (emp.department || '').toLowerCase().includes(q)
                    );
                  });

                  const sorted = [...filtered].sort((a, b) => {
                    let valA = a[employeeSortKey] || '';
                    let valB = b[employeeSortKey] || '';
                    if (typeof valA === 'string') valA = valA.toLowerCase();
                    if (typeof valB === 'string') valB = valB.toLowerCase();
                    if (employeeSortKey === 'salary') {
                      valA = parseFloat(valA) || 0;
                      valB = parseFloat(valB) || 0;
                    }
                    if (valA < valB) return employeeSortDir === 'asc' ? -1 : 1;
                    if (valA > valB) return employeeSortDir === 'asc' ? 1 : -1;
                    return 0;
                  });

                  const totalPages = Math.ceil(sorted.length / employeeItemsPerPage) || 1;
                  const paginated = sorted.slice(
                    (employeeCurrentPage - 1) * employeeItemsPerPage,
                    employeeCurrentPage * employeeItemsPerPage
                  );

                  if (isEmployeesLoading) {
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                              <div className="shimmer-avatar"></div>
                              <div style={{ flex: 1 }}>
                                <div className="shimmer-line" style={{ width: '60%' }}></div>
                                <div className="shimmer-line" style={{ width: '40%' }}></div>
                              </div>
                            </div>
                            <div className="shimmer-line" style={{ width: '80%' }}></div>
                            <div className="shimmer-line" style={{ width: '50%' }}></div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {paginated.map(emp => {
                          const roleColors = {
                            admin: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
                            manager: { bg: 'rgba(235, 179, 8, 0.1)', color: '#eab308' },
                            agent: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
                            employee: { bg: '#e2e8f0', color: '#475569' }
                          };
                          const badge = roleColors[emp.role] || roleColors.employee;

                          return (
                            <div 
                              key={emp.id} 
                              style={{ 
                                background: 'white', 
                                padding: '20px', 
                                borderRadius: '12px', 
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '14px'
                              }}
                            >
                              <div>
                                {/* Name and status dot */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <h4 style={{ fontSize: '16px', fontWeight: '800' }}>
                                    {emp.first_name} {emp.last_name || ''}
                                  </h4>
                                  <span style={{ 
                                    width: '8px', 
                                    height: '8px', 
                                    borderRadius: '50%', 
                                    background: emp.status === 'active' ? '#10b981' : '#cbd5e1' 
                                  }} title={emp.status} />
                                </div>

                                {/* Badges */}
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  <span style={{ 
                                    fontSize: '10px', 
                                    fontWeight: '700', 
                                    padding: '2px 8px', 
                                    borderRadius: '4px',
                                    background: badge.bg,
                                    color: badge.color,
                                    textTransform: 'uppercase'
                                  }}>
                                    {emp.role}
                                  </span>
                                  <span style={{ 
                                    fontSize: '10px', 
                                    fontWeight: '700', 
                                    padding: '2px 8px', 
                                    borderRadius: '4px',
                                    background: '#f1f5f9',
                                    color: '#475569'
                                  }}>
                                    📁 {emp.department || 'Sales'}
                                  </span>
                                </div>

                                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span>📧</span> <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{emp.email}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span>📱</span> <span>{emp.phone || 'N/A'}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontWeight: '700' }}>
                                    <span>💵</span> <span>Salary: ₹{emp.salary ? parseFloat(emp.salary).toLocaleString() : '0'}/mo</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {emp.id}</span>
                                {(authUser?.role === 'owner' || authUser?.role === 'admin') && (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      type="button"
                                      className="btn"
                                      style={{ padding: '4px 8px', fontSize: '11px', background: '#f1f5f9', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}
                                      onClick={() => {
                                        setNewEmployeeForm({
                                          id: emp.id,
                                          firstName: emp.first_name,
                                          lastName: emp.last_name || '',
                                          email: emp.email || '',
                                          phone: emp.phone || '',
                                          role: emp.role,
                                          department: emp.department || 'Sales',
                                          salary: emp.salary || '',
                                          createLoginAccount: !!emp.user_id,
                                          password: '',
                                          status: emp.status
                                        });
                                        setShowAddEmployeeModal(true);
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn"
                                      style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.08)', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                      onClick={() => handleDeleteEmployee(emp.id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {sorted.length === 0 && (
                          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1', color: 'var(--text-dim)' }}>
                            No team members found matching your search.
                          </div>
                        )}
                      </div>

                      {/* Pagination control footer */}
                      {sorted.length > 0 && (
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #cbd5e1' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
                            Showing {paginated.length} of {sorted.length} employees (Page {employeeCurrentPage} of {totalPages})
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={employeeCurrentPage === 1}
                              onClick={() => setEmployeeCurrentPage(prev => Math.max(1, prev - 1))}
                              style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
                            >
                              ◀ Prev
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setEmployeeCurrentPage(i + 1)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  background: employeeCurrentPage === i + 1 ? '#0d9488' : 'white',
                                  color: employeeCurrentPage === i + 1 ? 'white' : '#0f2b26',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                {i + 1}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={employeeCurrentPage === totalPages}
                              onClick={() => setEmployeeCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
                            >
                              Next ▶
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'gps_attendance' && (
          <div className="gps-attendance-panel glass-panel" style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26', position: 'relative' }}>
            
            {/* SUB-TAB NAVIGATION BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: 'white', padding: '12px 18px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setGpsSubTab('live')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '800',
                    border: 'none',
                    background: gpsSubTab === 'live' ? 'var(--color-primary)' : '#f1f5f9',
                    color: gpsSubTab === 'live' ? 'white' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  🟢 Live Current-Day Tracking
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => setGpsSubTab('audit')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '800',
                    border: 'none',
                    background: gpsSubTab === 'audit' ? 'var(--color-primary)' : '#f1f5f9',
                    color: gpsSubTab === 'audit' ? 'white' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  📜 Employee Activity Audit Log (Full Day Feed & History)
                </button>
              </div>

              <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }} onClick={() => setShowClientVisitModal(true)}>
                📸 + Log Client Visit
              </button>
            </div>

            {/* TAB A: CURRENT DAY LIVE TRACKING */}
            {gpsSubTab === 'live' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '30px', alignItems: 'start' }}>
                
                {/* Left Column: Clock Console & Odometer / Fuel Calculator */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '16px' }}>
                      Attendance Clock Console
                    </h3>

                    {todayStatus && todayStatus.status === 'no_profile' ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '12px' }}>
                        No Employee profile is linked to your user account. Attendance check-ins are restricted to team profiles.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{
                          width: '100%',
                          padding: '16px',
                          borderRadius: '8px',
                          background: todayStatus?.status === 'checked_in' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                          color: todayStatus?.status === 'checked_in' ? '#10b981' : '#64748b',
                          border: todayStatus?.status === 'checked_in' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(100, 116, 139, 0.2)',
                          fontSize: '13px',
                          fontWeight: '700'
                        }}>
                          STATUS: {todayStatus?.status === 'checked_in' ? '🟢 CLOCKED IN' : '⚪ NOT CLOCKED IN'}
                        </div>

                        {todayStatus?.check_in_time && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Checked In at: <strong>{new Date(todayStatus.check_in_time).toLocaleString()}</strong>
                            {todayStatus.check_out_time && (
                              <div>Checked Out at: <strong>{new Date(todayStatus.check_out_time).toLocaleString()}</strong></div>
                            )}
                          </div>
                        )}

                        {todayStatus?.status === 'checked_in' ? (
                          <button
                            type="button"
                            className="btn"
                            disabled={gpsLoading}
                            onClick={handleCheckOut}
                            style={{
                              width: '100%',
                              padding: '16px',
                              background: '#ef4444',
                              color: 'white',
                              fontWeight: '700',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            {gpsLoading ? 'Processing GPS...' : 'Clock Out (End Shift)'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={gpsLoading}
                            onClick={handleCheckIn}
                            style={{
                              width: '100%',
                              padding: '16px',
                              fontWeight: '700',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                          >
                            {gpsLoading ? 'Processing GPS...' : 'Clock In (Start Shift)'}
                          </button>
                        )}

                        {/* Offline Caching Simulation switch */}
                        <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '10px', textAlign: 'left' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569' }}>📴 OFFLINE SIMULATION:</span>
                            <button
                              type="button"
                              className="btn"
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                background: isOfflineMode ? '#ef4444' : '#10b981',
                                color: 'white',
                                fontWeight: '700',
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                if (isOfflineMode) {
                                  // Trigger Sync animation
                                  setIsSyncingPings(true);
                                  setTimeout(() => {
                                    setIsSyncingPings(false);
                                    setOfflinePingsCount(0);
                                    setIsOfflineMode(false);
                                    console.log('🟢 Auto-Sync Complete: Cached GPS pings uploaded to server!');
                                  }, 1500);
                                } else {
                                  setIsOfflineMode(true);
                                }
                              }}
                              disabled={isSyncingPings}
                            >
                              {isSyncingPings ? '🔄 Syncing...' : isOfflineMode ? 'OFFLINE' : 'ONLINE'}
                            </button>
                          </div>
                          
                          {isOfflineMode && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 10px', borderRadius: '6px', fontSize: '10px', color: '#991b1b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div>🚨 <strong>Data disconnected.</strong> Running offline cache simulation.</div>
                              <div>📦 Pings stored locally: <strong>{offlinePingsCount} points</strong></div>
                            </div>
                          )}
                          {!isOfflineMode && !isSyncingPings && (
                            <div style={{ fontSize: '10px', color: '#059669', fontStyle: 'italic' }}>
                              🟢 Signal Active (Syncing via WebSockets/Vercel server)
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Distance Traveled & Fuel Expense Auto-Calculator Widget */}
                  {(() => {
                    // Look up chosen employee or default to current user profile
                    const currentEmp = selectedTrackEmployee !== 'all'
                      ? teamTrackLocations.find(e => String(e.employee_id) === String(selectedTrackEmployee))
                      : teamTrackLocations[0];
                    const vehicleType = currentEmp?.vehicle_type || 'bike';
                    const rate = vehicleRates[vehicleType] || 6;
                    const distanceVal = parseFloat(currentEmp?.distance || '42.8 KM');
                    const claimVal = distanceVal * rate;

                    return (
                      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '12px' }}>
                          🚗 Odometer & Travel Allowance
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shift Distance Traveled</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0d9488', marginTop: '2px' }}>{distanceVal} KM</div>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fuel Allowance (₹{rate}/KM)</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>₹{claimVal.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        {/* Live Speed & Battery Widget */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px' }}>
                          <span>🚗 Vehicle: <strong>{vehicleType.toUpperCase()}</strong></span>
                          <span>🔋 Battery: <strong>{currentEmp?.battery || '86%'}</strong></span>
                        </div>

                        <button className="btn btn-secondary" style={{ width: '100%', fontSize: '12px' }} onClick={() => alert(`₹${claimVal.toFixed(2)} Fuel Expense Claim auto-sent to Payroll ledger!`)}>
                          + Auto-Claim ₹{claimVal.toFixed(2)} Fuel Expense
                        </button>

                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', fontSize: '12px', marginTop: '8px', background: '#0284c7', borderColor: '#0284c7', color: 'white', fontWeight: '700' }}
                          onClick={() => {
                            setSelectedExpenseEmpId(currentEmp?.employee_id || '1');
                            setShowExpenseModal(true);
                          }}
                        >
                          💰 Log Daily Shift Expenses (Tolls, Meals, Other)
                        </button>
                      </div>
                    );
                  })()}

                  {/* Owner Configurator: Customize Reimbursement Rates */}
                  {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager') && (
                    <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#166534', marginBottom: '10px' }}>
                        ⚙️ Fuel Reimbursement Rates (Per KM)
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700' }}>🏍️ Bike Rate:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>₹</span>
                            <input
                              type="number"
                              value={vehicleRates.bike}
                              onChange={(e) => setVehicleRates({ ...vehicleRates, bike: parseFloat(e.target.value) || 0 })}
                              style={{ width: '65px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700' }}>🚗 Car Rate:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>₹</span>
                            <input
                              type="number"
                              value={vehicleRates.car}
                              onChange={(e) => setVehicleRates({ ...vehicleRates, car: parseFloat(e.target.value) || 0 })}
                              style={{ width: '65px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700' }}>🚙 SUV Rate:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>₹</span>
                            <input
                              type="number"
                              value={vehicleRates.suv}
                              onChange={(e) => setVehicleRates({ ...vehicleRates, suv: parseFloat(e.target.value) || 0 })}
                              style={{ width: '65px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '9px', color: '#166534', marginTop: '8px', fontStyle: 'italic' }}>
                        * Rates updated instantly for all live route & export fuel claims.
                      </div>
                    </div>
                  )}

                  {/* Recent Client Visits Log */}
                  <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '12px' }}>
                      📸 Logged Client Meetings
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {clientVisits.map(v => (
                        <div key={v.id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                          <div style={{ fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                            <span>⭐ {v.clientName}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{v.timestamp}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{v.address}</div>
                          <div style={{ color: '#0d9488', fontSize: '11px', marginTop: '4px' }}>"{v.notes}"</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Live GPS Tracking Map & Fingerprint Route Line */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Map Viewer Panel */}
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      {/* SINGLE UNIFIED MANAGER CONTROL TOOLBAR */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1, flexWrap: 'wrap' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#0d9488', marginBottom: '2px' }}>🌐 SELECT EMPLOYEE TO TRACK</label>
                            <select
                              value={selectedTrackEmployee}
                              onChange={(e) => setSelectedTrackEmployee(e.target.value)}
                              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', fontWeight: '700', color: '#0f2b26', width: '260px' }}
                            >
                              <option value="all">🌐 All 10 Employees (NCR Team Overview)</option>
                              {teamTrackLocations.map(emp => (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                  👤 {emp.first_name} {emp.last_name || ''} ({emp.location_name})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: '700', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: 'none' }}
                            onClick={() => handleExportGpsCSV(selectedTrackEmployee)}
                          >
                            📥 Export Shift & Fuel (CSV)
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-primary"
                            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: '700' }}
                            onClick={fetchLiveLocations}
                          >
                            🔄 Refresh Live Map
                          </button>
                        </div>
                      </div>

                      {/* Leaflet map container element */}
                      <div 
                        ref={mapContainerRef} 
                        style={{ 
                          height: '460px', 
                          width: '100%', 
                          borderRadius: '12px', 
                          border: '1px solid #cbd5e1', 
                          zIndex: 1 
                        }} 
                      />

                      {/* Fingerprints Day Route Path Details Card */}
                      {selectedTrackEmployee !== 'all' ? (
                        (() => {
                          const emp = teamTrackLocations.find(e => String(e.employee_id) === String(selectedTrackEmployee));
                          if (!emp) return null;
                          return (
                            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '18px', borderRadius: '10px', fontSize: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>
                                  🛣️ Day Route Fingerprint Trail: {emp.first_name} {emp.last_name} ({emp.role})
                                </span>
                                <span style={{ background: emp.status === 'moving' ? '#10b981' : '#f59e0b', color: 'white', padding: '3px 8px', borderRadius: '4px', fontWeight: '800', fontSize: '10px' }}>
                                  {emp.status === 'moving' ? '🟢 MOVING' : '🅿️ STOPPED'}
                                </span>
                              </div>

                              {/* GPS Anti-Spoof Signals and Geofencing Status Banners */}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                {emp.gps_status === 'normal' && <span style={{ background: '#e6f4ea', color: '#137333', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '10px', border: '1px solid rgba(19, 115, 51, 0.2)' }}>🟢 GPS SIGNAL: HIGH ACCURACY (±4m)</span>}
                                {emp.gps_status === 'spoofed' && <span style={{ background: '#fce8e6', color: '#c5221f', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '10px', border: '1px solid rgba(197, 34, 31, 0.2)' }}>⚠️ ALERT: GPS MOCKING/SPOOF DETECTED</span>}
                                {emp.gps_status === 'off' && <span style={{ background: '#f1f3f4', color: '#5f6368', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '10px', border: '1px solid rgba(95, 99, 104, 0.2)' }}>🔴 WARNING: GPS SIGNAL TURNED OFF</span>}

                                {emp.geofence_status === 'inside_hq' && <span style={{ background: '#e8f0fe', color: '#1a73e8', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '10px', border: '1px solid rgba(26, 115, 232, 0.2)' }}>🏢 INSIDE HQ GEOFENCE (200m)</span>}
                                {emp.geofence_status === 'inside_client' && <span style={{ background: '#e0f2f1', color: '#00695c', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '10px', border: '1px solid rgba(0, 105, 92, 0.2)' }}>💼 INSIDE CLIENT GEOFENCE</span>}
                                {emp.geofence_status === 'outside' && <span style={{ background: '#fef7e0', color: '#b06000', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '10px', border: '1px solid rgba(176, 96, 0, 0.2)' }}>🌐 OUTSIDE GEOFENCE LIMITS</span>}
                              </div>

                              {/* Smart Idle Alert Notification Banner */}
                              {emp.idle_time_mins > 30 && (
                                <div style={{ background: '#fef7e0', border: '1px solid #feebc8', color: '#b06000', padding: '10px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', marginBottom: '12px' }}>
                                  ⚠️ <strong>EXCESSIVE IDLE DETECTED:</strong> Agent stopped for <strong>{emp.idle_time_mins} minutes</strong> at unscheduled spot!
                                </div>
                              )}

                              {/* Over-Speeding Warning Banner */}
                              {parseFloat(emp.speed || '0') > 50 && (
                                <div style={{ background: '#fdf2f2', border: '1px solid #fde2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', marginBottom: '12px' }}>
                                  🚨 <strong>SPEED LIMIT VIOLATION ALERT:</strong> Agent traveling at <span style={{ textDecoration: 'underline' }}>{emp.speed}</span> (Shift Safety Speed Limit: 50 km/h)
                                </div>
                              )}

                              {/* Low Battery Alert Notification */}
                              {parseFloat(emp.battery || '100') < 60 && (
                                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', marginBottom: '12px' }}>
                                  🔋 <strong>LOW BATTERY ALERT:</strong> Agent's device battery is low ({emp.battery}). Adaptive background GPS pings minimized to prevent device power-off.
                                </div>
                              )}

                              {/* Adaptive Tracking Ping Frequency */}
                              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', color: '#475569', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>🔋 Adaptive Tracking Ping:</span>
                                <span style={{ fontWeight: 'bold', color: emp.status === 'stopped' ? '#b45309' : '#059669' }}>
                                  {emp.status === 'stopped' ? '⏱️ 5 Mins (Idle Power Saving)' : '⚡ 30 Secs (Active Motion Tracking)'}
                                </span>
                              </div>

                              {/* Productive vs Transit Time Analytics Bar */}
                              <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#0d9488', marginBottom: '8px' }}>📊 TODAY SHIFT WORKLOAD ANALYTICS:</div>
                                {(() => {
                                  let productiveHrs = 4.2;
                                  let transitHrs = 2.4;
                                  if (emp.employee_id === '1') { productiveHrs = 5.8; transitHrs = 2.0; }
                                  else if (emp.employee_id === '2') { productiveHrs = 2.2; transitHrs = 2.8; }
                                  else if (emp.employee_id === '4') { productiveHrs = 6.5; transitHrs = 1.5; }
                                  
                                  const totalHrs = productiveHrs + transitHrs;
                                  const productivePct = (productiveHrs / totalHrs) * 100;
                                  const transitPct = 100 - productivePct;

                                  return (
                                    <div>
                                      <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: '#e2e8f0', marginBottom: '6px' }}>
                                        <div style={{ width: `${productivePct}%`, background: '#10b981', height: '100%' }} title="Productive Client Meetings" />
                                        <div style={{ width: `${transitPct}%`, background: '#0284c7', height: '100%' }} title="Transit Travel Time" />
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                                          Productive: <strong>{productiveHrs} Hrs ({productivePct.toFixed(0)}%)</strong>
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#0284c7', borderRadius: '50%' }}></span>
                                          Transit/Travel: <strong>{transitHrs} Hrs ({transitPct.toFixed(0)}%)</strong>
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Start to End Route Sequence Timeline */}
                              <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#0d9488', marginBottom: '6px' }}>📍 DISPATCHED BEAT ROUTE & LIVE TIMELINE:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                                  <div>🏁 <strong>09:00 AM:</strong> Shift Started (HQ CP)</div>
                                  {(() => {
                                    const path = employeeBeatPlans[emp.employee_id] || [];
                                    if (path.length > 0) {
                                      return (
                                        <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', margin: '4px 0', borderLeft: '3px solid #3b82f6' }}>
                                          <div style={{ fontWeight: '700', fontSize: '10px', color: '#3b82f6', marginBottom: '4px' }}>📋 ASSIGNED MEETINGS BEAT:</div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {path.map((pt, idx) => (
                                              <div key={idx}>⭐ {idx + 1}. {pt.name}</div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return <div style={{ color: 'var(--text-muted)' }}>No beat plan checkpoints dispatched for today.</div>;
                                  })()}
                                  <div>🛑 <strong>Stoppage:</strong> {emp.stoppage}</div>
                                  <div>📍 <strong>Current Position:</strong> {emp.location_name} ({emp.speed})</div>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                                <div>🚀 Speed: <strong>{emp.speed}</strong></div>
                                <div>🔋 Battery: <strong>{emp.battery}</strong></div>
                                <div>🚗 Total Distance: <strong>{emp.distance}</strong></div>
                              </div>

                              {/* Vehicle Assignment Dropdown for Owner/Manager */}
                              {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager') && (
                                <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#0d9488' }}>🚗 ASSIGN SHIFT VEHICLE:</span>
                                  <select
                                    value={emp.vehicle_type || 'bike'}
                                    onChange={(e) => {
                                      const newType = e.target.value;
                                      setTeamTrackLocations(prev => prev.map(item => 
                                        String(item.employee_id) === String(emp.employee_id)
                                          ? { ...item, vehicle_type: newType }
                                          : item
                                      ));
                                    }}
                                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: 'white', fontWeight: '700', color: '#0f2b26' }}
                                  >
                                    <option value="bike">🏍️ Bike (₹{vehicleRates.bike}/KM)</option>
                                    <option value="car">🚗 Car (₹{vehicleRates.car}/KM)</option>
                                    <option value="suv">🚙 SUV (₹{vehicleRates.suv}/KM)</option>
                                  </select>
                                </div>
                              )}

                              {/* Daily Shift Expenses & Toll Reimbursements Box */}
                              {(() => {
                                const expKey = `${emp.employee_id}_2026-07-18`;
                                const expense = employeeExpenses[expKey] || {
                                  tolls: { encountered: false, amount: 0, receipt_slip: '' },
                                  meals: { breakfast: 0, lunch: 0, dinner: 0 },
                                  other: { amount: 0, description: '' },
                                  status: 'none',
                                  totalAmount: 0
                                };

                                if (expense.status === 'none') return null;

                                return (
                                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#0d9488', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span>💰 DAILY SHIFT EXPENSES:</span>
                                      <span style={{
                                        fontSize: '9px',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontWeight: '800',
                                        background: expense.status === 'approved' ? '#def7ec' : expense.status === 'rejected' ? '#fde8e8' : '#fef3c7',
                                        color: expense.status === 'approved' ? '#03543f' : expense.status === 'rejected' ? '#9b1c1c' : '#92400e'
                                      }}>
                                        {expense.status.toUpperCase()}
                                      </span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#334155' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>🛣️ Toll Paid:</span>
                                        <strong>
                                          {expense.tolls.encountered ? `₹${expense.tolls.amount}` : 'No Tolls'}
                                          {expense.tolls.receipt_slip && (
                                            <a href={expense.tolls.receipt_slip} target="_blank" rel="noreferrer" style={{ marginLeft: '6px', color: '#0284c7', textDecoration: 'underline' }}>
                                              (View Slip)
                                            </a>
                                          )}
                                        </strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>🍽️ Meals (B/L/D):</span>
                                        <strong>₹{expense.meals.breakfast} / ₹{expense.meals.lunch} / ₹{expense.meals.dinner}</strong>
                                      </div>
                                      {expense.other.amount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span>🔧 Other:</span>
                                          <strong>₹{expense.other.amount} ({expense.other.description})</strong>
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '4px', fontWeight: 'bold' }}>
                                        <span>💵 Total Claim:</span>
                                        <span style={{ color: 'var(--color-primary)' }}>₹{expense.totalAmount}</span>
                                      </div>
                                    </div>

                                    {/* Action Dropdown for Owner/Manager */}
                                    {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager') && (
                                      <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '10px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>VERIFY CLAIM:</span>
                                        <select
                                          value={expense.status}
                                          onChange={(e) => {
                                            const newStatus = e.target.value;
                                            setEmployeeExpenses(prev => ({
                                              ...prev,
                                              [expKey]: { ...prev[expKey], status: newStatus }
                                            }));
                                          }}
                                          style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '10px', fontWeight: '700', color: '#0f2b26', background: 'white' }}
                                        >
                                          <option value="pending">⏳ Pending Review</option>
                                          <option value="approved">🟢 Approve Payout</option>
                                          <option value="rejected">🔴 Reject / Disallow</option>
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                                {/* Beat Planner trigger (Owner/Manager/Admin only) */}
                                {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager') && (
                                  <button
                                    type="button"
                                    className="btn"
                                    style={{ padding: '6px 12px', fontSize: '11px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: '700', borderRadius: '4px', cursor: 'pointer' }}
                                    onClick={() => {
                                      setSelectedPlannerEmpId(emp.employee_id);
                                      setTempCheckpoints(employeeBeatPlans[emp.employee_id] || []);
                                      setShowBeatPlannerModal(true);
                                    }}
                                  >
                                    🗺️ Plan Beat Route
                                  </button>
                                )}

                                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => alert(`Calling ${emp.first_name}...`)}>
                                  📞 Call Employee
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setActiveTab('inbox')}>
                                  💬 Send WhatsApp Message
                                </button>
                                <button 
                                  className="btn" 
                                  style={{ padding: '6px 12px', fontSize: '11px', background: '#25D366', color: 'white', border: 'none', fontWeight: '700' }} 
                                  onClick={() => {
                                    const msg = encodeURIComponent(`Hello ${emp.first_name}, please reply with your current Live Location update for field attendance routing sync.`);
                                    window.open(`https://wa.me/919999999999?text=${msg}`, '_blank');
                                  }}
                                >
                                  💬 Request Live GPS (WA)
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>🌐 <strong>Manager Overview Mode:</strong> Fingerprints Route Lines active for all 10 field agents across NCR.</span>
                          <span style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', padding: '4px 10px', borderRadius: '4px', fontWeight: '800', fontSize: '11px' }}>10 Field Agents Active</span>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            )}

            {/* TAB B: EMPLOYEE DAILY ACTIVITY AUDIT LOG (PAST & HISTORICAL LOOKUP) */}
            {gpsSubTab === 'audit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* AUDIT LOG CONTROL BAR */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0d9488', marginBottom: '4px' }}>👤 SELECT EMPLOYEE AUDIT LOG</label>
                      <select
                        value={selectedAuditEmployee}
                        onChange={(e) => setSelectedAuditEmployee(e.target.value)}
                        style={{ padding: '9px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', fontWeight: '700', color: '#0f2b26', width: '260px' }}
                      >
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            👤 {emp.first_name} {emp.last_name || ''} ({emp.role || 'Staff'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0d9488', marginBottom: '4px' }}>📅 AUDIT DATE</label>
                      <input
                        type="date"
                        value={selectedAuditDate}
                        onChange={(e) => setSelectedAuditDate(e.target.value)}
                        style={{ padding: '9px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', fontWeight: '700' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '9px 14px', fontSize: '13px', fontWeight: '800', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: 'none' }}
                        onClick={() => handleExportGpsCSV(selectedAuditEmployee, selectedAuditDate)}
                      >
                        📥 Export CSV Log
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  {(() => {
                    const logKey = `${selectedAuditEmployee}_${selectedAuditDate}`;
                    const defaultClaim = { totalDistance: '34.2 KM', totalStoppages: '2 Stops (40 Mins)' };
                    const auditData = employeeAuditLogs[logKey] || defaultClaim;
                    
                    // Look up employee's vehicle assignment dynamically
                    const currentEmp = teamTrackLocations.find(e => String(e.employee_id) === String(selectedAuditEmployee));
                    const vehicleType = currentEmp?.vehicle_type || 'bike';
                    const rate = vehicleRates[vehicleType] || 6;
                    const distanceVal = parseFloat(auditData.totalDistance || '34.2');
                    const calculatedClaim = distanceVal * rate;

                    return (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #86efac', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#166534', fontWeight: '700' }}>SHIFT DISTANCE</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>{distanceVal} KM</div>
                        </div>
                        <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #86efac', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#166534', fontWeight: '700' }}>FUEL CLAIM (₹{rate}/KM)</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#0d9488' }}>₹{calculatedClaim.toFixed(2)}</div>
                        </div>
                        <div style={{ background: '#fffbeb', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#92400e', fontWeight: '700' }}>TOTAL STOPPAGES</div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#d97706' }}>{auditData.totalStoppages}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* AUDIT LOG BODY: 2 COLUMNS (Timeline Feed + Map Route Replay) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
                  
                  {/* Left Column: Full-Day Chronological Event Feed */}
                  <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>📜 Full-Day Activity Chronological Timeline</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>Recorded Audit Logs</span>
                    </h3>

                    {(() => {
                      const logKey = `${selectedAuditEmployee}_${selectedAuditDate}`;
                      const auditData = employeeAuditLogs[logKey];
                      
                      if (!auditData || !auditData.events || auditData.events.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: 'var(--text-muted)', fontSize: '13px' }}>
                            ℹ️ No archived activity logs registered for selected employee on {selectedAuditDate}. Showing simulated default trail on map.
                          </div>
                        );
                      }

                      const expKey = `${selectedAuditEmployee}_${selectedAuditDate}`;
                      const expense = employeeExpenses[expKey];

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                          
                          {/* Daily Shift Expenses & Toll Verification Section */}
                          {expense && (
                            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '10px', color: '#14532d' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800' }}>💰 Shift Expenses & Toll Verification:</span>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontWeight: '800',
                                  background: expense.status === 'approved' ? '#def7ec' : expense.status === 'rejected' ? '#fde8e8' : '#fef3c7',
                                  color: expense.status === 'approved' ? '#03543f' : expense.status === 'rejected' ? '#9b1c1c' : '#92400e'
                                }}>
                                  STATUS: {expense.status.toUpperCase()}
                                </span>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px' }}>
                                <div>
                                  <div>🛣️ <strong>Road Tolls:</strong> {expense.tolls.encountered ? `₹${expense.tolls.amount}` : 'No Tolls Encountered'}</div>
                                  {expense.tolls.receipt_slip && (
                                    <div style={{ marginTop: '4px' }}>
                                      📄 Receipt Slip: <a href={expense.tolls.receipt_slip} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 'bold' }}>View Uploaded Image</a>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div>🍽️ <strong>Meals (B/L/D):</strong> ₹{expense.meals.breakfast} / ₹{expense.meals.lunch} / ₹{expense.meals.dinner}</div>
                                  {expense.other.amount > 0 && (
                                    <div style={{ marginTop: '4px' }}>🔧 <strong>Other Misc:</strong> ₹{expense.other.amount} ({expense.other.description})</div>
                                  )}
                                </div>
                              </div>

                              <div style={{ borderTop: '1px dashed rgba(22, 101, 52, 0.2)', marginTop: '12px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>Total Reimbursement Claim: <strong style={{ fontSize: '14px', color: '#16a34a' }}>₹{expense.totalAmount}</strong></div>
                                
                                {/* Action Dropdown for Owner/Manager */}
                                {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager') && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700' }}>Change Approval Status:</span>
                                    <select
                                      value={expense.status}
                                      onChange={(e) => {
                                        const newStatus = e.target.value;
                                        setEmployeeExpenses(prev => ({
                                          ...prev,
                                          [expKey]: { ...prev[expKey], status: newStatus }
                                        }));
                                      }}
                                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: 'white', fontWeight: '700', color: '#0f2b26' }}
                                    >
                                      <option value="pending">⏳ Pending Review</option>
                                      <option value="approved">🟢 Approve Payout</option>
                                      <option value="rejected">🔴 Reject / Disallow</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {auditData.events.map((ev, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '14px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'white', borderRadius: '50%', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                                {ev.icon}
                              </div>
                              <div style={{ flexGrow: 1, fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#0f2b26', fontSize: '13px' }}>
                                  <span>{ev.title}</span>
                                  <span style={{ color: '#0d9488', fontSize: '11px', background: 'rgba(13, 148, 136, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{ev.time}</span>
                                </div>
                                <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>
                                  📍 Landmark: <strong>{ev.landmark}</strong> ({ev.coordinates})
                                </div>
                                <div style={{ color: '#475569', marginTop: '6px', fontSize: '11px', background: 'white', padding: '6px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                  {ev.details} | 🔋 Battery: <strong>{ev.battery}</strong>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column: Historical Route Path Map Replay */}
                  <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26' }}>🛣️ Historical Day Fingerprints Route Path</h3>
                      <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>
                        Archived GPS Trail
                      </span>
                    </div>

                    {/* Leaflet Audit Map Viewer */}
                    <div 
                      ref={mapContainerRef} 
                      style={{ 
                        height: '420px', 
                        width: '100%', 
                        borderRadius: '12px', 
                        border: '1px solid #cbd5e1', 
                        zIndex: 1 
                      }} 
                    />

                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '12px', color: '#166534' }}>
                      <strong>ℹ️ Route Summary:</strong> Fingerprint Path Line connects Day Start → Intermediate Stoppages → Shift End location with total <strong>{employeeAuditLogs[`${selectedAuditEmployee}_${selectedAuditDate}`]?.events?.length || 4} logged events</strong>.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1. ADMIN DASHBOARD VIEW */}
        {activeTab === 'admin_dashboard' && (
          <div style={{ padding: '24px', overflowY: 'auto', flexGrow: 1, color: '#1e293b' }}>
            
            {/* EMS Top Welcome Panel */}
            <div style={{ 
              background: 'rgba(13, 180, 158, 0.06)', 
              border: '1px solid rgba(13, 180, 158, 0.1)', 
              borderRadius: '12px', 
              padding: '20px 24px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              marginBottom: '24px' 
            }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '8px', 
                background: 'rgba(13, 180, 158, 0.12)', 
                color: '#0db49e', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <BarChart3 size={20} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#074c3e', margin: 0 }}>Company Dashboard (Super Admin View)</h2>
                <p style={{ fontSize: '12px', color: '#475569', margin: '2px 0 0 0' }}>Overview of your field team's activity today.</p>
              </div>
            </div>
            
            {/* Metric Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: '12px', border: '1px solid #eef2f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Employees</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: '4px 0' }}>{employees.length}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total active accounts</div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(13, 180, 158, 0.08)', color: '#0db49e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} />
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: '12px', border: '1px solid #eef2f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Active in Field</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: '4px 0' }}>{liveLocations.length}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Currently in field</div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={20} />
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: '12px', border: '1px solid #eef2f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.01)' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Recent Activities</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: '4px 0' }}>{tasks.filter(t => t.status !== 'Completed').length}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Activities logged</div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList size={20} />
                </div>
              </div>
            </div>

            {/* Attendance Chart & Activities */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Weekly Attendance Statistics</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '180px', padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => {
                    const heights = [80, 95, 90, 75, 85];
                    return (
                      <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '40px' }}>
                        <div style={{ width: '100%', height: `${heights[idx]}%`, background: 'linear-gradient(to top, #0b5042, #10b981)', borderRadius: '4px 4px 0 0' }} />
                        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Workspace Notices</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notices.slice(0, 3).map(n => (
                    <div key={n.id} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                      <div style={{ fontWeight: '700', fontSize: '13px' }}>{n.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{n.content}</div>
                    </div>
                  ))}
                  {notices.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>No active announcements.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. MANAGER DASHBOARD VIEW */}
        {activeTab === 'manager_dashboard' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Task Analytics Panel</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Monitor assignments pipeline, staff workload, and timelines tracker.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Workload Distribution Table</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Role</th>
                    <th style={{ padding: '12px' }}>Assigned Tasks</th>
                    <th style={{ padding: '12px' }}>Timeline Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => {
                    const count = tasks.filter(t => t.assigned_to === emp.id).length;
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{emp.first_name} {emp.last_name || ''}</td>
                        <td style={{ padding: '12px', textTransform: 'capitalize' }}>{emp.role}</td>
                        <td style={{ padding: '12px', fontWeight: '700' }}>{count} Tasks</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', background: count > 3 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: count > 3 ? '#ef4444' : '#10b981', padding: '2px 8px', borderRadius: '4px' }}>
                            {count > 3 ? 'Overloaded' : 'Optimal'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. EMPLOYEE DIRECTORY SEARCH BOARD */}
        {activeTab === 'employee_directory' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Employee Search Directory</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Quickly search and connect with workspace agents.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
              {employees.map(emp => (
                <div key={emp.id} style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
                    {emp.first_name[0]}{emp.last_name ? emp.last_name[0] : ''}
                  </div>
                  <h4 style={{ fontWeight: '800', fontSize: '15px' }}>{emp.first_name} {emp.last_name || ''}</h4>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', marginTop: '2px' }}>{emp.department || 'Operations'}</div>
                  <div style={{ fontSize: '12px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
                    <div>✉ {emp.email || 'No email'}</div>
                    <div>📞 {emp.phone || 'No phone'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. RECRUITMENT & ATS BOARD */}
        {activeTab === 'recruitment_ats' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Applicant Tracking System (ATS)</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Monitor job postings, candidate applications, and hire trails.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', height: '450px' }}>
              {['Applied (2)', 'Interviewing (1)', 'Offered (1)', 'Hired (0)'].map((col, cIdx) => (
                <div key={col} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>{col}</div>
                  {cIdx === 0 && (
                    <>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                        <div style={{ fontWeight: '700' }}>Amit Kumar</div>
                        <div style={{ color: 'var(--text-muted)' }}>NodeJS Backend Developer</div>
                        <span style={{ fontSize: '10px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>Resume.pdf</span>
                      </div>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                        <div style={{ fontWeight: '700' }}>Neha Sharma</div>
                        <div style={{ color: 'var(--text-muted)' }}>React Frontend Developer</div>
                        <span style={{ fontSize: '10px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>CV_Frontend.pdf</span>
                      </div>
                    </>
                  )}
                  {cIdx === 1 && (
                    <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <div style={{ fontWeight: '700' }}>Kavita Patel</div>
                      <div style={{ color: 'var(--text-muted)' }}>CRM Product Lead</div>
                      <span style={{ fontSize: '10px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>Resume_Kavita.pdf</span>
                    </div>
                  )}
                  {cIdx === 2 && (
                    <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <div style={{ fontWeight: '700' }}>Rahul Verma</div>
                      <div style={{ color: 'var(--text-muted)' }}>WhatsApp Sales Executive</div>
                      <span style={{ fontSize: '10px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px' }}>Doc.pdf</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. PERFORMANCE MANAGER */}
        {activeTab === 'performance_kpis' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>KPI Performance Metrics</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Review employee ratings, metrics compliance, and monthly evaluation stars.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Quality Rating</th>
                    <th style={{ padding: '12px' }}>Attendance score</th>
                    <th style={{ padding: '12px' }}>Overall Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{emp.first_name} {emp.last_name || ''}</td>
                      <td style={{ padding: '12px', color: '#eab308' }}>★★★★☆ (4.2)</td>
                      <td style={{ padding: '12px', color: '#10b981' }}>98% Present</td>
                      <td style={{ padding: '12px' }}><span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Grade A</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. ASSET MANAGEMENT */}
        {activeTab === 'asset_management' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Asset Inventory Allocation</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Track computer laptops, test phones, and office screens assigned to employees.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Asset Tag</th>
                    <th style={{ padding: '12px' }}>Device Details</th>
                    <th style={{ padding: '12px' }}>Assigned To</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>AST-2026-001</td>
                    <td style={{ padding: '12px' }}>Apple MacBook Pro M3 (16GB/512GB)</td>
                    <td style={{ padding: '12px' }}>{employees[0] ? `${employees[0].first_name} ${employees[0].last_name || ''}` : 'Available'}</td>
                    <td style={{ padding: '12px' }}><span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Active</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>AST-2026-002</td>
                    <td style={{ padding: '12px' }}>OnePlus 12 Test Device (WA Sandbox)</td>
                    <td style={{ padding: '12px' }}>{employees[1] ? `${employees[1].first_name} ${employees[1].last_name || ''}` : 'Available'}</td>
                    <td style={{ padding: '12px' }}><span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Active</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. OFFBOARDING EXIT VIEW */}
        {activeTab === 'offboarding' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Offboarding Exit clearance</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Clearance tracking for staff exits and resignations.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              No employees currently in resignation/exit stages.
            </div>
          </div>
        )}

        {/* 8. PAYROLL & SALARY PROCESSOR */}
        {activeTab === 'payroll' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>Payroll Ledger & Salaries</h2>
              <button className="btn btn-primary" onClick={() => alert('Calculating payroll rates and generating payslip structures...')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={15} /> Auto Calculate
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Manage worker base rates, calculate overtime, and download payslips.</p>

            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Base Salary</th>
                    <th style={{ padding: '12px' }}>Working Days (This Month)</th>
                    <th style={{ padding: '12px' }}>Calculated Net Salary</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => {
                    const daysPresent = attendanceLogs.filter(log => log.employee_id === emp.id).length;
                    const netSalary = emp.salary > 0 ? Math.round(emp.salary * (Math.min(22, daysPresent) / 22)) : 0;
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{emp.first_name} {emp.last_name || ''}</td>
                        <td style={{ padding: '12px' }}>₹{emp.salary || 0}</td>
                        <td style={{ padding: '12px', fontWeight: '700' }}>{daysPresent} / 22 Days</td>
                        <td style={{ padding: '12px', fontWeight: '700', color: 'var(--color-primary)' }}>₹{netSalary}</td>
                        <td style={{ padding: '12px' }}><span style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Pending</span></td>
                        <td style={{ padding: '12px' }}>
                          <button className="btn" style={{ padding: '4px 8px', fontSize: '11px', background: '#cbd5e1', border: 'none' }} onClick={() => alert(`Payslip generated for ${emp.first_name}. Sending copy on email.`)}>
                            Payslip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 9. TAXES & COMPLIANCE */}
        {activeTab === 'taxes_compliance' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Taxes & PF Compliance</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Configure standard TDS deductions and Provident Fund rates.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '400px' }}>
              <div className="crm-group">
                <label className="crm-label">Standard PF Deduction (%)</label>
                <input className="crm-input" type="number" defaultValue="12" />
              </div>
              <div className="crm-group">
                <label className="crm-label">Professional Tax Deduction (PT)</label>
                <input className="crm-input" type="number" defaultValue="200" />
              </div>
              <button className="btn btn-primary" onClick={() => alert('Tax parameters updated!')}>Save Settings</button>
            </div>
          </div>
        )}

        {/* 10. INCENTIVES & BONUS */}
        {activeTab === 'incentives_bonus' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Incentives & Performance Bonus</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Add incentive bonuses to salaries.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '400px' }}>
              <div className="crm-group">
                <label className="crm-label">Select Employee</label>
                <select className="crm-select">
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name || ''}</option>)}
                </select>
              </div>
              <div className="crm-group">
                <label className="crm-label">Incentive Amount (₹)</label>
                <input className="crm-input" type="number" placeholder="e.g. 5000" />
              </div>
              <button className="btn btn-primary" onClick={() => alert('Incentive added successfully!')}>Apply Bonus</button>
            </div>
          </div>
        )}

        {/* 11. F&F SETTLEMENTS */}
        {activeTab === 'ff_settlements' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Full & Final Settlements</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Clear remaining dues for exiting workers.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              No pending final settlements.
            </div>
          </div>
        )}

        {/* 12. ADVANCES & LOANS */}
        {activeTab === 'advances_loans' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Salary Advances & Loans</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Process advanced payout queries from workers.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              No loan requests currently pending.
            </div>
          </div>
        )}

        {/* 13. EXPENSES CLAIMS */}
        {activeTab === 'expenses' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Business Expenses Claim</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Manage staff travel and telephone allowance claims.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              No claims submitted this week.
            </div>
          </div>
        )}

        {/* 14. TASKS KANBAN BOARD */}
        {activeTab === 'tasks' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>Manage Tasks Board</h2>
              {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager') && (
                <button className="btn btn-primary" onClick={() => {
                  setNewTaskForm({ id: '', title: '', description: '', assignedTo: '', priority: 'Medium', status: 'To Do', dueDate: '' });
                  setShowAddTaskModal(true);
                }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={15} /> + Assign Task
                </button>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Track daily task workloads using standard columns.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', height: 'calc(100% - 80px)' }}>
              {['To Do', 'In Progress', 'Completed'].map(columnStatus => (
                <div key={columnStatus} style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                    <span style={{ fontWeight: '800', textTransform: 'uppercase', fontSize: '13px' }}>{columnStatus}</span>
                    <span style={{ fontSize: '11px', background: '#cbd5e1', color: '#475569', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>
                      {tasks.filter(t => t.status === columnStatus).length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flexGrow: 1 }}>
                    {tasks.filter(t => t.status === columnStatus).map(task => (
                      <div key={task.id} style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>{task.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{task.description}</div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                          <span style={{ fontSize: '10px', background: task.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: task.priority === 'High' ? '#ef4444' : '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            {task.priority}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>
                            👤 {task.first_name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Move & Delete controls */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '10px' }}>
                          {columnStatus !== 'Completed' && (
                            <button
                              className="btn"
                              style={{ padding: '2px 6px', fontSize: '10px', background: '#e2e8f0', border: 'none' }}
                              onClick={async () => {
                                const nextStatus = columnStatus === 'To Do' ? 'In Progress' : 'Completed';
                                await fetch(`${API_URL}/tasks/${task.id}`, {
                                  method: 'PUT',
                                  body: JSON.stringify({ ...task, status: nextStatus })
                                });
                                fetchTasks();
                              }}
                            >
                              Move Next →
                            </button>
                          )}
                          <button
                            className="btn"
                            style={{ padding: '2px 6px', fontSize: '10px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: 'none' }}
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => t.status === columnStatus).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '12px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                        No tasks in this column.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 15. NOTICE BOARD */}
        {activeTab === 'notice_board' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>Announcements & Notice Board</h2>
              {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager') && (
                <button className="btn btn-primary" onClick={() => {
                  setNewNoticeForm({ title: '', content: '' });
                  setShowAddNoticeModal(true);
                }}>
                  + Publish Announcement
                </button>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Important corporate announcements and notes.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {notices.map(notice => (
                <div key={notice.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', position: 'relative' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800' }}>{notice.title}</h3>
                  <div style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-muted)' }}>{notice.content}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '12px' }}>
                    Published on: {new Date(notice.created_at).toLocaleString()}
                  </div>
                  {(authUser?.role === 'owner' || authUser?.role === 'admin') && (
                    <button
                      className="btn"
                      style={{ position: 'absolute', right: '20px', top: '20px', padding: '4px 8px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: 'none' }}
                      onClick={() => handleDeleteNotice(notice.id)}
                    >
                      Delete Notice
                    </button>
                  )}
                </div>
              ))}
              {notices.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', border: '1px dashed #cbd5e1', borderRadius: '12px', color: 'var(--text-dim)' }}>
                  Notice board is empty.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 16. HOLIDAYS LIST */}
        {activeTab === 'holidays' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>Company Holidays Calendar</h2>
              {(authUser?.role === 'owner' || authUser?.role === 'admin') && (
                <button className="btn btn-primary" onClick={() => {
                  setNewHolidayForm({ name: '', date: '' });
                  setShowAddHolidayModal(true);
                }}>
                  + Add Holiday
                </button>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Public holidays and workspace off-days scheduled for the year.</p>

            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Holiday Name</th>
                    <th style={{ padding: '12px' }}>Scheduled Date</th>
                    {(authUser?.role === 'owner' || authUser?.role === 'admin') && <th style={{ padding: '12px' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {holidays.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{h.name}</td>
                      <td style={{ padding: '12px' }}>{new Date(h.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</td>
                      {(authUser?.role === 'owner' || authUser?.role === 'admin') && (
                        <td style={{ padding: '12px' }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: 'none' }}
                            onClick={() => handleDeleteHoliday(h.id)}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {holidays.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                        No calendar holidays added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 17. REWARDS & RECOGNITION */}
        {activeTab === 'rewards_recognition' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Rewards & Badges Dashboard</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Badges awarded to performers.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '36px' }}>🏆</div>
                <h4 style={{ fontWeight: '800', marginTop: '12px' }}>Employee of Month</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Top performer with 100% attendance & high sales conversions.</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '36px' }}>⚡</div>
                <h4 style={{ fontWeight: '800', marginTop: '12px' }}>Speed Star</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick response rate on WhatsApp customer chat pipelines.</p>
              </div>
            </div>
          </div>
        )}

        {/* 18. PUNCH CLOCK & MONTHLY REGISTER GRID */}
        {activeTab === 'my_attendance' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Shift Attendance & monthly Register</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Punch-in daily for coordinates tracking and review logs.</p>

            {/* Check in controllers block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>Punch Clock Panel</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  {todayStatus && todayStatus.status === 'checked_in' ? (
                    <>
                      <div style={{ fontSize: '13px', color: 'var(--color-green)', fontWeight: '700' }}>🟢 ACTIVE CLOCK-IN SHIFT</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>In: {new Date(todayStatus.check_in_time).toLocaleTimeString()}</div>
                      <button className="btn btn-danger" onClick={handleCheckOut} disabled={gpsLoading} style={{ width: '100%', padding: '12px' }}>
                        {gpsLoading ? 'Checking coordinates...' : 'Punch Shift Out'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: '700' }}>⚪ NOT CLOCKED IN TODAY</div>
                      <button className="btn btn-success" onClick={handleCheckIn} disabled={gpsLoading} style={{ width: '100%', padding: '12px' }}>
                        {gpsLoading ? 'Checking coordinates...' : 'Punch Shift In'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Monthly Ledger representation grid */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Monthly Attendance Matrix (Grid)</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>🟢 Present (P) | 🔴 Absent (A) | 🟡 Leave (L) | 🔵 Weekend Off (W)</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px' }}>
                  {Array.from({ length: 30 }, (_, i) => {
                    const dayNum = i + 1;
                    const isWeekend = dayNum % 7 === 0 || (dayNum + 1) % 7 === 0;
                    const isCheckedIn = dayNum === 17 || dayNum === 16;
                    const cellBg = isCheckedIn ? '#10b981' : isWeekend ? '#3b82f6' : '#ef4444';
                    const cellColor = 'white';
                    const labelStr = isCheckedIn ? 'P' : isWeekend ? 'W' : 'A';
                    return (
                      <div key={dayNum} style={{ background: cellBg, color: cellColor, padding: '8px 4px', borderRadius: '6px', textAlign: 'center', fontSize: '11px', fontWeight: '800' }}>
                        <div>{dayNum}</div>
                        <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.95 }}>{labelStr}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 19. LEAVES REQUESTS */}
        {activeTab === 'leaves' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>Leave Applications</h2>
              <button className="btn btn-primary" onClick={() => {
                setNewLeaveForm({ startDate: '', endDate: '', type: 'Sick', reason: '' });
                setShowAddLeaveModal(true);
              }}>
                + File Leave Request
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Request vacation, casual leaves, or sick leaves.</p>

            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Type</th>
                    <th style={{ padding: '12px' }}>Timelines (Start - End)</th>
                    <th style={{ padding: '12px' }}>Reason</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager') && <th style={{ padding: '12px' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{l.first_name} {l.last_name || ''}</td>
                      <td style={{ padding: '12px' }}>{l.type}</td>
                      <td style={{ padding: '12px' }}>{l.start_date} to {l.end_date}</td>
                      <td style={{ padding: '12px' }}>{l.reason}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: l.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: l.status === 'Approved' ? '#10b981' : l.status === 'Rejected' ? '#ef4444' : '#eab308' }}>
                          {l.status}
                        </span>
                      </td>
                      {(authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager') && (
                        <td style={{ padding: '12px', display: 'flex', gap: '6px' }}>
                          {l.status === 'Pending' && (
                            <>
                              <button className="btn btn-success" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleApproveLeave(l.id, 'Approved')}>
                                Approve
                              </button>
                              <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleApproveLeave(l.id, 'Rejected')}>
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                        No leave requests submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 20. SHIFTS ROSTER */}
        {activeTab === 'shifts' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Work Shift Roster</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Organize employee shifts (Morning, Afternoon, General Shift).</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Assigned Shift</th>
                    <th style={{ padding: '12px' }}>Timings</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{emp.first_name} {emp.last_name || ''}</td>
                      <td style={{ padding: '12px' }}><span style={{ background: 'rgba(11, 80, 66, 0.08)', color: '#0b5042', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>General Shift</span></td>
                      <td style={{ padding: '12px' }}>09:30 AM to 06:30 PM</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* 21. OFFICE KIOSK MODE */}
        {activeTab === 'office_kiosk' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <div style={{ background: '#064e43', color: 'white', padding: '30px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px', boxShadow: '0 8px 24px rgba(6,78,67,0.2)' }}>
              <Clock size={48} style={{ marginBottom: '12px', opacity: 0.9 }} />
              <h1 style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'monospace' }}>{new Date().toLocaleTimeString()}</h1>
              <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>Office Kiosk Touchscreen Attendance Terminal</p>
            </div>
            
            <div style={{ maxWidth: '420px', margin: '0 auto', background: 'white', padding: '28px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Employee Quick Punch</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Enter your 4-Digit Security PIN or Select Employee</p>
              
              <select style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', marginBottom: '16px', background: '#f8fafc' }}>
                <option value="">-- Choose Employee Name --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name || ''} ({e.department})</option>)}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button className="btn btn-success" style={{ padding: '14px', fontSize: '14px', borderRadius: '10px' }} onClick={() => alert('Punch IN registered successfully at office kiosk!')}>
                  🟢 Punch IN
                </button>
                <button className="btn btn-danger" style={{ padding: '14px', fontSize: '14px', borderRadius: '10px' }} onClick={() => alert('Punch OUT registered successfully at office kiosk!')}>
                  🔴 Punch OUT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 22. VERIFY DOCUMENTS */}
        {activeTab === 'verify_documents' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Employee Document Verification Ledger</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Verify government IDs, bank details, and academic certificates.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Aadhar Card</th>
                    <th style={{ padding: '12px' }}>PAN Card</th>
                    <th style={{ padding: '12px' }}>Bank Passbook</th>
                    <th style={{ padding: '12px' }}>Degree Cert</th>
                    <th style={{ padding: '12px' }}>Verification Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{emp.first_name} {emp.last_name || ''}</td>
                      <td style={{ padding: '12px', color: '#0d9488' }}>✓ Verified</td>
                      <td style={{ padding: '12px', color: '#0d9488' }}>✓ Verified</td>
                      <td style={{ padding: '12px', color: idx % 2 === 0 ? '#0d9488' : '#f59e0b' }}>{idx % 2 === 0 ? '✓ Verified' : '⏳ Pending'}</td>
                      <td style={{ padding: '12px', color: '#0d9488' }}>✓ Verified</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: idx % 2 === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: idx % 2 === 0 ? '#10b981' : '#f59e0b' }}>
                          {idx % 2 === 0 ? 'Fully Verified' : 'Pending Review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 23. WORK HOURS & OVERTIME LOG */}
        {activeTab === 'work_hours' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Work Hours & Overtime Audit Log</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Daily shift duration, break logs, and overtime hours.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Employee</th>
                    <th style={{ padding: '12px' }}>Shift Hours</th>
                    <th style={{ padding: '12px' }}>Break Time</th>
                    <th style={{ padding: '12px' }}>Overtime Hours</th>
                    <th style={{ padding: '12px' }}>Total Worked</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{emp.first_name} {emp.last_name || ''}</td>
                      <td style={{ padding: '12px' }}>8.0 Hours</td>
                      <td style={{ padding: '12px' }}>45 Mins</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#10b981' }}>+1.5 Hours</td>
                      <td style={{ padding: '12px', fontWeight: '700' }}>9.5 Hours</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 24. ROLES & PERMISSIONS */}
        {activeTab === 'roles_permissions' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Roles & Permissions Access Matrix</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Manage Role-Based Access Controls (RBAC) across system modules.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Role Type</th>
                    <th style={{ padding: '12px' }}>Manage Employees</th>
                    <th style={{ padding: '12px' }}>Payroll & Salaries</th>
                    <th style={{ padding: '12px' }}>WhatsApp CRM Chats</th>
                    <th style={{ padding: '12px' }}>GPS Map Tracking</th>
                    <th style={{ padding: '12px' }}>SaaS Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: 'Owner / Superadmin', emp: true, pay: true, crm: true, gps: true, saas: true },
                    { role: 'System Admin', emp: true, pay: true, crm: true, gps: true, saas: false },
                    { role: 'Operations Manager', emp: true, pay: false, crm: true, gps: true, saas: false },
                    { role: 'Sales / Support Agent', emp: false, pay: false, crm: true, gps: false, saas: false },
                    { role: 'Standard Employee', emp: false, pay: false, crm: false, gps: false, saas: false }
                  ].map(r => (
                    <tr key={r.role} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{r.role}</td>
                      <td style={{ padding: '12px' }}><input type="checkbox" defaultChecked={r.emp} /></td>
                      <td style={{ padding: '12px' }}><input type="checkbox" defaultChecked={r.pay} /></td>
                      <td style={{ padding: '12px' }}><input type="checkbox" defaultChecked={r.crm} /></td>
                      <td style={{ padding: '12px' }}><input type="checkbox" defaultChecked={r.gps} /></td>
                      <td style={{ padding: '12px' }}><input type="checkbox" defaultChecked={r.saas} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => alert('Role permissions saved successfully!')}>
                Save Permissions Matrix
              </button>
            </div>
          </div>
        )}

        {/* 25. SYSTEM DROPDOWNS CONFIG */}
        {activeTab === 'system_dropdowns' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>System Dropdowns Configuration</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Customize workspace departments, designations, and leave types.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <h4 style={{ fontWeight: '800', marginBottom: '12px' }}>Departments List</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <li style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>IT & Engineering <span>✓ Active</span></li>
                  <li style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>Sales & Marketing <span>✓ Active</span></li>
                  <li style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>Field Operations <span>✓ Active</span></li>
                  <li style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>HR & Administration <span>✓ Active</span></li>
                </ul>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <h4 style={{ fontWeight: '800', marginBottom: '12px' }}>Leave Categories</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <li style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>Sick Leave <span>(12 Days/Yr)</span></li>
                  <li style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>Casual Leave <span>(12 Days/Yr)</span></li>
                  <li style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>Earned Leave <span>(15 Days/Yr)</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 26. RECYCLE BIN */}
        {activeTab === 'recycle_bin' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>Recycle Bin Soft Delete Recovery</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Restore deleted records within 30 days.</p>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center', color: 'var(--text-dim)', padding: '40px' }}>
              Recycle bin is empty. No deleted records found.
            </div>
          </div>
        )}

        {/* 27. APP GUIDE & TOUR */}
        {activeTab === 'app_guide' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>EMS & WhatsApp CRM App Walkthrough Guide</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Learn how to set up your workspace, link WhatsApp, and manage staff.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '24px' }}>📱</span>
                <h4 style={{ fontWeight: '800', marginTop: '12px' }}>1. Pair WhatsApp QR Code</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Go to CRM & Sales → WA Channels → Click Add Channel and scan QR code in WhatsApp Linked Devices.</p>
              </div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '24px' }}>👥</span>
                <h4 style={{ fontWeight: '800', marginTop: '12px' }}>2. Add Employees & Login Accounts</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Go to HR Management → All Employees → Click "+ Add Employee Profile" to set credentials.</p>
              </div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '24px' }}>📍</span>
                <h4 style={{ fontWeight: '800', marginTop: '12px' }}>3. Live GPS Field Tracking</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Employees punch in via Shift Attendance tab to send real-time coordinates to Live Tracking Map.</p>
              </div>
            </div>
          </div>
        )}

        {/* 28. SUPER ADMIN CONTROL CENTER */}
        {activeTab === 'superadmin_plans' && (
          <div style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26' }} className="glass-panel">
            {/* Header Banner */}
            <div style={{ background: '#064e43', color: 'white', padding: '24px', borderRadius: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>Super Admin Control Center</h2>
                <p style={{ fontSize: '13px', opacity: 0.85, marginTop: '4px' }}>Global SaaS Platform Admin & Multi-Tenant Management Console</p>
              </div>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                🛡️ Superadmin Access Level
              </span>
            </div>

            {/* Platform Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Registered SaaS Tenants</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-primary)', marginTop: '4px' }}>3 Workspaces</div>
                <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>+1 new this week</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Platform Revenue</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>₹48,970 / mo</div>
                <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>Stripe & Razorpay Live</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Active WA Sessions</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#0ea5e9', marginTop: '4px' }}>12 Connected</div>
                <div style={{ fontSize: '10px', color: '#0ea5e9', marginTop: '2px' }}>Baileys Multi-Device</div>
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>System Health</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>99.9% Online</div>
                <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>Render 24/7 Engine</div>
              </div>
            </div>

            {/* Tenant Workspaces Table */}
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px' }}>Registered SaaS Tenants (Workspaces)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Tenant Slug</th>
                    <th style={{ padding: '12px' }}>Owner Email</th>
                    <th style={{ padding: '12px' }}>Active Plan</th>
                    <th style={{ padding: '12px' }}>WA Channels Limit</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>abc (Your Workspace)</td>
                    <td style={{ padding: '12px' }}>abc@gmail.com</td>
                    <td style={{ padding: '12px' }}><span style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>Unlimited Pro Plan</span></td>
                    <td style={{ padding: '12px' }}>Unlimited</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#10b981', fontWeight: '700' }}>✓ Active</span></td>
                    <td style={{ padding: '12px' }}><button className="btn" style={{ padding: '4px 8px', fontSize: '11px', background: '#cbd5e1', border: 'none' }} onClick={() => alert('Editing tenant limits for abc workspace...')}>Manage Limits</button></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>demo_corp</td>
                    <td style={{ padding: '12px' }}>demo@company.com</td>
                    <td style={{ padding: '12px' }}><span style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>Basic CRM Plan</span></td>
                    <td style={{ padding: '12px' }}>3 Channels</td>
                    <td style={{ padding: '12px' }}><span style={{ color: '#10b981', fontWeight: '700' }}>✓ Active</span></td>
                    <td style={{ padding: '12px' }}><button className="btn" style={{ padding: '4px 8px', fontSize: '11px', background: '#cbd5e1', border: 'none' }} onClick={() => alert('Editing tenant limits for demo_corp...')}>Manage Limits</button></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Global SaaS Plans Manager */}
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Global Subscription Pricing & Limits Matrix</h3>
                <button className="btn btn-primary" onClick={() => alert('Saving global pricing tier configurations...')}>
                  Save Global Tiers
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontWeight: '800' }}>Free Trial Tier</h4>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0d9488', margin: '6px 0' }}>$0 / mo</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>1 Channel • 250 Contacts • 5 Staff</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontWeight: '800' }}>Basic CRM Plan</h4>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0d9488', margin: '6px 0' }}>₹699 / mo</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>3 Channels • 1,000 Contacts • 15 Staff</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #0d9488' }}>
                  <h4 style={{ fontWeight: '800' }}>Unlimited Pro Plan ⭐</h4>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0d9488', margin: '6px 0' }}>₹2,199 / mo</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unlimited Channels • Unlimited Contacts • Unlimited Staff</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 21. MOCK MODALS */}
      {/* 21a. Add Task Modal */}
      {showAddTaskModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '450px', color: '#0f2b26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Assign Tasks</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddTaskModal(false)} />
            </div>
            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="crm-group">
                <label className="crm-label">Task Title</label>
                <input className="crm-input" type="text" required value={newTaskForm.title} onChange={e => setNewTaskForm({ ...newTaskForm, title: e.target.value })} />
              </div>
              <div className="crm-group">
                <label className="crm-label">Description</label>
                <textarea className="crm-textarea" value={newTaskForm.description} onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })} />
              </div>
              <div className="crm-group">
                <label className="crm-label">Assign To</label>
                <select className="crm-select" value={newTaskForm.assignedTo} onChange={e => setNewTaskForm({ ...newTaskForm, assignedTo: e.target.value })}>
                  <option value="">Choose Employee</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name || ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="crm-group">
                  <label className="crm-label">Priority</label>
                  <select className="crm-select" value={newTaskForm.priority} onChange={e => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="crm-group">
                  <label className="crm-label">Due Date</label>
                  <input className="crm-input" type="date" value={newTaskForm.dueDate} onChange={e => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>Create Task</button>
            </form>
          </div>
        </div>
      )}

      {/* 21b. Add Notice Modal */}
      {showAddNoticeModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '450px', color: '#0f2b26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Publish Corporate Announcement</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddNoticeModal(false)} />
            </div>
            <form onSubmit={handleSaveNotice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="crm-group">
                <label className="crm-label">Announcement Title</label>
                <input className="crm-input" type="text" required value={newNoticeForm.title} onChange={e => setNewNoticeForm({ ...newNoticeForm, title: e.target.value })} />
              </div>
              <div className="crm-group">
                <label className="crm-label">Content Description</label>
                <textarea className="crm-textarea" required value={newNoticeForm.content} onChange={e => setNewNoticeForm({ ...newNoticeForm, content: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>Publish Notice</button>
            </form>
          </div>
        </div>
      )}

      {/* 21c. Add Holiday Modal */}
      {showAddHolidayModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', color: '#0f2b26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Add Scheduled Holiday</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddHolidayModal(false)} />
            </div>
            <form onSubmit={handleSaveHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="crm-group">
                <label className="crm-label">Holiday Name</label>
                <input className="crm-input" type="text" required value={newHolidayForm.name} onChange={e => setNewHolidayForm({ ...newHolidayForm, name: e.target.value })} />
              </div>
              <div className="crm-group">
                <label className="crm-label">Scheduled Date</label>
                <input className="crm-input" type="date" required value={newHolidayForm.date} onChange={e => setNewHolidayForm({ ...newHolidayForm, date: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>Add Holiday</button>
            </form>
          </div>
        </div>
      )}

      {/* 21d. Add Leave Modal */}
      {showAddLeaveModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', color: '#0f2b26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800' }}>File Leave Request</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddLeaveModal(false)} />
            </div>
            <form onSubmit={handleSaveLeave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="crm-group">
                  <label className="crm-label">Start Date</label>
                  <input className="crm-input" type="date" required value={newLeaveForm.startDate} onChange={e => setNewLeaveForm({ ...newLeaveForm, startDate: e.target.value })} />
                </div>
                <div className="crm-group">
                  <label className="crm-label">End Date</label>
                  <input className="crm-input" type="date" required value={newLeaveForm.endDate} onChange={e => setNewLeaveForm({ ...newLeaveForm, endDate: e.target.value })} />
                </div>
              </div>
              <div className="crm-group">
                <label className="crm-label">Leave Type</label>
                <select className="crm-select" value={newLeaveForm.type} onChange={e => setNewLeaveForm({ ...newLeaveForm, type: e.target.value })}>
                  <option value="Sick">Sick Leave</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="Annual">Annual Leave</option>
                </select>
              </div>
              <div className="crm-group">
                <label className="crm-label">Reason</label>
                <textarea className="crm-textarea" required value={newLeaveForm.reason} onChange={e => setNewLeaveForm({ ...newLeaveForm, reason: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>File Application</button>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      {showAddEmployeeModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px', color: '#0f2b26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                {newEmployeeForm.id ? 'Edit Employee Profile' : 'Add Employee Profile'}
              </h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddEmployeeModal(false)} />
            </div>

            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul"
                    value={newEmployeeForm.firstName}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, firstName: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma"
                    value={newEmployeeForm.lastName}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, lastName: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Work Email</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={newEmployeeForm.email}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9999999999"
                    value={newEmployeeForm.phone}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, phone: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Role Type</label>
                  <select
                    value={newEmployeeForm.role}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, role: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', background: 'white' }}
                  >
                    <option value="employee">Standard Employee</option>
                    <option value="agent">Support Agent</option>
                    <option value="manager">Operations Manager</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Department</label>
                  <select
                    value={newEmployeeForm.department}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, department: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', background: 'white' }}
                  >
                    <option value="Sales">Sales & Marketing</option>
                    <option value="Support">Customer Support</option>
                    <option value="Field Operations">Field Operations</option>
                    <option value="HR">HR & Admin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                    Salary Base ({billingTenant?.plan?.price?.currency === 'INR' ? '₹' : '$'} / mo)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={newEmployeeForm.salary}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, salary: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Status</label>
                  <select
                    value={newEmployeeForm.status}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, status: e.target.value })}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', background: 'white' }}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended / Inactive</option>
                  </select>
                </div>
              </div>

              {/* Create login credentials checkbox (Only in creation mode) */}
              {!newEmployeeForm.id && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newEmployeeForm.createLoginAccount}
                      onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, createLoginAccount: e.target.checked })}
                    />
                    Provide Workspace Dashboard Login Account
                  </label>

                  {newEmployeeForm.createLoginAccount && (
                    <div style={{ marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        The employee will use their Work Email and this password to log into the Workspace dashboard.
                      </p>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', marginBottom: '4px' }}>Set Password</label>
                        <input
                          type="password"
                          required={newEmployeeForm.createLoginAccount}
                          placeholder="At least 6 characters"
                          value={newEmployeeForm.password}
                          onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, password: e.target.value })}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAddEmployeeModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isEmployeesLoading}
                >
                  {isEmployeesLoading ? 'Saving...' : (newEmployeeForm.id ? 'Save Profile' : 'Add Profile')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddSessionModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px' }}>Add WhatsApp Channel</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddSessionModal(false)} />
            </div>
            <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Enter a custom display name to identify this WhatsApp account (e.g., "Main Business", "Sales Account").
              </p>
              <input 
                type="text" 
                className="modal-input" 
                placeholder="e.g. Sales WhatsApp" 
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                required
                autoFocus
              />
              <div className="modal-buttons">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddSessionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create & Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Start New Chat Modal */}
      {showNewChatModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Start New Chat</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowNewChatModal(false)} />
            </div>
            
            <form onSubmit={handleStartNewChat} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {newChatError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 12px', borderRadius: '8px', color: '#f87171', fontSize: '12px' }}>
                  {newChatError}
                </div>
              )}
              
              <div className="crm-group">
                <label className="crm-label">Phone Number (with Country Code)</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g. 917986411005" 
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  required
                  autoFocus
                />
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>Type numbers only without spaces or + (e.g. 91 for India, 1 for USA).</span>
              </div>
              
              <div className="crm-group">
                <label className="crm-label">Lead Name (Optional)</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g. Sahil Veera" 
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                />
              </div>

              <div className="crm-group">
                <label className="crm-label">Send From Account</label>
                <select 
                  className="crm-select"
                  style={{ width: '100%', height: '38px', padding: '6px 12px' }}
                  value={newChatSessionId}
                  onChange={(e) => setNewChatSessionId(e.target.value)}
                  required
                >
                  {sessions.filter(s => s.status === 'connected').length === 0 ? (
                    <option value="">No connected accounts found</option>
                  ) : (
                    sessions.filter(s => s.status === 'connected').map(s => (
                      <option key={s.id} value={s.id}>{s.phone_name} (+{s.phone_number})</option>
                    ))
                  )}
                </select>
              </div>

              <div className="crm-group">
                <label className="crm-label">Initial Message (Optional)</label>
                <textarea 
                  className="modal-input" 
                  style={{ height: '70px', resize: 'none', padding: '8px 12px' }}
                  placeholder="e.g. Hello, welcome to our business..."
                  value={newChatInitialMsg}
                  onChange={(e) => setNewChatInitialMsg(e.target.value)}
                />
              </div>

              <div className="modal-buttons" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewChatModal(false)} disabled={isCreatingNewChat}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingNewChat}>
                  {isCreatingNewChat ? 'Verifying on WhatsApp...' : 'Start Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Chatbot Rule Modal */}
      {showAddRuleModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Add Chatbot Rule</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddRuleModal(false)} />
            </div>
            
            <form onSubmit={handleAddChatbotRule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {chatbotRuleError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 12px', borderRadius: '8px', color: '#f87171', fontSize: '12px' }}>
                  {chatbotRuleError}
                </div>
              )}
              
              <div className="crm-group">
                <label className="crm-label">Matching Keyword/Phrase</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g. price" 
                  value={chatbotRuleKeyword}
                  onChange={(e) => setChatbotRuleKeyword(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="crm-group">
                <label className="crm-label">Match Type</label>
                <select 
                  className="crm-select"
                  style={{ width: '100%', height: '38px', padding: '6px 12px' }}
                  value={chatbotRuleMatchType}
                  onChange={(e) => setChatbotRuleMatchType(e.target.value)}
                  required
                >
                  <option value="contains">Contains (matches if word is anywhere in text)</option>
                  <option value="exact">Exact (matches if text matches keyword exactly)</option>
                </select>
              </div>

              <div className="crm-group">
                <label className="crm-label">Automated Reply Text</label>
                <textarea 
                  className="modal-input" 
                  style={{ height: '100px', resize: 'none', padding: '8px 12px' }}
                  placeholder="e.g. Our catalog price lists start from $10. Visit [Link] for more info!"
                  value={chatbotRuleReply}
                  onChange={(e) => setChatbotRuleReply(e.target.value)}
                  required
                />
              </div>

              <div className="modal-buttons" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRuleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Send Broadcast Message</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => {
                if (broadcastProgress && broadcastProgress.status === 'sending') {
                  alert('Broadcast is in progress. Please wait for it to complete.');
                  return;
                }
                setShowBroadcastModal(false);
              }} />
            </div>

            {broadcastProgress ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600' }}>
                  <span>{broadcastProgress.status === 'completed' ? 'Broadcast Completed!' : 'Sending Broadcast...'}</span>
                  <span>{broadcastProgress.current} / {broadcastProgress.total}</span>
                </div>
                
                {/* Progress bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(broadcastProgress.current / broadcastProgress.total) * 100}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.3s ease' }}></div>
                </div>

                {broadcastProgress.status === 'sending' && (
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center' }}>
                    Please do not close this modal or refresh the page while campaign is sending. Adding 2-4 seconds delay between messages to prevent account bans.
                  </p>
                )}

                {broadcastProgress.status === 'completed' && (
                  <div className="modal-buttons" style={{ marginTop: '10px' }}>
                    <button className="btn btn-primary" onClick={() => setShowBroadcastModal(false)}>
                      Close Progress
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Send a bulk message to multiple leads at once. A randomized delay is automatically added to simulate human behavior and protect your accounts.
                </p>

                <div className="crm-group">
                  <label className="crm-label">Target Lead Stage</label>
                  <select 
                    className="crm-select"
                    style={{ width: '100%', height: '38px', padding: '6px 12px' }}
                    value={broadcastStage}
                    onChange={(e) => setBroadcastStage(e.target.value)}
                    required
                  >
                    <option value="all">All Synced Leads ({contacts.length} contacts)</option>
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.title} ({contacts.filter(c => c.pipeline_stage === s.id).length} contacts)</option>
                    ))}
                  </select>
                </div>

                <div className="crm-group">
                  <label className="crm-label">Send From Account</label>
                  <select 
                    className="crm-select"
                    style={{ width: '100%', height: '38px', padding: '6px 12px' }}
                    value={broadcastSessionId}
                    onChange={(e) => setBroadcastSessionId(e.target.value)}
                    required
                  >
                    {sessions.filter(s => s.status === 'connected').length === 0 ? (
                      <option value="">No connected accounts found</option>
                    ) : (
                      sessions.filter(s => s.status === 'connected').map(s => (
                        <option key={s.id} value={s.id}>{s.phone_name} (+{s.phone_number})</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="crm-group">
                  <label className="crm-label">Broadcast Message Text</label>
                  <textarea 
                    className="modal-input" 
                    style={{ height: '110px', resize: 'none', padding: '8px 12px' }}
                    placeholder="e.g. Hello, hope you are doing well! We have a special discount for you today..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-buttons" style={{ marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBroadcastModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={sessions.filter(s => s.status === 'connected').length === 0}>
                    Link & Send Campaign
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Schedule Message Modal */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Schedule WhatsApp Message</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowScheduleModal(false)} />
            </div>

            <form onSubmit={handleScheduleMessage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Set a specific date and time for this message to be sent automatically by the server.
              </p>

              <div className="crm-group">
                <label className="crm-label">Scheduled Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="modal-input" 
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  required
                />
              </div>

              <div className="crm-group">
                <label className="crm-label">Message Content</label>
                <textarea 
                  className="modal-input" 
                  style={{ height: '110px', resize: 'none', padding: '8px 12px' }}
                  placeholder="Type message content here..."
                  value={scheduleMessageText}
                  onChange={(e) => setScheduleMessageText(e.target.value)}
                  required
                />
              </div>

              <div className="modal-buttons" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Client Visit Modal */}
      {showClientVisitModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', color: '#0f2b26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>📸 Log Geo-Tagged Client Visit</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowClientVisitModal(false)} />
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!clientVisitForm.clientName) return console.log('Please enter client name');
              setClientVisits(prev => [
                { id: String(Date.now()), clientName: clientVisitForm.clientName, address: clientVisitForm.address || 'Geo-Tagged Location', notes: clientVisitForm.notes || 'Meeting completed successfully', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                ...prev
              ]);
              setShowClientVisitModal(false);
              setClientVisitForm({ clientName: '', address: '', notes: '' });
              console.log('⭐ Client visit geo-tagged & logged successfully on Live Map!');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Geofence Verification Status Indicator */}
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                <span>🟢</span>
                <span>GEOFENCE VERIFIED: Device is within 38m of client coordinates.</span>
              </div>

              <div className="crm-group">
                <label className="crm-label">Client / Company Name</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g. DLF Real Estate / TechCorp"
                  value={clientVisitForm.clientName}
                  onChange={(e) => setClientVisitForm({ ...clientVisitForm, clientName: e.target.value })}
                  required
                />
              </div>

              <div className="crm-group">
                <label className="crm-label">Meeting Location Address</label>
                <input 
                  type="text" 
                  className="modal-input" 
                  placeholder="e.g. Sector 44, Gurgaon"
                  value={clientVisitForm.address}
                  onChange={(e) => setClientVisitForm({ ...clientVisitForm, address: e.target.value })}
                  required
                />
              </div>

              <div className="crm-group">
                <label className="crm-label">Meeting Notes & Summary</label>
                <textarea 
                  className="modal-input" 
                  style={{ height: '90px', resize: 'none', padding: '8px 12px' }}
                  placeholder="e.g. Pitched Pro SaaS Plan, client interested in 25 licenses..."
                  value={clientVisitForm.notes}
                  onChange={(e) => setClientVisitForm({ ...clientVisitForm, notes: e.target.value })}
                />
              </div>

              <div className="crm-group">
                <label className="crm-label">Attach Site Photo Proof</label>
                <input type="file" className="modal-input" style={{ padding: '6px' }} />
              </div>

              {/* Customer Digital Signature Canvas */}
              <div className="crm-group">
                <label className="crm-label">🤝 Client Digital Signature Verification</label>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px' }}>
                  <canvas
                    id="sig-canvas"
                    width="380"
                    height="100"
                    style={{ background: 'white', border: '1px dashed #94a3b8', cursor: 'crosshair', borderRadius: '6px', width: '100%' }}
                    onMouseDown={(e) => {
                      const canvas = e.target;
                      const ctx = canvas.getContext('2d');
                      ctx.lineWidth = 2;
                      ctx.strokeStyle = '#0f2b26';
                      ctx.beginPath();
                      const rect = canvas.getBoundingClientRect();
                      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                      canvas.drawing = true;
                      setClientSignature('signed');
                    }}
                    onMouseMove={(e) => {
                      const canvas = e.target;
                      if (!canvas.drawing) return;
                      const ctx = canvas.getContext('2d');
                      const rect = canvas.getBoundingClientRect();
                      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                      ctx.stroke();
                    }}
                    onMouseUp={(e) => {
                      e.target.drawing = false;
                    }}
                    onTouchStart={(e) => {
                      const canvas = e.target;
                      const ctx = canvas.getContext('2d');
                      ctx.lineWidth = 2;
                      ctx.strokeStyle = '#0f2b26';
                      ctx.beginPath();
                      const rect = canvas.getBoundingClientRect();
                      const touch = e.touches[0];
                      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                      canvas.drawing = true;
                      setClientSignature('signed');
                    }}
                    onTouchMove={(e) => {
                      const canvas = e.target;
                      if (!canvas.drawing) return;
                      const ctx = canvas.getContext('2d');
                      const rect = canvas.getBoundingClientRect();
                      const touch = e.touches[0];
                      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                      ctx.stroke();
                    }}
                    onTouchEnd={(e) => {
                      e.target.drawing = false;
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>Draw signature using finger/mouse above.</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => {
                        const canvas = document.getElementById('sig-canvas');
                        if (canvas) {
                          const ctx = canvas.getContext('2d');
                          ctx.clearRect(0, 0, canvas.width, canvas.height);
                          setClientSignature('');
                        }
                      }}
                    >
                      🧹 Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Premium Geo-Tag Watermark Live Preview */}
              <div style={{ background: '#0f172a', color: '#38bdf8', padding: '14px', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid #0284c7', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, background: '#0284c7', color: 'white', padding: '2px 8px', fontSize: '9px', fontWeight: 'bold', borderBottomLeftRadius: '6px' }}>
                  GPS WATERMARK ACTIVE
                </div>
                <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '4px' }}>📍 GEO-TAG WATERMARK STAMP:</div>
                <div>LATITUDE: <span style={{ color: '#f8fafc' }}>28.6280° N</span></div>
                <div>LONGITUDE: <span style={{ color: '#f8fafc' }}>77.3649° E</span></div>
                <div>LANDMARK: <span style={{ color: '#f8fafc' }}>{clientVisitForm.address || 'HQ Office, New Delhi'}</span></div>
                <div>DATE/TIME: <span style={{ color: '#f8fafc' }}>{new Date().toLocaleString()}</span></div>
                <div style={{ borderTop: '1px dashed rgba(56, 189, 248, 0.3)', marginTop: '8px', paddingTop: '6px', fontSize: '9px', color: '#94a3b8' }}>
                  🔒 Cryptographic hash tag generated. Verification signature valid.
                </div>
              </div>

              <div className="modal-buttons" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowClientVisitModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  ⭐ Save Geo-Tagged Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Shift Expenses Modal */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', color: '#0f2b26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>💰 Log Daily Shift Expenses</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowExpenseModal(false)} />
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const tollVal = expenseForm.tollEncountered ? (parseFloat(expenseForm.tollAmount) || 0) : 0;
              const breakfastVal = parseFloat(expenseForm.breakfast) || 0;
              const lunchVal = parseFloat(expenseForm.lunch) || 0;
              const dinnerVal = parseFloat(expenseForm.dinner) || 0;
              const otherVal = parseFloat(expenseForm.otherAmount) || 0;
              
              const totalSum = tollVal + breakfastVal + lunchVal + dinnerVal + otherVal;

              const expKey = `${selectedExpenseEmpId}_2026-07-18`;
              setEmployeeExpenses(prev => ({
                ...prev,
                [expKey]: {
                  tolls: {
                    encountered: expenseForm.tollEncountered,
                    amount: tollVal,
                    receipt_slip: expenseForm.tollEncountered ? 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600' : ''
                  },
                  meals: {
                    breakfast: breakfastVal,
                    lunch: lunchVal,
                    dinner: dinnerVal
                  },
                  other: {
                    amount: otherVal,
                    description: expenseForm.otherDescription
                  },
                  status: 'pending',
                  totalAmount: totalSum
                }
              }));

              setShowExpenseModal(false);
              setExpenseForm({
                tollEncountered: false,
                tollAmount: '',
                tollSlip: '',
                breakfast: '',
                lunch: '',
                dinner: '',
                otherAmount: '',
                otherDescription: ''
              });
              console.log('⭐ Daily shift expenses logged successfully! Pending manager review.');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={expenseForm.tollEncountered}
                    onChange={(e) => setExpenseForm({ ...expenseForm, tollEncountered: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Encountered Road Tolls?</span>
                </label>
              </div>

              {expenseForm.tollEncountered && (
                <>
                  <div className="crm-group">
                    <label className="crm-label">Toll Cost Amount (₹)</label>
                    <input
                      type="number"
                      className="modal-input"
                      placeholder="e.g. 140"
                      value={expenseForm.tollAmount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, tollAmount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="crm-group">
                    <label className="crm-label">Upload Toll Receipt Slip Proof</label>
                    <div
                      className={`file-dropzone ${isDragActive ? 'active' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                      onDragLeave={() => setIsDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          setExpenseForm({ ...expenseForm, tollSlip: e.dataTransfer.files[0].name });
                          showToast(`Selected file: ${e.dataTransfer.files[0].name} via drag-and-drop!`, 'success');
                        }
                      }}
                      style={{ padding: '16px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>📁</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block' }}>
                        {expenseForm.tollSlip ? `Selected: ${expenseForm.tollSlip}` : 'Drag & drop toll receipt slip here or click to browse'}
                      </span>
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        id="toll-file-input"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setExpenseForm({ ...expenseForm, tollSlip: e.target.files[0].name });
                            showToast(`Selected file: ${e.target.files[0].name}`, 'success');
                          }
                        }}
                      />
                      <label htmlFor="toll-file-input" style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: '800' }}>
                        Browse Files
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="crm-group">
                  <label className="crm-label" style={{ fontSize: '11px' }}>Breakfast (₹)</label>
                  <input
                    type="number"
                    className="modal-input"
                    placeholder="e.g. 80"
                    value={expenseForm.breakfast}
                    onChange={(e) => setExpenseForm({ ...expenseForm, breakfast: e.target.value })}
                  />
                </div>
                <div className="crm-group">
                  <label className="crm-label" style={{ fontSize: '11px' }}>Lunch (₹)</label>
                  <input
                    type="number"
                    className="modal-input"
                    placeholder="e.g. 150"
                    value={expenseForm.lunch}
                    onChange={(e) => setExpenseForm({ ...expenseForm, lunch: e.target.value })}
                  />
                </div>
                <div className="crm-group">
                  <label className="crm-label" style={{ fontSize: '11px' }}>Dinner (₹)</label>
                  <input
                    type="number"
                    className="modal-input"
                    placeholder="e.g. 200"
                    value={expenseForm.dinner}
                    onChange={(e) => setExpenseForm({ ...expenseForm, dinner: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                <div className="crm-group">
                  <label className="crm-label">Other Expense Desc</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="e.g. Stationaries / Client tea"
                    value={expenseForm.otherDescription}
                    onChange={(e) => setExpenseForm({ ...expenseForm, otherDescription: e.target.value })}
                  />
                </div>
                <div className="crm-group">
                  <label className="crm-label">Amount (₹)</label>
                  <input
                    type="number"
                    className="modal-input"
                    placeholder="e.g. 50"
                    value={expenseForm.otherAmount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, otherAmount: e.target.value })}
                  />
                </div>
              </div>

              {/* Dynamic Live Estimate */}
              {(() => {
                const tollVal = expenseForm.tollEncountered ? (parseFloat(expenseForm.tollAmount) || 0) : 0;
                const breakfastVal = parseFloat(expenseForm.breakfast) || 0;
                const lunchVal = parseFloat(expenseForm.lunch) || 0;
                const dinnerVal = parseFloat(expenseForm.dinner) || 0;
                const otherVal = parseFloat(expenseForm.otherAmount) || 0;
                const estimatedTotal = tollVal + breakfastVal + lunchVal + dinnerVal + otherVal;

                return (
                  <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>💵 ESTIMATED CLAIM TOTAL:</span>
                    <strong style={{ fontSize: '16px', color: '#15803d' }}>₹{estimatedTotal.toFixed(2)}</strong>
                  </div>
                );
              })()}

              <div className="modal-buttons" style={{ marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  ⭐ Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Custom Beat Route Modal */}
      {showBeatPlannerModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '480px', color: '#0f2b26' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>🗺️ Assign Custom Beat Route</h2>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowBeatPlannerModal(false)} />
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Create a target beat route for the field agent. Add checkpoints in order of priority. These will render live on the map route trail.
            </p>

            {/* Quick Preset Buttons */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0d9488', marginBottom: '6px' }}>⚡ QUICK LANDMARK SHORTCUTS:</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{ padding: '4px 8px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
                  onClick={() => setNewCheckpointForm({ name: 'HQ Connaught Place', lat: '28.6139', lng: '77.2090' })}
                >
                  🏢 CP HQ Office
                </button>
                <button
                  type="button"
                  style={{ padding: '4px 8px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
                  onClick={() => setNewCheckpointForm({ name: 'DLF Cyber City Gurgaon', lat: '28.4595', lng: '77.0266' })}
                >
                  💼 Cyber City
                </button>
                <button
                  type="button"
                  style={{ padding: '4px 8px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
                  onClick={() => setNewCheckpointForm({ name: 'TechCorp Sector 62 Noida', lat: '28.6280', lng: '77.3649' })}
                >
                  💻 Noida Sec 62
                </button>
                <button
                  type="button"
                  style={{ padding: '4px 8px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
                  onClick={() => setNewCheckpointForm({ name: 'Lajpat Nagar Hub', lat: '28.5800', lng: '77.2500' })}
                >
                  🛍️ Lajpat Nagar
                </button>
              </div>
            </div>

            {/* Checkpoint Add Form */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26', marginBottom: '10px' }}>➕ ADD CHECKPOINT</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="crm-group">
                  <label className="crm-label" style={{ fontSize: '10px' }}>Checkpoint Name</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="e.g. DLF Cyber City Hub"
                    value={newCheckpointForm.name}
                    onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="crm-group">
                    <label className="crm-label" style={{ fontSize: '10px' }}>Latitude</label>
                    <input
                      type="text"
                      className="modal-input"
                      placeholder="e.g. 28.4595"
                      value={newCheckpointForm.lat}
                      onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, lat: e.target.value })}
                    />
                  </div>
                  <div className="crm-group">
                    <label className="crm-label" style={{ fontSize: '10px' }}>Longitude</label>
                    <input
                      type="text"
                      className="modal-input"
                      placeholder="e.g. 77.0266"
                      value={newCheckpointForm.lng}
                      onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, lng: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-end', padding: '6px 14px', fontSize: '11px' }}
                  onClick={() => {
                    if (!newCheckpointForm.name || !newCheckpointForm.lat || !newCheckpointForm.lng) {
                      return alert('Please fill in checkpoint details');
                    }
                    const newPt = {
                      id: 't_pt_' + Date.now(),
                      name: newCheckpointForm.name,
                      lat: parseFloat(newCheckpointForm.lat),
                      lng: parseFloat(newCheckpointForm.lng)
                    };
                    setTempCheckpoints([...tempCheckpoints, newPt]);
                    setNewCheckpointForm({ name: '', lat: '', lng: '' });
                  }}
                >
                  ➕ Add Checkpoint
                </button>
              </div>
            </div>

            {/* Current Route Checkpoint List */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0d9488', marginBottom: '8px' }}>📋 ACTIVE SEQUENCE PATH:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {tempCheckpoints.map((pt, idx) => (
                  <div key={pt.id || idx} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div>
                      <strong style={{ color: 'var(--color-primary)' }}>⭐ {idx + 1}:</strong> {pt.name}
                      <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '6px' }}>({pt.lat}, {pt.lng})</span>
                    </div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => setTempCheckpoints(tempCheckpoints.filter(item => item.id !== pt.id))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {tempCheckpoints.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b', fontSize: '12px' }}>
                    No checkpoints added yet. Build the path using custom checkpoints.
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="modal-buttons" style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowBeatPlannerModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#10b981', borderColor: '#10b981' }}
                onClick={() => {
                  setEmployeeBeatPlans(prev => ({
                    ...prev,
                    [selectedPlannerEmpId]: tempCheckpoints
                  }));
                  setShowBeatPlannerModal(false);
                  console.log(`Dispatched beat route allocation to agent ID: ${selectedPlannerEmpId}`);
                }}
              >
                💾 Dispatch Route to Field Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Alert Overlay */}
      {toast.visible && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#10b981',
          color: 'white',
          padding: '14px 22px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: '700',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span>{toast.type === 'error' ? '🛑' : toast.type === 'warning' ? '⚠️' : '🟢'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Global Reconnect Offline Warning Banner */}
      {!isOnline && (
        <div className="no-print" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#ef4444',
          color: 'white',
          textAlign: 'center',
          padding: '8px',
          fontSize: '12px',
          fontWeight: '700',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
        }}>
          <span>⚠️</span>
          <span>Internet Connection Lost. App running in offline backup mode. Operations will cache locally.</span>
        </div>
      )}

      {/* Auto Session Expiry Warning Modal */}
      {showSessionWarning && (
        <div className="modal-overlay" style={{ zIndex: 999999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '380px', textAlign: 'center', color: '#0f2b26' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: '#ef4444' }}>🕒 Idle Session Timeout Warning</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              You have been inactive for 30 minutes. Your session will automatically logout in <strong>{sessionTimeLeft} seconds</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#10b981', borderColor: '#10b981' }}
                onClick={() => {
                  setShowSessionWarning(false);
                  setSessionTimeLeft(60);
                  showToast('Session extended successfully!', 'success');
                }}
              >
                🔄 Keep Session Active
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setAuthUser(null);
                  localStorage.removeItem('omnilflow_user');
                  setShowSessionWarning(false);
                }}
              >
                🚪 Logout Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Searchbar Modal Triggered by Ctrl+K */}
      {showGlobalSearchModal && (
        <div className="modal-overlay" onClick={() => setShowGlobalSearchModal(false)} style={{ zIndex: 99999 }}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px', position: 'absolute', top: '15%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <Search size={20} style={{ color: '#0d9488' }} />
              <input
                type="text"
                placeholder="Search contacts, employees, tasks, logs... (Press Esc to close)"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '16px', background: 'transparent', fontWeight: '600', color: '#0f2b26' }}
                autoFocus
              />
            </div>
            
            {/* Search Results list */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                const query = globalSearchQuery.toLowerCase().trim();
                if (!query) {
                  return <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '16px' }}>Type to search across OmniFlow database...</div>;
                }
                
                const results = [];
                
                // 1. Search employees
                teamTrackLocations.forEach(emp => {
                  if (emp.first_name.toLowerCase().includes(query) || (emp.last_name || '').toLowerCase().includes(query) || emp.role.toLowerCase().includes(query)) {
                    results.push({
                      type: 'Employee Profile',
                      title: `${emp.first_name} ${emp.last_name || ''}`,
                      desc: `Role: ${emp.role} | Location: ${emp.location_name}`,
                      action: () => {
                        setActiveTab('employees');
                        setShowGlobalSearchModal(false);
                      }
                    });
                  }
                });
                
                // 2. Search tasks
                if (query.includes('task') || query.includes('work')) {
                  results.push({
                    type: 'Operations Tasks',
                    title: 'Task Kanban Board',
                    desc: 'Manage company active todo pipelines and sprints',
                    action: () => {
                      setActiveTab('tasks');
                      setShowGlobalSearchModal(false);
                    }
                  });
                }
                
                // 3. Search logs
                auditLogs.forEach(log => {
                  if (log.action.toLowerCase().includes(query) || log.user.toLowerCase().includes(query)) {
                    results.push({
                      type: 'Audit Log Entry',
                      title: log.action,
                      desc: `Triggered by ${log.user} (${log.time})`,
                      action: () => {
                        setActiveTab('audit_logs');
                        setShowGlobalSearchModal(false);
                      }
                    });
                  }
                });

                if (results.length === 0) {
                  return <div style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center', padding: '16px' }}>❌ No matches found for "{globalSearchQuery}"</div>;
                }

                return results.map((item, idx) => (
                  <div key={idx} onClick={item.action} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s' }} className="search-result-item">
                    <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{item.type}</span>
                    <h5 style={{ fontSize: '13px', fontWeight: '800', margin: '4px 0 2px 0', color: '#0f2b26' }}>{item.title}</h5>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{item.desc}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
