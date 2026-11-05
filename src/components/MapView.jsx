import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix Leaflet's default marker icon paths in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Green icon for exact GPS coordinates
const gpsIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Blue icon for approximate IP Network coordinates
const ipIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapView({ locations = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;
      markersGroupRef.current = markersGroup;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (markersGroup) {
      markersGroup.clearLayers();

      locations.forEach(loc => {
        const timeStr = new Date(loc.visited_at).toLocaleString();
        const campaignTitle = loc.campaign_name || loc.name || loc.slug || 'Campaign';

        const hasGps = typeof loc.gps_latitude === 'number' && !isNaN(loc.gps_latitude) &&
                       typeof loc.gps_longitude === 'number' && !isNaN(loc.gps_longitude);

        const hasIp = typeof loc.latitude === 'number' && !isNaN(loc.latitude) &&
                      typeof loc.longitude === 'number' && !isNaN(loc.longitude);

        // 1. Add GPS Marker (Green)
        if (hasGps) {
          const gpsMarker = L.marker([loc.gps_latitude, loc.gps_longitude], { icon: gpsIcon });
          gpsMarker.bindPopup(`
            <div style="color: #0f172a; font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4;">
              <div style="font-weight: 700; color: #059669; font-size: 14px; margin-bottom: 2px;">
                🟢 Device GPS Position
              </div>
              <div style="font-weight: 600; color: #1e293b; margin-bottom: 2px;">
                ${campaignTitle}
              </div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
                /${loc.slug || ''}
              </div>
              <b>GPS Lat:</b> ${loc.gps_latitude.toFixed(6)}<br/>
              <b>GPS Long:</b> ${loc.gps_longitude.toFixed(6)}<br/>
              ${loc.gps_accuracy ? `<b>Accuracy:</b> ±${Math.round(loc.gps_accuracy)}m<br/>` : ''}
              <span style="color: #94a3b8; font-size: 11px; display: inline-block; margin-top: 4px;">${timeStr}</span>
            </div>
          `);
          markersGroup.addLayer(gpsMarker);
        }

        // 2. Add IP Marker (Blue)
        if (hasIp) {
          const ipMarker = L.marker([loc.latitude, loc.longitude], { icon: ipIcon });
          ipMarker.bindPopup(`
            <div style="color: #0f172a; font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4;">
              <div style="font-weight: 700; color: #2563eb; font-size: 14px; margin-bottom: 2px;">
                🔵 ISP Network Location
              </div>
              <div style="font-weight: 600; color: #1e293b; margin-bottom: 2px;">
                ${campaignTitle}
              </div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
                /${loc.slug || ''}
              </div>
              <b>IP Lat:</b> ${loc.latitude.toFixed(6)}<br/>
              <b>IP Long:</b> ${loc.longitude.toFixed(6)}<br/>
              ${loc.city ? `<b>City:</b> ${loc.city}, ${loc.country || ''}<br/>` : ''}
              ${loc.isp ? `<b>ISP:</b> ${loc.isp}<br/>` : ''}
              <span style="color: #94a3b8; font-size: 11px; display: inline-block; margin-top: 4px;">${timeStr}</span>
            </div>
          `);
          markersGroup.addLayer(ipMarker);
        }

        // 3. Draw connecting line if both GPS and IP are available
        if (hasGps && hasIp) {
          const latLngs = [
            [loc.gps_latitude, loc.gps_longitude],
            [loc.latitude, loc.longitude]
          ];
          const line = L.polyline(latLngs, {
            color: '#10b981',
            weight: 2,
            opacity: 0.7,
            dashArray: '5, 8'
          });
          line.bindPopup(`
            <div style="font-size: 12px; font-family: system-ui;">
              <b>Device GPS ↔ ISP Network Tower</b><br/>
              <span style="color: #64748b;">${campaignTitle}</span>
            </div>
          `);
          markersGroup.addLayer(line);
        }
      });

      if (markersGroup.getLayers().length > 0) {
        map.fitBounds(markersGroup.getBounds(), { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [locations]);

  return (
    <div style={{ height: '420px', width: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
