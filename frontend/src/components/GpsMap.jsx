import React, { useEffect, useRef, useState } from 'react';

const loadLeaflet = () => {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    // 1. Inject Leaflet CSS Link if not present
    const cssId = 'leaflet-css-cdn';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // 2. Inject Leaflet JS Script if not present
    const scriptId = 'leaflet-js-cdn';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        if (window.L) {
          resolve(window.L);
        } else {
          reject(new Error('Leaflet global object L not found after script injection.'));
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load Leaflet script.'));
      };
      document.body.appendChild(script);
    } else {
      // If script tag exists but window.L is not ready yet, poll for it
      const interval = setInterval(() => {
        if (window.L) {
          clearInterval(interval);
          resolve(window.L);
        }
      }, 100);
      // Timeout after 15 seconds to prevent infinite polling
      setTimeout(() => {
        clearInterval(interval);
        if (!window.L) {
          reject(new Error('Timeout waiting for Leaflet to initialize.'));
        }
      }, 15000);
    }
  });
};

export default function GpsMap({
  selectedTrackEmployee,
  teamTrackLocations,
  employeeBeatPlans,
  gpsSubTab,
  selectedAuditEmployee,
  selectedAuditDate,
  employeeAuditLogs,
  liveLocations,
  gpsHistory,
  height
}) {
  const [leafletLoaded, setLeafletLoaded] = useState(!!window.L);
  const [loadError, setLoadError] = useState(null);
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Dynamic Leaflet asset loader
  useEffect(() => {
    if (!leafletLoaded) {
      loadLeaflet()
        .then(() => {
          setLeafletLoaded(true);
        })
        .catch(err => {
          console.error("Failed to load map resources dynamically:", err);
          setLoadError("Failed to initialize maps engine. Please refresh and try again.");
        });
    }
  }, [leafletLoaded]);

  // Clean up map instance when component unmounts
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Map removal error:", e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Initialize and Sync Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || !window.L) return;

    const L = window.L;

    // Recreate map instance if the container has changed or no map exists
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([28.6139, 77.2090], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    } else {
      // If map exists, invalidate size to ensure tiles render fully if container size changed
      mapInstanceRef.current.invalidateSize();
    }

    const map = mapInstanceRef.current;

    // Clear existing markers & polylines
    Object.keys(markersRef.current).forEach(key => {
      try {
        map.removeLayer(markersRef.current[key]);
      } catch (e) {
        console.warn("Marker removal error:", e);
      }
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
  }, [
    leafletLoaded,
    liveLocations,
    gpsHistory,
    teamTrackLocations,
    selectedTrackEmployee,
    gpsSubTab,
    selectedAuditEmployee,
    selectedAuditDate
  ]);

  if (loadError) {
    return (
      <div style={{
        height: height || '460px',
        width: '100%',
        borderRadius: '12px',
        border: '1px solid #fecaca',
        background: '#fef2f2',
        color: '#991b1b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: '600'
      }}>
        ⚠️ {loadError}
      </div>
    );
  }

  if (!leafletLoaded) {
    return (
      <div style={{
        height: height || '460px',
        width: '100%',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: '600'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '8px' }}>🔄 Loading Map Engine...</div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '400' }}>Fetching Leaflet static assets dynamically</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      style={{
        height: height || '460px',
        width: '100%',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        zIndex: 1
      }}
    />
  );
}
