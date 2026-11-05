import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix Leaflet's default marker icon paths in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Pin icons: GPS (green) vs IP (blue)
const gpsIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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

      const validPoints = locations.filter(
        loc => typeof loc.latitude === 'number' && !isNaN(loc.latitude) &&
               typeof loc.longitude === 'number' && !isNaN(loc.longitude)
      );

      validPoints.forEach(loc => {
        const isGps = loc.gps_consent || loc.source === 'gps';
        const icon = isGps ? gpsIcon : ipIcon;
        const marker = L.marker([loc.latitude, loc.longitude], { icon });
        const timeStr = new Date(loc.visited_at).toLocaleString();
        const campaignTitle = loc.campaign_name || loc.name || loc.slug || 'Campaign';

        marker.bindPopup(`
          <div style="color: #0f172a; font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4;">
            <div style="font-weight: 700; color: #1e40af; font-size: 14px; margin-bottom: 2px;">
              ${campaignTitle}
            </div>
            <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
              /${loc.slug || ''}
            </div>
            <b>Latitude:</b> ${loc.latitude.toFixed(6)}<br/>
            <b>Longitude:</b> ${loc.longitude.toFixed(6)}<br/>
            <b>Source:</b> <span style="font-weight: 600; color: ${isGps ? '#059669' : '#2563eb'};">${isGps ? 'GPS (Consented)' : 'IP Network'}</span><br/>
            <span style="color: #94a3b8; font-size: 11px; display: inline-block; margin-top: 4px;">${timeStr}</span>
          </div>
        `);
        markersGroup.addLayer(marker);
      });

      if (validPoints.length > 0) {
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
