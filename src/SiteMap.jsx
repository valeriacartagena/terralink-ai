import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Component to update map view when sites change
function MapUpdater({ sites }) {
  const map = useMap();
  
  useEffect(() => {
    if (sites && sites.length > 0) {
      // Center on first site
      const firstSite = sites[0];
      map.setView([firstSite.lat, firstSite.lon], 7);
    }
  }, [sites, map]);
  
  return null;
}

const SiteMap = ({ sites = [] }) => {
  // Default center (US)
  const defaultCenter = [39.8283, -98.5795];
  const defaultZoom = 4;

  // Get color based on score
  const getColor = (score) => {
    if (score >= 85) return '#22c55e'; // green
    if (score >= 70) return '#eab308'; // yellow
    if (score >= 50) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  // Get radius based on score
  const getRadius = (score) => {
    return Math.max(5, score / 10); // 5-10 pixels
  };

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        {/* Satellite imagery base layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Satellite: Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        
        {/* Street overlay for labels */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Update map view when sites change */}
        <MapUpdater sites={sites} />

        {/* Plot site markers */}
        {sites.map((site, idx) => (
          <CircleMarker
            key={idx}
            center={[site.lat, site.lon]}
            radius={getRadius(site.score)}
            fillColor={getColor(site.score)}
            color="#fff"
            weight={2}
            opacity={1}
            fillOpacity={0.8}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold text-lg mb-1">Site #{site.id}</div>
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Score:</span>
                    <span className="font-bold" style={{ color: getColor(site.score) }}>
                      {site.score}/100
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-mono text-xs">
                      {site.lat.toFixed(4)}°, {site.lon.toFixed(4)}°
                    </span>
                  </div>
                  {site.irradiance && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Irradiance:</span>
                      <span>{site.irradiance} kWh/m²/day</span>
                    </div>
                  )}
                  {site.slope !== undefined && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Slope:</span>
                      <span>{site.slope.toFixed(1)}°</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      {sites.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 text-xs z-[1000]">
          <div className="font-bold mb-2 text-slate-200">Site Suitability</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-slate-300">Excellent (85-100)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-slate-300">Good (70-84)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-slate-300">Fair (50-69)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-slate-300">Poor (&lt;50)</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-600 text-slate-400">
            {sites.length} sites analyzed
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteMap;