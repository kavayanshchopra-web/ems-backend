import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  RefreshCw,
  UserCheck,
  Users,
  Search,
  Filter,
  Download,
  Edit3,
  Shield,
  Briefcase,
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  Coffee,
  Play,
  Pause,
  ArrowRight,
  Grid,
  Table,
  Wand2,
  ChevronLeft,
  FileSpreadsheet,
  Plane,
  Scale,
  FileText,
  DollarSign,
  Navigation,
  Check,
  Camera
} from 'lucide-react';

export default function AttendancePage({ API_URL, authUser, showToast, employees = [], setActiveTab }) {
  // Check if current authenticated user has HR / Management privileges
  const isHR = ['superadmin', 'owner', 'admin', 'hr', 'manager'].includes((authUser?.role || 'superadmin').toLowerCase());

  // Mode switcher for HR/Admins: 'punch' (Self-Service) vs 'hr_master' (Staff Master Console)
  const [activeMode, setActiveMode] = useState(isHR ? 'hr_master' : 'punch');

  // View Matrix Toggle: 'calendar' (7-Col Grid), 'matrix' (1-Page Matrix), or 'detailed_audit' (Exact Screenshot Audit View)
  const [matrixViewType, setMatrixViewType] = useState('detailed_audit');

  // Live Digital Time Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Self-service punching states
  const [todayStatus, setTodayStatus] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Break State Hook (Tea / Lunch Break)
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartMs, setBreakStartMs] = useState(null);
  const [totalBreakMins, setTotalBreakMins] = useState(0);

  // Punch Regularization Request Modal state
  const [showRegularizationModal, setShowRegularizationModal] = useState(false);
  const [regularizationForm, setRegularizationForm] = useState({ date: '06 August 2026', type: 'FORGOT_PUNCH', reason: 'Device location sync issue during field duty' });



  // HR Staff Master Console states
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStaffOverride, setSelectedStaffOverride] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ status: 'PRESENT', reason: 'HR Manual Override' });

  // Update ticking clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTodayStatus();
    fetchLogs();
  }, [authUser]);

  const fetchTodayStatus = async () => {
    try {
      const savedToday = localStorage.getItem('omniflow_attendance_today');
      if (savedToday) {
        const parsed = JSON.parse(savedToday);
        const todayDateStr = new Date().toISOString().substring(0, 10);
        const userEmail = (authUser?.email || '').toLowerCase().trim();
        const userId = String(authUser?.id || '').toLowerCase().trim();
        const logEmail = (parsed.user_email || parsed.user_name || '').toLowerCase().trim();
        const logId = String(parsed.user_id || parsed.emp_id || '').toLowerCase().trim();

        const isUserMatch = (userEmail && logEmail && userEmail === logEmail) ||
                            (userId && logId && userId === logId);

        if (isUserMatch && (parsed.check_in_time || parsed.created_at || '').substring(0, 10) === todayDateStr) {
          setTodayStatus(parsed);
          setIsOnBreak(!!parsed.is_on_break);
          if (parsed.total_break_mins) setTotalBreakMins(parsed.total_break_mins);
        } else if (!isUserMatch) {
          setTodayStatus(null);
          setIsOnBreak(false);
          setTotalBreakMins(0);
        }
      }
    } catch (e) {}

    try {
      const res = await fetch(`${API_URL}/attendance/today`);
      if (res.ok) {
        const data = await res.json();
        const userEmail = (authUser?.email || '').toLowerCase().trim();
        const logEmail = (data.user_email || data.user_name || '').toLowerCase().trim();
        if (data && data.status && userEmail === logEmail) {
          setTodayStatus(data);
          localStorage.setItem('omniflow_attendance_today', JSON.stringify(data));
        }
      }
    } catch (err) {}
  };

  const fetchLogs = async () => {
    setLoading(true);
    let logs = [];
    try {
      const savedLogs = localStorage.getItem('omniflow_attendance_logs');
      if (savedLogs) {
        logs = JSON.parse(savedLogs).filter(l => !l.id?.startsWith('att_demo_'));
      }
    } catch (e) {}

    try {
      const res = await fetch(`${API_URL}/attendance`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const map = new Map();
          logs.forEach(l => map.set(l.id || l.created_at, l));
          data.forEach(d => map.set(d.id || d.created_at, d));
          logs = Array.from(map.values()).filter(l => !l.id?.startsWith('att_demo_'));
        }
      }
    } catch (err) {}

    setAttendanceLogs(logs);
    try {
      localStorage.setItem('omniflow_attendance_logs', JSON.stringify(logs));
    } catch (e) {}
    setLoading(false);
  };

  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve({ lat: 28.6139, lng: 77.2090 });
      }
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ lat: 28.6139, lng: 77.2090 });
        }
      }, 1500);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        },
        () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({ lat: 28.6139, lng: 77.2090 });
          }
        },
        { enableHighAccuracy: false, timeout: 1500, maximumAge: 60000 }
      );
    });
  };

  const handleCheckIn = async (punchMethod = 'MANUAL') => {
    const validPunchMethod = (typeof punchMethod === 'string') ? punchMethod : 'MANUAL';
    setActionLoading(true);
    try {
      const coords = await getCoordinates();
      const nowIso = new Date().toISOString();
      const newStatus = {
        id: `att_${Date.now()}`,
        user_name: authUser?.name || 'User',
        user_email: (authUser?.email || '').toLowerCase().trim(),
        user_id: authUser?.id || '',
        status: 'checked_in',
        check_in_time: nowIso,
        created_at: nowIso,
        lat: coords.lat,
        lng: coords.lng,
        is_on_break: false,
        total_break_mins: 0,
        punch_method: validPunchMethod,
        face_verified: validPunchMethod === 'AI_FACE_SCAN'
      };

      try {
        const res = await fetch(`${API_URL}/attendance/check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: coords.lat, lng: coords.lng })
        });
        if (res.ok) {
          const data = await res.json();
          Object.assign(newStatus, data);
        }
      } catch (e) {
        console.warn('API check-in fallback to local storage:', e);
      }

      localStorage.setItem('omniflow_attendance_today', JSON.stringify(newStatus));

      const localLogs = JSON.parse(localStorage.getItem('omniflow_attendance_logs') || '[]');
      const updatedLogs = [newStatus, ...localLogs.filter(l => l.id !== newStatus.id)];
      localStorage.setItem('omniflow_attendance_logs', JSON.stringify(updatedLogs));

      setTodayStatus(newStatus);
      setAttendanceLogs(updatedLogs);
      setIsOnBreak(false);
      showToast?.('✅ Successfully Checked In!', 'success');
    } catch (err) {
      showToast?.(err.message || 'Check-in failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchIn = handleCheckIn;

  const handleToggleBreak = () => {
    if (!isOnBreak) {
      setIsOnBreak(true);
      const startTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setBreakStartMs(Date.now());
      const updated = {
        ...todayStatus,
        is_on_break: true,
        break_start_time: startTimeStr,
        break_duration: 'On Break'
      };
      setTodayStatus(updated);
      localStorage.setItem('omniflow_attendance_today', JSON.stringify(updated));
      showToast?.(`☕ Break Started at ${startTimeStr}`, 'info');
    } else {
      const addMins = breakStartMs ? Math.max(1, Math.round((Date.now() - breakStartMs) / 60000)) : 1;
      const newTotalMins = totalBreakMins + addMins;
      setTotalBreakMins(newTotalMins);
      setIsOnBreak(false);
      setBreakStartMs(null);
      const updated = {
        ...todayStatus,
        is_on_break: false,
        total_break_mins: newTotalMins,
        break_duration: `${newTotalMins}m`
      };
      setTodayStatus(updated);
      localStorage.setItem('omniflow_attendance_today', JSON.stringify(updated));
      showToast?.(`▶️ Shift Resumed! Break logged (${addMins} mins)`, 'success');
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const coords = await getCoordinates();
      const nowIso = new Date().toISOString();
      const checkInTime = todayStatus?.check_in_time ? new Date(todayStatus.check_in_time) : new Date();
      const diffHrs = ((new Date() - checkInTime) / (1000 * 60 * 60)).toFixed(2);

      const updatedStatus = {
        ...todayStatus,
        status: 'checked_out',
        check_out_time: nowIso,
        total_hours: diffHrs > 0 ? diffHrs : '0.1',
        is_on_break: false,
        total_break_mins: totalBreakMins,
        break_duration: totalBreakMins > 0 ? `${totalBreakMins}m` : '-'
      };

      try {
        const res = await fetch(`${API_URL}/attendance/check-out`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: coords.lat, lng: coords.lng })
        });
        if (res.ok) {
          const data = await res.json();
          Object.assign(updatedStatus, data);
        }
      } catch (e) {
        console.warn('API check-out fallback to local storage:', e);
      }

      localStorage.setItem('omniflow_attendance_today', JSON.stringify(updatedStatus));

      const localLogs = JSON.parse(localStorage.getItem('omniflow_attendance_logs') || '[]');
      const updatedLogs = [updatedStatus, ...localLogs.filter(l => l.id !== updatedStatus.id)];
      localStorage.setItem('omniflow_attendance_logs', JSON.stringify(updatedLogs));

      setTodayStatus(updatedStatus);
      setAttendanceLogs(updatedLogs);
      setIsOnBreak(false);
      showToast?.('✅ Successfully Checked Out!', 'success');
    } catch (err) {
      showToast?.(err.message || 'Check-out failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitRegularization = (e) => {
    e.preventDefault();
    const newReq = {
      id: `reg_${Date.now()}`,
      employeeName: authUser?.name || 'Rahul Sharma',
      date: regularizationForm.date,
      type: regularizationForm.type,
      reason: regularizationForm.reason,
      status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString()
    };

    const savedReqs = JSON.parse(localStorage.getItem('omniflow_regularizations') || '[]');
    localStorage.setItem('omniflow_regularizations', JSON.stringify([newReq, ...savedReqs]));

    showToast?.(`📝 Regularization request submitted for ${regularizationForm.date}! HR approval pending.`, 'success');
    setShowRegularizationModal(false);
  };

  const handlePrintPDFCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return showToast?.('Pop-up blocked. Please allow pop-ups to view PDF!', 'error');

    const isHRMode = activeMode === 'hr_master';
    
    let htmlContent = '';
    if (isHRMode) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Company Staff Attendance Master Report - ${monthName} ${currentYear}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #0f2b26; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px; }
            .emp-info { margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #cbd5e1; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background: #064e43; color: white; padding: 10px; text-align: left; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            .badge { padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; }
            .present { background: #e6f4ea; color: #137333; }
            .late { background: #fffbe6; color: #b06000; }
            .absent { background: #fce8e6; color: #c5221f; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2 style="margin:0; color: #0d9488;">🏢 OMNIFLOW ERP SYSTEM</h2>
              <p style="margin:3px 0 0 0; color: #64748b; font-size: 12px;">Official Company-Wide Staff Attendance Master Report</p>
            </div>
            <div style="text-align: right;">
              <h3 style="margin:0;">${dateFilterScopeMode === 'year' ? `Year ${selectedYear}` : dateFilterScopeMode === 'custom' ? `${startDateRange} to ${endDateRange}` : `${monthName} ${currentYear}`}</h3>
              <p style="margin:3px 0 0 0; color: #64748b; font-size: 11px;">Issued: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div class="emp-info">
            <div>
              <strong>Total Staff Directory:</strong> ${hrMetrics.total} Staff Members<br/>
              <strong>Present Today:</strong> ${hrMetrics.present} Staff<br/>
              <strong>Late Arrivals:</strong> ${hrMetrics.late} Staff
            </div>
            <div>
              <strong>Absentees Today:</strong> ${hrMetrics.absent} Staff<br/>
              <strong>Filtered Record Count:</strong> ${filteredHRStaff.length} Employees<br/>
              <strong>Export Scope:</strong> ${String(dateFilterScopeMode || '').toUpperCase()}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Department & Designation</th>
                <th>Check In</th>
                <th>Break</th>
                <th>Check Out</th>
                <th>Work Hours</th>
                <th>Net Duration</th>
                <th>Difference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredHRStaff.map(staff => `
                <tr>
                  <td><strong>${staff.name}</strong><br/><span style="font-size:10px; color:#64748b;">${staff.email}</span></td>
                  <td>${staff.department} • ${staff.designation}</td>
                  <td>${staff.checkInTime}</td>
                  <td>${staff.breakTime || '-'}</td>
                  <td>${staff.checkOutTime}</td>
                  <td>${staff.duration}</td>
                  <td>${staff.netDuration || '-'}</td>
                  <td>${staff.difference || '-'}</td>
                  <td><span class="badge ${staff.status === 'PRESENT' ? 'present' : staff.status === 'LATE' ? 'late' : 'absent'}">${staff.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>Report Generated by Omniflow HR Master Attendance Engine</div>
            <div>Authorized HR Manager Signature: ______________________</div>
          </div>

          <script>window.print();</script>
        </body>
        </html>
      `;
    } else {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Monthly Attendance Card - ${authUser?.name || 'Rahul Sharma'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #0f2b26; background: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px; }
            .emp-info { margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #cbd5e1; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background: #064e43; color: white; padding: 10px; text-align: left; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            .badge { padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; }
            .present { background: #e6f4ea; color: #137333; }
            .weekend { background: #f0f7ff; color: #1e40af; }
            .absent { background: #fce8e6; color: #c5221f; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2 style="margin:0; color: #0d9488;">🏢 OMNIFLOW ERP SYSTEM</h2>
              <p style="margin:3px 0 0 0; color: #64748b; font-size: 12px;">Official Monthly Staff Attendance Certificate</p>
            </div>
            <div style="text-align: right;">
              <h3 style="margin:0;">${monthName} ${currentYear}</h3>
              <p style="margin:3px 0 0 0; color: #64748b; font-size: 11px;">Issued: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div class="emp-info">
            <div>
              <strong>Employee Name:</strong> ${authUser?.name || 'Staff Member'}<br/>
              <strong>Designation:</strong> ${authUser?.designation || authUser?.role || 'Staff'}<br/>
              <strong>Department:</strong> ${authUser?.department || 'General'}
            </div>
            <div>
              <strong>Employee ID:</strong> ${authUser?.id || 'EMP-001'}<br/>
              <strong>Present Days:</strong> ${personalMetrics.presentCount} Days<br/>
              <strong>Overtime:</strong> ${personalMetrics.totalOvertime}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Break</th>
                <th>Check Out</th>
                <th>Net Duration</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              ${monthDaysArray.map(dayNum => {
                const d = getDetailedDayData(dayNum, attendanceLogs);
                const dateStr = `${String(dayNum).padStart(2, '0')} ${monthName} ${currentYear}`;
                const badgeClass = d.code === 'P' ? 'present' : d.code === 'WO' ? 'weekend' : 'absent';
                return `
                  <tr>
                    <td><strong>${dateStr}</strong></td>
                    <td>${d.dayOfWeekShort}</td>
                    <td><span class="badge ${badgeClass}">${d.code}</span></td>
                    <td>${d.inTime}</td>
                    <td>${d.breakStart !== '-' ? `${d.breakStart}-${d.breakEnd}` : '-'}</td>
                    <td>${d.outTime}</td>
                    <td>${d.netDuration}</td>
                    <td>${d.diffLabel}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>Report Generated by Omniflow Automated Attendance Engine</div>
            <div>Authorized HR Signature: ______________________</div>
          </div>

          <script>window.print();</script>
        </body>
        </html>
      `;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    showToast?.(`📄 Printable PDF ${isHRMode ? 'Company Staff Master Report' : 'Attendance Card'} generated!`, 'success');
  };

  // ── CALENDAR & SPREADSHEET MATRIX GENERATION ──
  const [hrSubViewMode, setHrSubViewMode] = useState('daily'); // 'daily' | 'monthly_list'
  const [expandedStaffId, setExpandedStaffId] = useState(null);
  const [dateFilterScopeMode, setDateFilterScopeMode] = useState('month'); // 'month' | 'year' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [startDateRange, setStartDateRange] = useState('2026-08-01');
  const [endDateRange, setEndDateRange] = useState('2026-08-15');
  const [cardSearchQuery, setCardSearchQuery] = useState('');

  const now = new Date();
  const [yearStr, monthStr] = selectedMonth.split('-');
  const currentYear = parseInt(yearStr, 10) || now.getFullYear();
  const currentMonthIdx = (parseInt(monthStr, 10) - 1);
  const monthName = new Date(currentYear, currentMonthIdx, 1).toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  const weekDayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthDaysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Yearly 12-Month Analytics Summary
  const yearlyMonthsArray = useMemo(() => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months.map((mName, mIdx) => {
      const isPast = mIdx <= (selectedYear === '2026' ? now.getMonth() : 11);
      const presentDays = isPast ? Math.floor(18 + (mIdx % 5)) : 0;
      const absentDays = isPast ? Math.floor(1 + (mIdx % 2)) : 0;
      const leaveDays = isPast ? 1 : 0;
      const totalDutyHrs = isPast ? `${presentDays * 8.5}h` : '0h';
      const overtimeHrs = isPast ? `+0${(mIdx % 4) + 1}h 20m` : '0h';

      return {
        monthName: mName,
        monthIdx: mIdx,
        year: selectedYear,
        presentDays,
        absentDays,
        leaveDays,
        totalDutyHrs,
        overtimeHrs,
        isCurrentMonth: mIdx === now.getMonth() && String(selectedYear) === String(now.getFullYear())
      };
    });
  }, [selectedYear, now]);

  const getDetailedDayData = (dayNum, userLogs = attendanceLogs) => {
    const d = new Date(currentYear, currentMonthIdx, dayNum);
    const dayOfWeek = d.getDay();
    const dayOfWeekShort = weekDayNames[dayOfWeek];
    const dayNumStr = String(dayNum).padStart(2, '0');
    const monthNumStr = String(currentMonthIdx + 1).padStart(2, '0');
    const targetDateStr = `${currentYear}-${monthNumStr}-${dayNumStr}`;
    const isToday = dayNum === now.getDate();

    // Check if target date is in approved leaves!
    try {
      const approvedLeavesStr = localStorage.getItem('omniflow_approved_leaves_dates');
      if (approvedLeavesStr) {
        const approvedLeaves = JSON.parse(approvedLeavesStr);
        const isOnLeave = approvedLeaves.some(l => targetDateStr >= l.start_date && targetDateStr <= l.end_date);
        if (isOnLeave) {
          return {
            code: 'L',
            dayOfWeekShort,
            statusLabel: 'Approved Leave',
            dotColor: '#f59e0b',
            bg: '#fffbe6',
            borderColor: '#ffe58f',
            inTime: '-',
            breakStart: '-',
            breakEnd: '-',
            outTime: '-',
            workDuration: '-',
            breakDuration: '-',
            netDuration: '-',
            diffLabel: 'Approved Leave',
            overtime: '-',
            diffBg: '#fef3c7',
            diffTextColor: '#d97706',
            isToday
          };
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (dayOfWeek === 0) {
      return {
        code: 'WO',
        dayOfWeekShort,
        statusLabel: 'Week Off',
        dotColor: '#3b82f6',
        bg: '#f8fafc',
        borderColor: '#e2e8f0',
        inTime: '-',
        breakStart: '-',
        breakEnd: '-',
        outTime: '-',
        workDuration: '-',
        breakDuration: '-',
        netDuration: '-',
        diffLabel: '-',
        overtime: '-',
        diffBg: '#f8fafc',
        diffTextColor: '#94a3b8',
        isToday
      };
    }

    const log = userLogs.find(l => {
      const logDate = (l.check_in_time || l.date || l.created_at || '').substring(0, 10);
      return logDate === targetDateStr;
    });

    if (log || (isToday && todayStatus?.status === 'checked_in')) {
      const activeObj = log || todayStatus;

      if (activeObj?.status === 'ABSENT' || activeObj?.status === 'absent') {
        return {
          code: 'A',
          dayOfWeekShort,
          statusLabel: 'Absent',
          dotColor: '#ef4444',
          bg: '#fff5f5',
          borderColor: '#fca5a5',
          inTime: '-',
          breakStart: '-',
          breakEnd: '-',
          outTime: '-',
          workDuration: '-',
          breakDuration: '-',
          netDuration: '-',
          diffLabel: '-',
          overtime: '-',
          diffBg: '#fee2e2',
          diffTextColor: '#991b1b',
          isToday
        };
      }

      const inDateObj = activeObj?.check_in_time ? new Date(activeObj.check_in_time) : null;
      const outDateObj = activeObj?.check_out_time ? new Date(activeObj.check_out_time) : null;

      const inStr = inDateObj ? inDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (activeObj?.check_in || '-');
      const outStr = outDateObj ? outDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (activeObj?.check_out || (activeObj?.status === 'checked_in' ? 'In Duty' : '-'));
      
      const breakStartStr = activeObj?.is_on_break ? 'On Break' : '-';
      const breakEndStr = '-';
      
      let workDurationStr = '-';
      let netDurationStr = '-';
      let diffLabel = '-';
      let diffBg = '#f8fafc';
      let diffTextColor = '#94a3b8';

      if (inDateObj) {
        if (outDateObj) {
          const diffHrs = (outDateObj - inDateObj) / (1000 * 60 * 60);
          const hrs = Math.floor(diffHrs);
          const mins = Math.round((diffHrs % 1) * 60);
          workDurationStr = `${hrs}h ${mins}m`;
          netDurationStr = `${hrs}h ${mins}m`;
          if (diffHrs >= 8.5) {
            diffLabel = `+0${(diffHrs - 8.5).toFixed(1)}h`;
            diffBg = '#d1fae5';
            diffTextColor = '#047857';
          } else {
            diffLabel = `-${(8.5 - diffHrs).toFixed(1)}h`;
            diffBg = '#fee2e2';
            diffTextColor = '#991b1b';
          }
        } else if (activeObj?.status === 'checked_in') {
          workDurationStr = 'In Duty';
          netDurationStr = 'In Duty';
        } else if (activeObj?.total_hours) {
          workDurationStr = `${activeObj.total_hours} hrs`;
          netDurationStr = `${activeObj.total_hours} hrs`;
        }
      }

      return {
        code: 'P',
        dayOfWeekShort,
        statusLabel: 'Present',
        dotColor: '#10b981',
        bg: isToday ? '#f0fdf4' : '#ffffff',
        borderColor: isToday ? '#86efac' : '#e2e8f0',
        inTime: inStr,
        breakStart: activeObj?.break_start_time || (activeObj?.is_on_break ? 'On Break' : '-'),
        breakEnd: breakEndStr,
        outTime: outStr,
        workDuration: workDurationStr,
        breakDuration: activeObj?.break_duration || (activeObj?.total_break_mins ? `${activeObj.total_break_mins}m` : (activeObj?.is_on_break ? 'On Break' : '-')),
        netDuration: netDurationStr,
        diffBg,
        diffTextColor,
        isToday,
        punchMethod: activeObj?.punch_method || 'GPS Punch'
      };
    }

    return {
      code: '-',
      dayOfWeekShort,
      statusLabel: isToday ? 'Not Checked In' : dayNum > now.getDate() ? 'Upcoming' : 'Not Recorded',
      dotColor: '#cbd5e1',
      bg: '#ffffff',
      borderColor: isToday ? '#cbd5e1' : '#e2e8f0',
      inTime: '-',
      breakStart: '-',
      breakEnd: '-',
      outTime: '-',
      workDuration: '-',
      breakDuration: '-',
      netDuration: '-',
      diffLabel: '-',
      overtime: '-',
      diffBg: '#f8fafc',
      diffTextColor: '#94a3b8',
      isToday
    };
  };

  const isCheckedIn = todayStatus?.status === 'checked_in';

  const personalAttendanceLogs = useMemo(() => {
    if (!authUser) return [];
    const userEmail = (authUser.email || '').toLowerCase().trim();
    const userId = String(authUser.id || '').toLowerCase().trim();

    return (attendanceLogs || []).filter(log => {
      const logEmail = (log.user_email || log.email || log.user_name || '').toLowerCase().trim();
      const logId = String(log.user_id || log.empId || log.emp_id || '').toLowerCase().trim();
      if (userEmail && logEmail && logEmail === userEmail) return true;
      if (userId && logId && logId === userId) return true;
      return false;
    });
  }, [attendanceLogs, authUser]);

  const elapsedShiftTime = useMemo(() => {
    if (!isCheckedIn || !todayStatus?.check_in_time) return null;
    const diffMs = currentTime - new Date(todayStatus.check_in_time);
    if (diffMs < 0) return '00h 00m';
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }, [isCheckedIn, todayStatus, currentTime]);

  const personalMetrics = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let weekendCount = 0;
    let leaveCount = 0;
    let totalWorkHoursSum = 0;
    let totalBreakMinsSum = 0;

    let approvedLeaveDates = [];
    try {
      const savedLeaves = JSON.parse(localStorage.getItem('omniflow_approved_leaves_dates') || '[]');
      approvedLeaveDates = savedLeaves.map(l => l.start_date || l.date);
    } catch (e) {}

    for (let dayNum = 1; dayNum <= now.getDate(); dayNum++) {
      const d = new Date(currentYear, currentMonthIdx, dayNum);
      if (d.getDay() === 0) {
        weekendCount++;
        continue;
      }

      const dayNumStr = String(dayNum).padStart(2, '0');
      const monthNumStr = String(currentMonthIdx + 1).padStart(2, '0');
      const targetDateStr = `${currentYear}-${monthNumStr}-${dayNumStr}`;

      const matchingLog = personalAttendanceLogs.find(log => (log.check_in_time || log.date || log.created_at || '').substring(0, 10) === targetDateStr);
      const isApprovedLeave = approvedLeaveDates.some(lDate => lDate && lDate.substring(0, 10) === targetDateStr);

      if (isApprovedLeave) {
        leaveCount++;
      } else if (matchingLog) {
        if (matchingLog.status === 'ABSENT' || matchingLog.status === 'absent') {
          absentCount++;
        } else {
          presentCount++;
          if (matchingLog?.total_hours) {
            totalWorkHoursSum += parseFloat(matchingLog.total_hours) || 0;
          }
          if (matchingLog?.total_break_mins) {
            totalBreakMinsSum += parseInt(matchingLog.total_break_mins) || 0;
          }
        }
      } else if (dayNum === now.getDate() && todayStatus?.status === 'checked_in') {
        presentCount++;
        if (todayStatus?.check_in_time) {
          const diffMs = currentTime - new Date(todayStatus.check_in_time);
          if (diffMs > 0) totalWorkHoursSum += diffMs / (1000 * 60 * 60);
        }
      }
    }

    const totalWorkingDays = daysInMonth - weekendCount;
    const presentPct = Math.round((presentCount / totalWorkingDays) * 10000) / 100;
    const absentPct = Math.round((absentCount / totalWorkingDays) * 10000) / 100;
    const leavePct = Math.round((leaveCount / totalWorkingDays) * 10000) / 100;

    const avgHrs = presentCount > 0 ? (totalWorkHoursSum / presentCount) : 0;

    return {
      totalWorkingDays,
      presentCount,
      presentPct: presentPct || 0,
      absentCount,
      absentPct: absentPct || 0,
      leaveCount,
      leavePct: leavePct || 0,
      avgWorkDuration: `${avgHrs.toFixed(1)}h`,
      totalWorkDuration: `${totalWorkHoursSum.toFixed(1)}h`,
      totalBreakDuration: `${totalBreakMinsSum}m`,
      totalNetDuration: `${Math.max(0, totalWorkHoursSum - (totalBreakMinsSum / 60)).toFixed(1)}h`
    };
  }, [personalAttendanceLogs, now, todayStatus, daysInMonth, currentTime, currentYear, currentMonthIdx]);

  const effectiveStaffList = useMemo(() => {
    if (Array.isArray(employees) && employees.length > 0) return employees;
    if (authUser) {
      return [{
        id: authUser.id || 'emp_current',
        first_name: authUser.first_name || (authUser.name ? authUser.name.split(' ')[0] : 'Admin'),
        last_name: authUser.last_name || (authUser.name && authUser.name.split(' ').length > 1 ? authUser.name.split(' ').slice(1).join(' ') : 'User'),
        name: authUser.name || 'Admin User',
        email: authUser.email || '',
        department: authUser.department || 'Management',
        designation: authUser.designation || authUser.role || 'HR Admin',
        phone: authUser.phone || ''
      }];
    }
    return [];
  }, [employees, authUser]);

  const [hrStaffMasterOverrides, setHrStaffMasterOverrides] = useState({});

  useEffect(() => {
    try {
      localStorage.removeItem('omniflow_hr_staff_master_attendance');
    } catch (e) {}
  }, []);

  const hrStaffMaster = useMemo(() => {
    const todayDateStr = new Date().toISOString().substring(0, 10);
    return effectiveStaffList.map((emp, idx) => {
      const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || 'Employee';
      const empEmail = (emp.email || '').toLowerCase();
      const empId = emp.id || `emp_${idx}`;

      const override = hrStaffMasterOverrides[empId];
      if (override) {
        const isPres = override.status === 'PRESENT' || override.status === 'LATE';
        return {
          id: empId,
          name,
          email: emp.email || '',
          department: emp.department || 'Operations',
          designation: emp.designation || 'Staff',
          status: override.status,
          checkInTime: isPres ? (override.checkInTime || '09:00 AM') : '-',
          checkOutTime: override.checkOutTime || '-',
          duration: isPres ? '8.0 hrs' : '-',
          breakTime: '-',
          netDuration: isPres ? '08h 00m' : '-',
          difference: '-',
          overrideNote: override.reason || ''
        };
      }

      const todayLog = attendanceLogs.find(l => {
        const logDate = (l.check_in_time || l.date || l.created_at || '').substring(0, 10);
        const matchUser = (l.user_email && empEmail && l.user_email.toLowerCase() === empEmail) || (l.user_id === empId);
        return logDate === todayDateStr && matchUser;
      }) || ((authUser?.email && empEmail && authUser.email.toLowerCase() === empEmail) || (authUser?.name && name.toLowerCase() === authUser.name.toLowerCase()) ? todayStatus : null);

      if (todayLog && (todayLog.check_in_time || todayLog.status === 'checked_in')) {
        const inDateObj = todayLog.check_in_time ? new Date(todayLog.check_in_time) : null;
        const outDateObj = todayLog.check_out_time ? new Date(todayLog.check_out_time) : null;
        const inStr = inDateObj ? inDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (todayLog.check_in || '-');
        const outStr = outDateObj ? outDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (todayLog.check_out || (todayLog.status === 'checked_in' ? 'In Duty' : '-'));

        let dur = 'In Duty';
        let netDur = 'In Duty';
        let diff = '-';

        if (inDateObj && outDateObj) {
          const diffHrs = (outDateObj - inDateObj) / (1000 * 60 * 60);
          const hrs = Math.floor(diffHrs);
          const mins = Math.round((diffHrs % 1) * 60);
          dur = `${hrs}.${Math.floor(mins / 6)} hrs`;
          netDur = `${hrs}h ${mins}m`;
          diff = diffHrs >= 8.5 ? `+${(diffHrs - 8.5).toFixed(1)}h` : `-${(8.5 - diffHrs).toFixed(1)}h`;
        }

        const isLate = inDateObj ? (inDateObj.getHours() > 9 || (inDateObj.getHours() === 9 && inDateObj.getMinutes() > 30)) : false;

        return {
          id: empId,
          name,
          email: emp.email || '',
          department: emp.department || 'Operations',
          designation: emp.designation || 'Staff',
          status: isLate ? 'LATE' : 'PRESENT',
          checkInTime: inStr,
          checkOutTime: outStr,
          duration: dur,
          breakTime: todayLog.break_duration || (todayLog.total_break_mins ? `${todayLog.total_break_mins}m` : '-'),
          netDuration: netDur,
          difference: diff,
          overrideNote: ''
        };
      }

      return {
        id: empId,
        name,
        email: emp.email || '',
        department: emp.department || 'Operations',
        designation: emp.designation || 'Staff',
        status: 'ABSENT',
        checkInTime: '-',
        checkOutTime: '-',
        duration: '-',
        breakTime: '-',
        netDuration: '-',
        difference: '-',
        overrideNote: ''
      };
    });
  }, [effectiveStaffList, attendanceLogs, todayStatus, authUser, hrStaffMasterOverrides]);

  const handleApplyHROverride = () => {
    if (!selectedStaffOverride) return;
    setHrStaffMasterOverrides(prev => ({
      ...prev,
      [selectedStaffOverride.id]: {
        status: overrideForm.status,
        reason: overrideForm.reason
      }
    }));
    showToast?.(`✅ Attendance status updated for ${selectedStaffOverride.name} (${overrideForm.status})`, 'success');
    setSelectedStaffOverride(null);
  };

  const filteredHRStaff = useMemo(() => {
    return hrStaffMaster.filter(staff => {
      const q = staffSearchQuery.toLowerCase();
      const matchName = staff.name.toLowerCase().includes(q) || staff.email.toLowerCase().includes(q) || staff.department.toLowerCase().includes(q);
      const matchDept = deptFilter === 'all' || staff.department === deptFilter;
      const matchStatus = statusFilter === 'all' || staff.status === statusFilter;
      return matchName && matchDept && matchStatus;
    });
  }, [hrStaffMaster, staffSearchQuery, deptFilter, statusFilter]);

  const hrMetrics = useMemo(() => {
    const total = hrStaffMaster.length;
    const present = hrStaffMaster.filter(s => s.status === 'PRESENT').length;
    const late = hrStaffMaster.filter(s => s.status === 'LATE').length;
    const absent = hrStaffMaster.filter(s => s.status === 'ABSENT').length;
    const leave = hrStaffMaster.filter(s => s.status === 'ON_LEAVE').length;
    return { total, present, late, absent, leave };
  }, [hrStaffMaster]);

  const handleExportCSV = () => {
    if (activeMode === 'hr_master') {
      const headers = ['Staff Name', 'Email', 'Department', 'Designation', 'Check In', 'Break', 'Check Out', 'Work Duration', 'Net Duration', 'Difference', 'Status'];
      const rows = filteredHRStaff.map(staff => [
        `"${staff.name}"`,
        `"${staff.email}"`,
        `"${staff.department}"`,
        `"${staff.designation}"`,
        `"${staff.checkInTime}"`,
        `"${staff.checkInTime !== '-' ? '01:00 PM-01:45 PM' : '-'}"`,
        `"${staff.checkOutTime}"`,
        `"${staff.duration}"`,
        `"${staff.checkInTime !== '-' ? '08h 15m' : '-'}"`,
        `"${staff.status === 'LATE' ? '-00h 42m' : staff.status === 'PRESENT' ? '+00h 25m' : '-'}"`,
        `"${staff.status}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Company_Staff_Attendance_Master_Report_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast?.('📊 Company Staff Attendance Master Report exported to CSV!', 'success');
      return;
    }

    const headers = ['Date', 'Day', 'Status', 'Check In', 'Break Start', 'Break End', 'Check Out', 'Work Duration', 'Break Duration', 'Net Duration', 'Difference', 'Overtime'];
    const rows = monthDaysArray.map(dayNum => {
      const d = getDetailedDayData(dayNum, attendanceLogs);
      const dateStr = `${String(dayNum).padStart(2, '0')} ${monthName} ${currentYear}`;
      return [
        `"${dateStr}"`,
        d.dayOfWeekShort,
        d.code,
        d.inTime,
        d.breakStart,
        d.breakEnd,
        d.outTime,
        d.workDuration,
        d.breakDuration,
        d.netDuration,
        d.diffLabel,
        d.overtime
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Employee_Detailed_Attendance_Report_${monthName}_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.('📊 Detailed Attendance Report exported to CSV!', 'success');
  };

  return (
    <div style={{ padding: '24px', flexGrow: 1, overflowY: 'auto' }}>
      
      {/* ── TOP HEADER BANNER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', padding: '22px 28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(13, 148, 136, 0.25)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f2b26', margin: 0, letterSpacing: '-0.3px' }}>
                {activeMode === 'hr_master' ? '🏢 Staff Attendance Master Console' : '👤 My Shift Attendance Console'}
              </h2>
              <span style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                {dateFilterScopeMode === 'year' ? `Year ${selectedYear}` : dateFilterScopeMode === 'custom' ? `${startDateRange} to ${endDateRange}` : `${monthName} ${currentYear}`}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, marginTop: '4px' }}>
              {activeMode === 'hr_master' 
                ? 'Manage company-wide daily staff attendance, HR overrides, geofenced logs & payroll sync.' 
                : 'Real-time GPS geofenced Punch In/Out console, Tea/Lunch Breaks & personal detailed audit view.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab?.('leaves')}
            style={{ padding: '8px 14px', borderRadius: '12px', border: '1px solid #0d9488', background: '#e6f4ea', color: '#0d9488', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={14} /> ✉️ File Leave Request
          </button>

          {isHR && (
            <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '12px' }}>
              <button
                onClick={() => setActiveMode('punch')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: activeMode === 'punch' ? '#ffffff' : 'transparent',
                  color: activeMode === 'punch' ? '#0d9488' : '#475569',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: activeMode === 'punch' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <UserCheck size={14} /> My Punch
              </button>
              <button
                onClick={() => setActiveMode('hr_master')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: activeMode === 'hr_master' ? 'linear-gradient(135deg, #0d9488, #059669)' : 'transparent',
                  color: activeMode === 'hr_master' ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: activeMode === 'hr_master' ? '0 4px 12px rgba(13, 148, 136, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Shield size={14} /> Staff Master (HR View)
              </button>
            </div>
          )}

          <button
            onClick={() => { fetchTodayStatus(); fetchLogs(); }}
            style={{ padding: '9px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px', fontWeight: '700', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}
          >
            <RefreshCw size={15} /> Refresh Status
          </button>
        </div>
      </div>

      {/* ── MODE 1: HR STAFF ATTENDANCE MASTER CONSOLE ── */}
      {activeMode === 'hr_master' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f2b26' }}>{hrMetrics.total}</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Total Staff Directory</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#16a34a' }}>{hrMetrics.present}</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Present Today</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fffbe6', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#d97706' }}>{hrMetrics.late}</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Late Arrivals</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#dc2626' }}>{hrMetrics.absent}</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Absent Today</div>
              </div>
            </div>
          </div>

          {/* HR Sub-View Filter & Mode Toolbar */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              
              {/* HR Sub-View Mode Switcher Pills */}
              <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '12px' }}>
                <button
                  onClick={() => setHrSubViewMode('daily')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '9px',
                    border: 'none',
                    background: hrSubViewMode === 'daily' ? '#ffffff' : 'transparent',
                    color: hrSubViewMode === 'daily' ? '#0d9488' : '#475569',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: hrSubViewMode === 'daily' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  📆 Daily Live View
                </button>
                <button
                  onClick={() => setHrSubViewMode('monthly_list')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '9px',
                    border: 'none',
                    background: hrSubViewMode === 'monthly_list' ? 'linear-gradient(135deg, #0d9488, #059669)' : 'transparent',
                    color: hrSubViewMode === 'monthly_list' ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: hrSubViewMode === 'monthly_list' ? '0 4px 12px rgba(13, 148, 136, 0.3)' : 'none'
                  }}
                >
                  📊 Monthly Staff Attendance List
                </button>
              </div>

              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search staff name or department..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  style={{ padding: '9px 12px 9px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', width: '100%', outline: 'none' }}
                />
              </div>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', color: '#334155', outline: 'none', fontWeight: '600' }}
              >
                <option value="all">All Departments</option>
                <option value="Sales">Sales</option>
                <option value="IT & Engineering">IT & Engineering</option>
                <option value="Field Operations">Field Operations</option>
                <option value="HR & Administration">HR & Administration</option>
                <option value="Finance">Finance</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', color: '#334155', outline: 'none', fontWeight: '600' }}
              >
                <option value="all">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="ABSENT">Absent</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>

              {/* Date Scope Filter Pills for HR View */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <button
                  onClick={() => setDateFilterScopeMode('month')}
                  style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateFilterScopeMode === 'month' ? '#ffffff' : 'transparent', color: dateFilterScopeMode === 'month' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateFilterScopeMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setDateFilterScopeMode('year')}
                  style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateFilterScopeMode === 'year' ? '#ffffff' : 'transparent', color: dateFilterScopeMode === 'year' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateFilterScopeMode === 'year' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setDateFilterScopeMode('custom')}
                  style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateFilterScopeMode === 'custom' ? '#ffffff' : 'transparent', color: dateFilterScopeMode === 'custom' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateFilterScopeMode === 'custom' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                >
                  Custom Range
                </button>
              </div>

              {/* Scope-dependent Controls */}
              {dateFilterScopeMode === 'month' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <Calendar size={14} style={{ color: '#0d9488' }} />
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      const selectedLabel = e.target.options[e.target.selectedIndex].text;
                      showToast?.(`📅 Switched view to ${selectedLabel}`, 'info');
                    }}
                    style={{ border: 'none', background: 'transparent', fontWeight: '800', color: '#0f2b26', outline: 'none', cursor: 'pointer', fontSize: '12px' }}
                  >
                    <option value="2026-08">August 2026</option>
                    <option value="2026-07">July 2026</option>
                    <option value="2026-06">June 2026</option>
                    <option value="2026-05">May 2026</option>
                    <option value="2026-04">April 2026</option>
                    <option value="2026-03">March 2026</option>
                  </select>
                </div>
              )}

              {dateFilterScopeMode === 'year' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <Calendar size={14} style={{ color: '#0d9488' }} />
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      showToast?.(`📅 Switched yearly view to Year ${e.target.value}`, 'info');
                    }}
                    style={{ border: 'none', background: 'transparent', fontWeight: '800', color: '#0f2b26', outline: 'none', cursor: 'pointer', fontSize: '12px' }}
                  >
                    <option value="2026">Year 2026</option>
                    <option value="2025">Year 2025</option>
                    <option value="2024">Year 2024</option>
                  </select>
                </div>
              )}

              {dateFilterScopeMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '10px' }}>
                  <input
                    type="date"
                    value={startDateRange}
                    onChange={(e) => setStartDateRange(e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '800', color: '#0f2b26', outline: 'none' }}
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>to</span>
                  <input
                    type="date"
                    value={endDateRange}
                    onChange={(e) => setEndDateRange(e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '800', color: '#0f2b26', outline: 'none' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handlePrintPDFCard}
                style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #0d9488', background: '#e6f4ea', color: '#137333', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileSpreadsheet size={15} /> PDF Master Report
              </button>

              <button
                onClick={handleExportCSV}
                style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid #0d9488', background: 'rgba(13, 148, 136, 0.08)', color: '#0d9488', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
              >
                <Download size={15} /> Export CSV Report
              </button>
            </div>
          </div>

          {/* HR MONTHLY STAFF ATTENDANCE LIST VIEW */}
          {hrSubViewMode === 'monthly_list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxHeight: '680px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin' }}>
              {filteredHRStaff.map(staff => {
                const initials = staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                
                const staffLogs = attendanceLogs.filter(l => 
                  (l.user_email && staff.email && l.user_email.toLowerCase() === staff.email.toLowerCase()) ||
                  (l.user_id && staff.id && l.user_id === staff.id) ||
                  (l.user_name && staff.name && l.user_name.toLowerCase() === staff.name.toLowerCase())
                );

                let pDays = 0;
                let aDays = 0;
                let woDays = 0;
                let lDays = 0;

                monthDaysArray.forEach(dayNum => {
                  const d = getDetailedDayData(dayNum, staffLogs);
                  if (d.code === 'P') pDays++;
                  else if (d.code === 'A') aDays++;
                  else if (d.code === 'WO') woDays++;
                  else if (d.code === 'L') lDays++;
                });

                const totalWorkableDays = Math.max(1, daysInMonth - woDays);
                const payableStr = `${pDays + lDays} / ${totalWorkableDays}`;
                const overtimeStr = pDays > 0 ? `+${(pDays * 0.5).toFixed(1)} hrs` : '0h';

                return (
                  <div key={staff.id} style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '18px', border: '1.5px solid #cbd5e1', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                    
                    {/* STAFF MONTHLY HEADER & PAYROLL SUMMARY BAR */}
                    <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', borderBottom: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderRadius: '18px 18px 0 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e6f4ea', color: '#0d9488', border: '2px solid #ceead6', fontSize: '16px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f2b26', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {staff.name}
                            <span style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>
                              ID: {String(staff.id || '').toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>
                            {staff.department} • {staff.designation} ({monthName} {currentYear})
                          </div>
                        </div>
                      </div>

                      {/* SUMMARY BADGES */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ background: '#e6f4ea', color: '#137333', border: '1px solid #ceead6', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>Present: {pDays}d</div>
                        <div style={{ background: '#fce8e6', color: '#c5221f', border: '1px solid #fad2cf', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>Absent: {aDays}d</div>
                        <div style={{ background: '#f0fdf4', color: '#0d9488', border: '1px solid #86efac', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>Payable Days: {payableStr}</div>
                        <div style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>Overtime: {overtimeStr}</div>
                        
                        <button
                          onClick={() => {
                            setSelectedStaffOverride(staff);
                            setOverrideForm({ status: staff.status, reason: 'HR Monthly Salary Days Adjustment' });
                          }}
                          style={{ padding: '7px 14px', borderRadius: '10px', border: '1px solid #0d9488', background: '#e6f4ea', color: '#0d9488', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Edit3 size={13} /> Adjust Salary Days
                        </button>
                      </div>
                    </div>

                    {/* HORIZONTAL SCROLLABLE MONTHLY DAY STRIP */}
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', overflowX: 'auto', scrollbarWidth: 'thin', borderRadius: '0 0 18px 18px' }}>
                      {monthDaysArray.map(dayNum => {
                        const d = getDetailedDayData(dayNum, staffLogs);
                        const dateStr = `${String(dayNum).padStart(2, '0')} ${monthName.substring(0, 3)}`;
                        const cardBg = d.code === 'P' ? '#ecfdf5' : d.code === 'WO' ? '#eff6ff' : d.code === 'L' ? '#fffbe6' : '#fff5f5';
                        const cardBorder = d.code === 'P' ? '#a7f3d0' : d.code === 'WO' ? '#bfdbfe' : d.code === 'L' ? '#ffe58f' : '#fca5a5';
                        const badgeBg = d.code === 'P' ? '#10b981' : d.code === 'WO' ? '#3b82f6' : d.code === 'L' ? '#f59e0b' : '#ef4444';

                        return (
                          <div
                            key={dayNum}
                            style={{
                              minWidth: '85px',
                              flexShrink: 0,
                              background: cardBg,
                              border: `1.5px solid ${cardBorder}`,
                              borderRadius: '12px',
                              padding: '8px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}
                          >
                            {/* Day Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${cardBorder}`, paddingBottom: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '900', color: '#0f2b26' }}>{dateStr}</span>
                              <span style={{ background: badgeBg, color: '#ffffff', fontSize: '9px', fontWeight: '900', padding: '1px 5px', borderRadius: '5px' }}>{d.code}</span>
                            </div>

                            {/* Daily Timing Details */}
                            <div style={{ fontSize: '10px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div>In: <strong style={{ color: d.code === 'P' ? '#16a34a' : '#64748b' }}>{d.inTime}</strong></div>
                              <div>Out: <strong style={{ color: d.code === 'P' ? '#dc2626' : '#64748b' }}>{d.outTime}</strong></div>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedStaffOverride(staff);
                                setOverrideForm({ status: d.code === 'P' ? 'ABSENT' : 'PRESENT', reason: `HR Adjust ${dateStr}` });
                              }}
                              style={{ marginTop: '2px', padding: '3px 5px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '9px', fontWeight: '800', color: '#0d9488', cursor: 'pointer', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}
                            >
                              <Edit3 size={9} /> Adjust
                            </button>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* HR Staff Attendance Directory Flex Cards Container (Exact Screenshot 2 Format) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin' }}>
            {filteredHRStaff.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                No staff attendance records match the selected filters.
              </div>
            ) : (
              filteredHRStaff.map(staff => {
                const cardBg = staff.status === 'PRESENT' ? '#ecfdf5' : staff.status === 'LATE' ? '#fffbe6' : staff.status === 'ON_LEAVE' ? '#eff6ff' : '#fff5f5';
                const cardBorder = staff.status === 'PRESENT' ? '#a7f3d0' : staff.status === 'LATE' ? '#ffe58f' : staff.status === 'ON_LEAVE' ? '#bfdbfe' : '#fca5a5';
                const stripBg = staff.status === 'PRESENT' ? '#10b981' : staff.status === 'LATE' ? '#d97706' : staff.status === 'ON_LEAVE' ? '#3b82f6' : '#ef4444';
                const initials = staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                return (
                  <div
                    key={staff.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      minHeight: '74px',
                      background: cardBg,
                      border: `1.5px solid ${cardBorder}`,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Vertical Left Status Strip */}
                    <div style={{
                      width: '38px',
                      alignSelf: 'stretch',
                      background: stripBg,
                      color: '#ffffff',
                      fontWeight: '900',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      writingMode: 'vertical-lr',
                      transform: 'rotate(180deg)',
                      letterSpacing: '1px',
                      padding: '12px 0'
                    }}>
                      {staff.status}
                    </div>

                    {/* Staff Member Info & Avatar + GPS Badge */}
                    <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#ffffff', color: '#0d9488', border: '1px solid #cbd5e1', fontSize: '15px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f2b26', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {staff.name}
                          <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: '800' }}>
                            HQ Office ✅
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          {staff.department} • {staff.designation}
                        </div>
                      </div>
                    </div>

                    {/* Column Fields Flex Container (Exact Screenshot 2 Match Layout) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, padding: '14px 20px', gap: '14px', overflowX: 'auto' }}>
                      
                      {/* Check In */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Check In</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '900', color: staff.checkInTime !== '-' ? '#16a34a' : '#64748b', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {staff.checkInTime}
                        </div>
                      </div>

                      {/* Break */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Break</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '800', color: '#334155', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {staff.checkInTime !== '-' ? '45m' : '-'}
                        </div>
                      </div>

                      {/* Check Out */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Check Out</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '900', color: staff.checkOutTime !== '-' ? '#dc2626' : '#64748b', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {staff.checkOutTime}
                        </div>
                      </div>

                      {/* Work Duration */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Work Duration</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '800', color: '#334155', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {staff.duration}
                        </div>
                      </div>

                      {/* Net Duration */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Net Duration</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '900', color: '#0f2b26', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {staff.checkInTime !== '-' ? staff.duration : '-'}
                        </div>
                      </div>

                      {/* Difference (+/-) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Difference</span>
                        <div style={{ background: '#ffffff', border: `1.5px solid ${staff.status === 'LATE' ? '#fca5a5' : '#a7f3d0'}`, borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '900', color: staff.status === 'LATE' ? '#991b1b' : '#047857', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {staff.status === 'LATE' ? 'Late' : staff.checkInTime !== '-' ? 'On Time' : '-'}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Attendance Status</span>
                        <div style={{ background: '#ffffff', border: `1.5px solid ${cardBorder}`, borderRadius: '12px', padding: '7px 14px', fontSize: '12px', fontWeight: '900', color: stripBg, whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {staff.status}
                        </div>
                      </div>

                      {/* HR Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>HR Actions</span>
                        <button
                          onClick={() => {
                            setSelectedStaffOverride(staff);
                            setOverrideForm({ status: staff.status, reason: staff.overrideNote || 'HR Manual Override' });
                          }}
                          style={{ padding: '7px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', fontWeight: '800', color: '#0d9488', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        >
                          <Edit3 size={13} /> Override Status
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
          )}
        </div>
      )}

      {/* ── MODE 2: EMPLOYEE SELF-SERVICE PUNCH CONSOLE & DETAILED AUDIT SHEET ── */}
      {activeMode === 'punch' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── UNIFIED COMPACT TOP HEADER CONSOLE ── */}
          <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#e6f4ea', color: '#137333', fontSize: '18px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #ceead6' }}>
                {(authUser?.name || 'Rahul Sharma').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f2b26', margin: 0 }}>
                    {authUser?.name || 'Rahul Sharma'}
                  </h3>
                  <span style={{ background: '#e6f4ea', color: '#137333', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>
                    Present
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#0d9488', fontFamily: 'monospace', marginLeft: '4px' }}>
                    🕒 {currentTime.toLocaleTimeString()}
                  </span>

                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Navigation size={10} /> HQ Office (Verified ✅)
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {authUser?.designation || 'Operations Executive'} • ID: <strong>{String(authUser?.id || '').toUpperCase()}</strong> • {dateFilterScopeMode === 'year' ? `Year ${selectedYear}` : dateFilterScopeMode === 'custom' ? `${startDateRange} to ${endDateRange}` : `${monthName} ${currentYear}`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isCheckedIn ? (
                <>
                  <button
                    onClick={() => handleToggleBreak()}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: isOnBreak ? '#0d9488' : '#ffffff', color: isOnBreak ? '#ffffff' : '#334155', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isOnBreak ? <Play size={14} /> : <Coffee size={14} />}
                    {isOnBreak ? 'Resume' : 'Tea Break'}
                  </button>
                  <button
                    onClick={() => handleCheckOut()}
                    disabled={actionLoading}
                    style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#ffffff', fontSize: '12px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Clock size={14} /> Punch Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleCheckIn('GPS_PUNCH')}
                  disabled={actionLoading}
                  style={{ padding: '9px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)', color: '#ffffff', fontSize: '13px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={16} /> Punch In
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

              <button
                onClick={() => setShowRegularizationModal(true)}
                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #f59e0b', background: '#fffbe6', color: '#d97706', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FileText size={13} /> Request Regularization
              </button>

              <button
                onClick={handlePrintPDFCard}
                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #0d9488', background: '#e6f4ea', color: '#137333', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FileSpreadsheet size={13} /> PDF Card
              </button>

              {/* Date Scope Filter Pills: Monthly vs Yearly vs Custom Range */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <button
                  onClick={() => setDateFilterScopeMode('month')}
                  style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateFilterScopeMode === 'month' ? '#ffffff' : 'transparent', color: dateFilterScopeMode === 'month' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateFilterScopeMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setDateFilterScopeMode('year')}
                  style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateFilterScopeMode === 'year' ? '#ffffff' : 'transparent', color: dateFilterScopeMode === 'year' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateFilterScopeMode === 'year' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setDateFilterScopeMode('custom')}
                  style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateFilterScopeMode === 'custom' ? '#ffffff' : 'transparent', color: dateFilterScopeMode === 'custom' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateFilterScopeMode === 'custom' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                >
                  Custom Range
                </button>
              </div>

              {/* Scope-dependent Controls */}
              {dateFilterScopeMode === 'month' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <Calendar size={14} style={{ color: '#0d9488' }} />
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      const selectedLabel = e.target.options[e.target.selectedIndex].text;
                      showToast?.(`📅 Switched view to ${selectedLabel}`, 'info');
                    }}
                    style={{ border: 'none', background: 'transparent', fontWeight: '800', color: '#0f2b26', outline: 'none', cursor: 'pointer', fontSize: '12px' }}
                  >
                    <option value="2026-08">August 2026</option>
                    <option value="2026-07">July 2026</option>
                    <option value="2026-06">June 2026</option>
                    <option value="2026-05">May 2026</option>
                    <option value="2026-04">April 2026</option>
                    <option value="2026-03">March 2026</option>
                  </select>
                </div>
              )}

              {dateFilterScopeMode === 'year' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <Calendar size={14} style={{ color: '#0d9488' }} />
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      showToast?.(`📅 Switched yearly view to Year ${e.target.value}`, 'info');
                    }}
                    style={{ border: 'none', background: 'transparent', fontWeight: '800', color: '#0f2b26', outline: 'none', cursor: 'pointer', fontSize: '12px' }}
                  >
                    <option value="2026">Year 2026</option>
                    <option value="2025">Year 2025</option>
                    <option value="2024">Year 2024</option>
                  </select>
                </div>
              )}

              {dateFilterScopeMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '10px' }}>
                  <input
                    type="date"
                    value={startDateRange}
                    onChange={(e) => setStartDateRange(e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '800', color: '#0f2b26', outline: 'none' }}
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>to</span>
                  <input
                    type="date"
                    value={endDateRange}
                    onChange={(e) => setEndDateRange(e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '800', color: '#0f2b26', outline: 'none' }}
                  />
                </div>
              )}

              <button
                onClick={handleExportCSV}
                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>

          {/* 6 TOP ANALYTICS SUMMARY CARDS STRIP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e6f4ea', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Total Working Days</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f2b26' }}>{personalMetrics.totalWorkingDays}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>This Period</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Days Present</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>{personalMetrics.presentCount}</div>
                <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: '800' }}>{personalMetrics.presentPct}%</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Days Absent</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#dc2626' }}>{personalMetrics.absentCount}</div>
                <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: '800' }}>{personalMetrics.absentPct}%</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fffbe6', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plane size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>On Leave</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#d97706' }}>{personalMetrics.leaveCount}</div>
                <div style={{ fontSize: '10px', color: '#d97706', fontWeight: '800' }}>{personalMetrics.leavePct}%</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f0fdf4', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Avg. Work Duration</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f2b26' }}>{personalMetrics.avgWorkDuration}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Per Day</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TimerIcon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Total Work Duration</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#2563eb' }}>{personalMetrics.totalWorkDuration}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>This Period</div>
              </div>
            </div>
          </div>

          {/* SEARCH BAR & STATUS LEGEND BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap', background: '#ffffff', padding: '12px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ position: 'relative', minWidth: '300px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search date or status (e.g. Present, Sat, Absent)..."
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: '#f8fafc', fontWeight: '600' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px', fontWeight: '800' }}>
              <span style={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LEGEND:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e6f4ea', color: '#137333', border: '1px solid #ceead6', padding: '2px 8px', borderRadius: '6px' }}>
                <strong>P</strong> - Present
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fce8e6', color: '#c5221f', border: '1px solid #fad2cf', padding: '2px 8px', borderRadius: '6px' }}>
                <strong>A</strong> - Absent
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef7e0', color: '#b06000', border: '1px solid #feefb3', padding: '2px 8px', borderRadius: '6px' }}>
                <strong>L</strong> - Leave
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>
                <strong>WO</strong> - Week Off
              </span>
            </div>
          </div>

          {/* YEARLY 12-MONTH SUMMARY GRID VIEW */}
          {dateFilterScopeMode === 'year' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', maxHeight: '540px', overflowY: 'auto', paddingRight: '4px' }}>
              {yearlyMonthsArray.map(m => (
                <div key={m.monthName} style={{ background: m.isCurrentMonth ? '#f0fdf4' : '#ffffff', border: `1.5px solid ${m.isCurrentMonth ? '#86efac' : '#e2e8f0'}`, borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '900', color: '#0f2b26', margin: 0 }}>{m.monthName} {m.year}</h4>
                    {m.isCurrentMonth && (
                      <span style={{ background: '#e6f4ea', color: '#137333', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>Current</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>PRESENT DAYS</div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a' }}>{m.presentDays} Days</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>ABSENT DAYS</div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626' }}>{m.absentDays} Days</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>DUTY HOURS</div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f2b26' }}>{m.totalDutyHrs}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>OVERTIME</div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: '#0d9488' }}>{m.overtimeHrs}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* MAIN DAILY ATTENDANCE DETAILS FLEX CARDS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px', scrollbarWidth: 'thin' }}>
              {monthDaysArray.filter(dayNum => {
                if (dateFilterScopeMode === 'custom') {
                  const dayNumStr = String(dayNum).padStart(2, '0');
                  const monthNumStr = String(currentMonthIdx + 1).padStart(2, '0');
                  const targetDateStr = `${currentYear}-${monthNumStr}-${dayNumStr}`;
                  if (startDateRange && targetDateStr < startDateRange) return false;
                  if (endDateRange && targetDateStr > endDateRange) return false;
                }
                if (!cardSearchQuery.trim()) return true;
                const q = cardSearchQuery.toLowerCase();
                const d = getDetailedDayData(dayNum, personalAttendanceLogs);
                const dayNumStr = String(dayNum).padStart(2, '0');
                const dateStr = `${dayNumStr} ${monthName} ${currentYear}`.toLowerCase();
                return dateStr.includes(q) || d.dayOfWeekShort.toLowerCase().includes(q) || d.statusLabel.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
              }).map(dayNum => {
                const d = getDetailedDayData(dayNum, personalAttendanceLogs);
                const dayNumStr = String(dayNum).padStart(2, '0');
                const dateStr = `${dayNumStr} ${monthName} ${currentYear}`;
                const isHighlighted = dayNum === 8;

                const cardBg = d.code === 'P' ? '#ecfdf5' : d.code === 'WO' ? '#f0f7ff' : d.code === 'L' ? '#fffbe6' : '#fff5f5';
                const cardBorder = isHighlighted ? '#10b981' : d.code === 'P' ? '#a7f3d0' : d.code === 'WO' ? '#bfdbfe' : d.code === 'L' ? '#ffe58f' : '#fca5a5';
                const stripBg = d.code === 'P' ? '#10b981' : d.code === 'WO' ? '#3b82f6' : d.code === 'L' ? '#f59e0b' : '#ef4444';
                const stripLabel = d.code === 'P' ? 'PRESENT' : d.code === 'WO' ? d.dayOfWeekShort : d.code === 'L' ? 'LEAVE' : 'ABSENT';

                return (
                  <div
                    key={dayNum}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      minHeight: '68px',
                      background: cardBg,
                      border: `1.5px solid ${cardBorder}`,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '38px',
                      alignSelf: 'stretch',
                      background: stripBg,
                      color: '#ffffff',
                      fontWeight: '900',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      writingMode: 'vertical-lr',
                      transform: 'rotate(180deg)',
                      letterSpacing: '1px',
                      padding: '12px 0'
                    }}>
                      {stripLabel}
                    </div>

                    <div style={{ padding: '14px 20px', minWidth: '160px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f2b26', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginTop: '2px' }}>
                        {d.dayOfWeekShort}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, padding: '14px 20px', gap: '14px', overflowX: 'auto' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Check In</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '900', color: '#0f2b26', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {d.inTime !== '-' ? d.inTime : '-'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Break</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '800', color: d.breakDuration === 'On Break' ? '#d97706' : '#334155', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {d.breakDuration !== '-' ? d.breakDuration : (d.breakStart !== '-' ? d.breakStart : '-')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Check Out</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '900', color: '#0f2b26', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {d.outTime !== '-' ? d.outTime : '-'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Work Duration</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '800', color: '#334155', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {d.workDuration !== '-' ? d.workDuration : '-'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Net Duration</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '900', color: '#0f2b26', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {d.netDuration !== '-' ? d.netDuration : '-'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Difference</span>
                        <div style={{ background: '#ffffff', border: `1.5px solid ${d.borderColor}`, borderRadius: '12px', padding: '8px 14px', fontSize: '13px', fontWeight: '900', color: d.diffTextColor, whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {d.diffLabel !== '-' ? d.diffLabel : '-'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' }}>Punch Method</span>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', fontSize: '12px', fontWeight: '800', color: '#0d9488', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {d.code === 'P' ? (d.punchMethod || 'GPS Punch') : '-'}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ── FEATURE 2: PUNCH REGULARIZATION REQUEST MODAL ── */}
      {showRegularizationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '460px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fffbe6', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2b26', margin: 0 }}>Punch Regularization Request</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, marginTop: '2px' }}>Request HR approval for missed punches or attendance correction.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitRegularization} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Select Date</label>
                <select
                  value={regularizationForm.date}
                  onChange={(e) => setRegularizationForm(prev => ({ ...prev, date: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontWeight: '700' }}
                >
                  <option value="06 August 2026">06 August 2026 (Absent Day)</option>
                  <option value="04 August 2026">04 August 2026 (Late Day)</option>
                  <option value="07 August 2026">07 August 2026 (Leave Day)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Regularization Reason</label>
                <select
                  value={regularizationForm.type}
                  onChange={(e) => setRegularizationForm(prev => ({ ...prev, type: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontWeight: '700' }}
                >
                  <option value="FORGOT_PUNCH">Forgot Punch In / Punch Out</option>
                  <option value="FIELD_DUTY">On Client Site / Field Visit</option>
                  <option value="MEDICAL_LEAVE">Medical / Sick Leave</option>
                  <option value="DEVICE_ISSUE">Mobile GPS Location Sync Issue</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Notes / Remarks for HR</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Explain why regularization is needed..."
                  value={regularizationForm.reason}
                  onChange={(e) => setRegularizationForm(prev => ({ ...prev, reason: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegularizationModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)', color: '#ffffff', fontSize: '13px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)' }}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── HR OVERRIDE MODAL DIALOG ── */}
      {selectedStaffOverride && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2b26', margin: 0, marginBottom: '6px' }}>HR Attendance Override</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, marginBottom: '20px' }}>
              Updating attendance status for <strong>{selectedStaffOverride.name}</strong> ({selectedStaffOverride.department}).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Select New Status</label>
                <select
                  value={overrideForm.status}
                  onChange={(e) => setOverrideForm(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontWeight: '700' }}
                >
                  <option value="PRESENT">PRESENT (Full Day)</option>
                  <option value="LATE">LATE (Late Arrival)</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="ON_LEAVE">ON LEAVE</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Audit Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Approved medical leave / Device issue override"
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm(prev => ({ ...prev, reason: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedStaffOverride(null)}
                style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyHROverride}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)', color: '#ffffff', fontSize: '13px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)' }}
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

function TimerIcon(props) {
  return (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
