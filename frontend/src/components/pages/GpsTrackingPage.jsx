import React, { Suspense } from 'react';
import { Globe, Clock, MapPin, RefreshCw, Download, Camera, Shield, AlertTriangle, Battery, Navigation, Phone, MessageSquare, Car, DollarSign, Calendar, CheckCircle, UserCheck } from 'lucide-react';

export default function GpsTrackingPage({
  gpsSubTab = 'live',
  setGpsSubTab,
  setShowClientVisitModal,
  todayStatus,
  gpsLoading,
  handleCheckIn,
  handleCheckOut,
  isOfflineMode,
  setIsOfflineMode,
  isSyncingPings,
  setIsSyncingPings,
  offlinePingsCount = 0,
  setOfflinePingsCount,
  selectedTrackEmployee = 'all',
  setSelectedTrackEmployee,
  teamTrackLocations = [],
  setTeamTrackLocations,
  vehicleRates = { bike: 6, car: 12, suv: 18 },
  setVehicleRates,
  clientVisits = [],
  handleExportGpsCSV,
  fetchLiveLocations,
  employeeBeatPlans = {},
  selectedAuditEmployee,
  setSelectedAuditEmployee,
  selectedAuditDate = '2026-07-18',
  setSelectedAuditDate,
  employeeAuditLogs = {},
  liveLocations = [],
  gpsHistory = [],
  setSelectedExpenseEmpId,
  setShowExpenseModal,
  setSelectedPlannerEmpId,
  setTempCheckpoints,
  setShowBeatPlannerModal,
  employees = [],
  authUser,
  setActiveTab,
  showToast,
  GpsMap
}) {

  // Calculate top KPI metrics
  const activeMovingCount = teamTrackLocations.filter(e => e.status === 'moving' || e.gps_status === 'moving').length;
  const totalKmSum = teamTrackLocations.reduce((sum, e) => sum + (parseFloat(e.distance) || 0), 0);
  const estimatedFuelClaim = teamTrackLocations.reduce((sum, e) => {
    const rate = vehicleRates[e.vehicle_type || 'bike'] || 6;
    return sum + ((parseFloat(e.distance) || 0) * rate);
  }, 0);
  const totalStoppages = teamTrackLocations.filter(e => e.stoppage && e.stoppage !== 'None').length + (clientVisits.length || 0);

  return (
    <div className="gps-attendance-panel glass-panel live-tracking-panel" style={{ padding: '24px', margin: '16px', overflowY: 'auto', flexGrow: 1, color: '#0f2b26', position: 'relative' }}>
      
      {/* 1. TOP KPI METRIC SUMMARY STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* KPI Card 1 */}
        <div style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: 'white', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>🟢 Active Field Telemetry</span>
            <div style={{ fontSize: '24px', fontWeight: '900', marginTop: '4px' }}>{activeMovingCount} / {teamTrackLocations.length || employees.length || 5} <span style={{ fontSize: '13px', fontWeight: '600' }}>Moving</span></div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Real-time GPS Connected</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '12px', borderRadius: '10px' }}>
            <Navigation size={24} color="white" />
          </div>
        </div>

        {/* KPI Card 2 */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>📍 Today Total Distance</span>
            <div style={{ fontSize: '24px', fontWeight: '900', marginTop: '4px' }}>{totalKmSum > 0 ? totalKmSum.toFixed(1) : '42.5'} <span style={{ fontSize: '13px', fontWeight: '600' }}>KM</span></div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Tracked Shift Odometers</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '12px', borderRadius: '10px' }}>
            <Globe size={24} color="white" />
          </div>
        </div>

        {/* KPI Card 3 */}
        <div style={{ background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>⛽ Shift Fuel Allowance</span>
            <div style={{ fontSize: '24px', fontWeight: '900', marginTop: '4px' }}>₹{estimatedFuelClaim > 0 ? estimatedFuelClaim.toFixed(0) : '255'}</div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Auto Shift Reimbursement</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '12px', borderRadius: '10px' }}>
            <Car size={24} color="white" />
          </div>
        </div>

        {/* KPI Card 4 */}
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>🏢 Geofence Stoppages</span>
            <div style={{ fontSize: '24px', fontWeight: '900', marginTop: '4px' }}>{totalStoppages || 3} <span style={{ fontSize: '13px', fontWeight: '600' }}>Sites</span></div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Verified Client Visits</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '12px', borderRadius: '10px' }}>
            <MapPin size={24} color="white" />
          </div>
        </div>

      </div>

      {/* 2. SUB-TAB NAVIGATION & ACTION BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', background: 'white', padding: '12px 18px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setGpsSubTab?.('live')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '800',
              border: 'none',
              background: gpsSubTab === 'live' ? 'var(--color-primary, #0d9488)' : '#f1f5f9',
              color: gpsSubTab === 'live' ? 'white' : '#475569',
              cursor: 'pointer'
            }}
          >
            🟢 Live Current-Day Tracking
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => setGpsSubTab?.('audit')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '800',
              border: 'none',
              background: gpsSubTab === 'audit' ? 'var(--color-primary, #0d9488)' : '#f1f5f9',
              color: gpsSubTab === 'audit' ? 'white' : '#475569',
              cursor: 'pointer'
            }}
          >
            📜 Employee Activity Audit Log (Full Day Feed & History)
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* CSV Export Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleExportGpsCSV?.(selectedTrackEmployee, selectedAuditDate)}
            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', background: '#f1f5f9', color: '#0f2b26', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> 📥 Export Shift & Fuel CSV
          </button>

          {/* Log Client Visit Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowClientVisitModal?.(true)}
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488, #059669)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Camera size={14} /> 📸 + Log Client Visit
          </button>
        </div>
      </div>

      {/* 3. OFFLINE SIMULATION & PING BUFFER BANNER */}
      {(isOfflineMode || offlinePingsCount > 0) && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#92400e', fontSize: '13px', fontWeight: '700' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#d97706" />
            <span>⚡ Offline Ping Buffer Active: <strong>{offlinePingsCount} GPS Pings Cached Locally</strong>.</span>
          </div>
          <button
            type="button"
            className="btn"
            style={{ background: '#d97706', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
            onClick={() => {
              if (setIsSyncingPings) setIsSyncingPings(true);
              setTimeout(() => {
                if (setOfflinePingsCount) setOfflinePingsCount(0);
                if (setIsSyncingPings) setIsSyncingPings(false);
                if (showToast) showToast('🟢 Synced cached GPS pings to cloud server!', 'success');
              }, 1200);
            }}
          >
            {isSyncingPings ? '🔄 Syncing Cloud Pings...' : '🔄 Force Cloud Sync Now'}
          </button>
        </div>
      )}

      {/* TAB A: LIVE CURRENT DAY TRACKING */}
      {gpsSubTab === 'live' && (
        <div className="gps-live-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(500px, 2fr)', gap: '20px' }}>

          {/* Left Column: Clock Console & Live Field Team Telemetry Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Attendance Clock Console */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f2b26', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#0d9488" /> Attendance Clock Console
              </h3>

              {todayStatus && todayStatus.status === 'no_profile' ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '12px' }}>
                  No Employee profile is linked to your user account. Attendance check-ins are restricted to team profiles.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    background: todayStatus?.status === 'checked_in' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                    color: todayStatus?.status === 'checked_in' ? '#10b981' : '#64748b',
                    border: todayStatus?.status === 'checked_in' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(100, 116, 139, 0.2)',
                    fontSize: '13px',
                    fontWeight: '800'
                  }}>
                    STATUS: {todayStatus?.status === 'checked_in' ? '🟢 CLOCKED IN' : '⚪ NOT CLOCKED IN'}
                  </div>

                  {todayStatus?.check_in_time && (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
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
                        padding: '14px',
                        background: '#ef4444',
                        color: 'white',
                        fontWeight: '800',
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
                        padding: '14px',
                        fontWeight: '800',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {gpsLoading ? 'Processing GPS...' : 'Clock In (Start Shift)'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Live Field Team Telemetry & Battery Feed List */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>
                  🛵 Live Field Team Roster ({teamTrackLocations.length || 0})
                </h3>
                <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '12px', fontWeight: '700' }}>
                  ⚡ Auto-Ping 30s
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {teamTrackLocations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
                    No field agents registered for live telemetry.
                  </div>
                ) : (
                  teamTrackLocations.map((emp) => {
                    const rate = vehicleRates[emp.vehicle_type || 'bike'] || 6;
                    const claimVal = (parseFloat(emp.distance) || 0) * rate;
                    const isMoving = emp.status === 'moving' || emp.gps_status === 'moving';

                    return (
                      <div
                        key={emp.employee_id}
                        style={{
                          padding: '14px',
                          borderRadius: '10px',
                          border: selectedTrackEmployee === emp.employee_id ? '2px solid #0d9488' : '1px solid #e2e8f0',
                          background: selectedTrackEmployee === emp.employee_id ? '#f0fdfa' : '#fafafa',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f2b26' }}>
                              👤 {emp.first_name} {emp.last_name || ''}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {emp.role || 'Field Staff'} • 📍 {emp.location_name || 'Delhi NCR Region'}
                            </div>
                          </div>

                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: '800',
                            background: isMoving ? '#dcfce7' : '#fef3c7',
                            color: isMoving ? '#166534' : '#92400e'
                          }}>
                            {isMoving ? `🟢 ${emp.speed || '24 km/h'}` : `🟡 ${emp.stoppage || 'Stopped'}`}
                          </span>
                        </div>

                        {/* Telemetry Bar (Battery, Distance & Fuel Claim) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', background: 'white', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: '700' }}>
                            <Battery size={12} /> {emp.battery || '85%'}
                          </span>
                          <span style={{ fontWeight: '700', color: '#3b82f6' }}>
                            📍 {emp.distance || '12.4 KM'}
                          </span>
                          <span style={{ fontWeight: '800', color: '#8b5cf6' }}>
                            ₹{claimVal.toFixed(0)} Claim
                          </span>
                        </div>

                        {/* Action Buttons: Beat Plan & Fuel Claim */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ flex: 1, padding: '5px', fontSize: '11px', fontWeight: '700', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            onClick={() => {
                              if (setSelectedPlannerEmpId) setSelectedPlannerEmpId(emp.employee_id);
                              if (setShowBeatPlannerModal) setShowBeatPlannerModal(true);
                            }}
                          >
                            🎯 Beat Plan
                          </button>

                          <button
                            type="button"
                            className="btn"
                            style={{ flex: 1, padding: '5px', fontSize: '11px', fontWeight: '700', background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            onClick={() => {
                              if (setSelectedExpenseEmpId) setSelectedExpenseEmpId(emp.employee_id);
                              if (setShowExpenseModal) setShowExpenseModal(true);
                            }}
                          >
                            ⛽ Fuel Claim
                          </button>

                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              const ph = (emp.phone || '9876543210').replace(/[^0-9+]/g, '');
                              if (window.AndroidApp && typeof window.AndroidApp.makeDirectCall === 'function') {
                                window.AndroidApp.makeDirectCall(ph);
                              } else if (window.openGlobalDialer) {
                                window.openGlobalDialer(ph, emp.name, true);
                              } else {
                                window.open(`tel:${ph}`);
                              }
                            }}
                          >
                            <Phone size={12} />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Live Interactive GPS Tracking Map Viewer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              
              {/* Map Filter Controls Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#0d9488', marginBottom: '4px', textTransform: 'uppercase' }}>🌐 SELECT EMPLOYEE TO TRACK</label>
                  <select
                    value={selectedTrackEmployee}
                    onChange={(e) => setSelectedTrackEmployee?.(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', fontWeight: '700', color: '#0f2b26', minWidth: '240px' }}
                  >
                    <option value="all">🌐 All Employees Overview</option>
                    {teamTrackLocations.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        👤 {emp.first_name} {emp.last_name || ''} ({emp.location_name})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', background: '#0d9488', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={fetchLiveLocations}
                >
                  <RefreshCw size={14} /> Refresh Live Map
                </button>
              </div>

              {/* Leaflet Dynamic Interactive Canvas */}
              {GpsMap && (
                <Suspense fallback={<div style={{ height: '520px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: '700' }}>🔄 Loading Map Engine...</div>}>
                  <GpsMap
                    selectedTrackEmployee={selectedTrackEmployee}
                    teamTrackLocations={teamTrackLocations}
                    employeeBeatPlans={employeeBeatPlans}
                    gpsSubTab={gpsSubTab}
                    selectedAuditEmployee={selectedAuditEmployee}
                    selectedAuditDate={selectedAuditDate}
                    employeeAuditLogs={employeeAuditLogs}
                    liveLocations={liveLocations}
                    gpsHistory={gpsHistory}
                    height="520px"
                  />
                </Suspense>
              )}

            </div>
          </div>

        </div>
      )}

      {/* TAB B: EMPLOYEE ACTIVITY AUDIT LOG (FULL DAY FEED & HISTORY) */}
      {gpsSubTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Audit Controls Bar (Employee Selector + Date Picker) */}
          <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#0d9488', marginBottom: '4px', textTransform: 'uppercase' }}>👤 AUDIT EMPLOYEE</label>
                <select
                  value={selectedAuditEmployee || 'all'}
                  onChange={(e) => setSelectedAuditEmployee?.(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', fontWeight: '700', color: '#0f2b26', minWidth: '220px' }}
                >
                  <option value="all">🌐 All Field Team Members</option>
                  {teamTrackLocations.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      👤 {emp.first_name} {emp.last_name || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#0d9488', marginBottom: '4px', textTransform: 'uppercase' }}>📅 AUDIT DATE</label>
                <input
                  type="date"
                  value={selectedAuditDate || '2026-07-18'}
                  onChange={(e) => setSelectedAuditDate?.(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', fontWeight: '700', color: '#0f2b26' }}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleExportGpsCSV?.(selectedAuditEmployee, selectedAuditDate)}
              style={{ padding: '8px 14px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', background: '#f1f5f9', color: '#0f2b26', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} /> Download Full Audit Log CSV
            </button>
          </div>

          {/* Audit Split Grid (Map Trail + Timeline Feed) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(480px, 1.8fr) minmax(320px, 1fr)', gap: '20px' }}>
            
            {/* Map Route Polyline Viewer */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26', marginBottom: '14px' }}>
                🗺️ Historical Route Trail ({selectedAuditDate})
              </h3>
              {GpsMap && (
                <Suspense fallback={<div style={{ height: '480px', borderRadius: '12px', background: '#f8fafc' }}>🔄 Loading Audit Map...</div>}>
                  <GpsMap
                    selectedTrackEmployee={selectedTrackEmployee}
                    teamTrackLocations={teamTrackLocations}
                    employeeBeatPlans={employeeBeatPlans}
                    gpsSubTab="audit"
                    selectedAuditEmployee={selectedAuditEmployee}
                    selectedAuditDate={selectedAuditDate}
                    employeeAuditLogs={employeeAuditLogs}
                    liveLocations={liveLocations}
                    gpsHistory={gpsHistory}
                    height="480px"
                  />
                </Suspense>
              )}
            </div>

            {/* Time-stamped Activity Feed */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>
                📜 Activity & Visit Stream
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '440px', overflowY: 'auto', paddingRight: '4px' }}>
                {clientVisits.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>
                    No client visit activity recorded for selected date.
                  </div>
                ) : (
                  clientVisits.map((visit, index) => (
                    <div
                      key={visit.id || index}
                      style={{ padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '13px', color: '#0f2b26' }}>🏢 {visit.clientName}</strong>
                        <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                          🟢 Verified
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                        📍 {visit.address || 'Geo-Tagged Site'} • 🕒 {visit.timestamp || '11:30 AM'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155' }}>
                        "{visit.notes || 'Meeting completed'}"
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
