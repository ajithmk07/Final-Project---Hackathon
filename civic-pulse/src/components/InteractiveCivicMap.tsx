import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle2,
  Compass,
  Crosshair,
  Eye,
  Filter,
  Layers,
  List,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Radio,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { CivicReport, GeographicHotspot, PriorityLevel } from '../types/civic';
import type { MunicipalZoneInfo } from '../api/client';
import { PriorityIndicator } from './PriorityIndicator';

interface InteractiveCivicMapProps {
  reports: CivicReport[];
  hotspots?: GeographicHotspot[];
  zones?: MunicipalZoneInfo[];
  showHotspots?: boolean;
  selectedReportId?: string | null;
  onSelectReport?: (reportId: string) => void;
  selectedHotspotId?: string | null;
  onSelectHotspot?: (hotspotId: string) => void;
  pickerMode?: boolean;
  pickedCoords?: { latitude: number; longitude: number } | null;
  onPickCoords?: (coords: { latitude: number; longitude: number }) => void;
  heightClass?: string;
}

interface TileLayerConfig {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  labelUrl?: string;
}

// 4 Advanced High-Resolution Tile Layers (Watermark-free, Google Maps style)
const ADVANCED_TILE_LAYERS: Record<'streetMap' | 'osmDetail' | 'satellite' | 'topoMap', TileLayerConfig> = {
  streetMap: {
    name: 'Google Roadmap Style',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, USGS, Intermap, METI',
    maxZoom: 19,
  },
  osmDetail: {
    name: 'OpenStreetMap Detailed',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite Aerial View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics, CNES/Airbus DS',
    maxZoom: 19,
  },
  topoMap: {
    name: 'Topographic & Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, FAO, NOAA, USGS',
    maxZoom: 19,
  },
};

// 4 Official Municipal Administrative Wards
const MUNICIPAL_WARDS = [
  {
    id: 'WARD-101',
    name: 'Ward 101 — Central Corridor & College Zone',
    color: '#3b82f6',
    coords: [
      [12.969, 77.587],
      [12.977, 77.587],
      [12.977, 77.599],
      [12.969, 77.599],
    ] as [number, number][],
    stats: 'Pop: 48,200 · PWD Sub-Division 1',
  },
  {
    id: 'WARD-102',
    name: 'Ward 102 — Metro Transit & North Plaza',
    color: '#10b981',
    coords: [
      [12.977, 77.587],
      [12.986, 77.587],
      [12.986, 77.597],
      [12.977, 77.597],
    ] as [number, number][],
    stats: 'Pop: 56,400 · Transit Police & Metro Authority',
  },
  {
    id: 'WARD-103',
    name: 'Ward 103 — East Industrial & Sub-Station Grid',
    color: '#f59e0b',
    coords: [
      [12.972, 77.599],
      [12.984, 77.599],
      [12.984, 77.608],
      [12.972, 77.608],
    ] as [number, number][],
    stats: 'Pop: 32,800 · Power & Industrial Inspectorate',
  },
  {
    id: 'WARD-104',
    name: 'Ward 104 — South Market & Canal Reach',
    color: '#8b5cf6',
    coords: [
      [12.960, 77.584],
      [12.969, 77.584],
      [12.969, 77.601],
      [12.960, 77.601],
    ] as [number, number][],
    stats: 'Pop: 61,100 · Sanitation & Stormwater Board',
  },
];

// Major Arterial Corridors with Live Traffic Simulation
const TRAFFIC_CORRIDORS: Array<{
  name: string;
  color: string;
  status: 'Heavy Congestion' | 'Moderate' | 'Flowing Clear';
  points: [number, number][];
}> = [
  {
    name: 'College Road Arterial (Hotspot Corridor)',
    color: '#ef4444',
    status: 'Heavy Congestion',
    points: [
      [12.970, 77.591],
      [12.97214, 77.59486],
      [12.974, 77.598],
    ],
  },
  {
    name: 'Old Market Road',
    color: '#f97316',
    status: 'Moderate',
    points: [
      [12.963, 77.586],
      [12.9656, 77.589],
      [12.968, 77.593],
    ],
  },
  {
    name: 'Metro North Expressway',
    color: '#22c55e',
    status: 'Flowing Clear',
    points: [
      [12.979, 77.589],
      [12.981, 77.592],
      [12.983, 77.597],
    ],
  },
  {
    name: 'Industrial Ring Transit Way',
    color: '#eab308',
    status: 'Moderate',
    points: [
      [12.975, 77.600],
      [12.9785, 77.6022],
      [12.982, 77.605],
    ],
  },
];

/**
 * Creates custom Google Maps style HTML pin markers with new, distinct accessible symbols.
 * - Critical: Vivid Red teardrop with pulsing hazard wave and white hazard diamond (!)
 * - High: Orange teardrop with white alert triangle (▲)
 * - Medium: Amber teardrop with white square (■)
 * - Low: Emerald teardrop with white check/dot (●)
 */
function createCustomPinIcon(
  level: PriorityLevel,
  isSelected: boolean
): L.DivIcon {
  const configs: Record<
    PriorityLevel,
    {
      bg: string;
      ring: string;
      symbolSvg: string;
      pulse: boolean;
      label: string;
    }
  > = {
    Critical: {
      bg: '#dc2626',
      ring: 'rgba(220, 38, 38, 0.45)',
      pulse: true,
      label: 'Critical Hazard',
      symbolSvg: `
        <svg viewBox="0 0 24 24" class="w-4 h-4 text-white fill-white stroke-white" stroke-width="1.5">
          <path d="M12 2L2 12l10 10 10-10L12 2z" fill="#991b1b" stroke="#ffffff" stroke-width="2"/>
          <path d="M12 8v5M12 16h.01" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      `,
    },
    High: {
      bg: '#ea580c',
      ring: 'rgba(234, 88, 12, 0.4)',
      pulse: false,
      label: 'High Priority',
      symbolSvg: `
        <svg viewBox="0 0 24 24" class="w-4 h-4 text-white fill-white">
          <polygon points="12 3 22 21 2 21" fill="#c2410c" stroke="#ffffff" stroke-width="2"/>
          <line x1="12" y1="9" x2="12" y2="14" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="12" y1="17" x2="12.01" y2="17" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      `,
    },
    Medium: {
      bg: '#d97706',
      ring: 'rgba(217, 119, 6, 0.35)',
      pulse: false,
      label: 'Medium Priority',
      symbolSvg: `
        <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 text-white fill-white">
          <rect x="4" y="4" width="16" height="16" rx="2" fill="#b45309" stroke="#ffffff" stroke-width="2"/>
        </svg>
      `,
    },
    Low: {
      bg: '#16a34a',
      ring: 'rgba(22, 163, 74, 0.35)',
      pulse: false,
      label: 'Low Priority',
      symbolSvg: `
        <svg viewBox="0 0 24 24" class="w-3 h-3 text-white fill-white">
          <circle cx="12" cy="12" r="8" fill="#15803d" stroke="#ffffff" stroke-width="2"/>
        </svg>
      `,
    },
  };

  const c = configs[level] || configs.Low;
  const size = isSelected ? 42 : 34;

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer ${isSelected ? 'scale-115 z-50' : ''}" style="width: ${size}px; height: ${size + 12}px;">
      ${
        c.pulse
          ? `<span class="absolute top-0 w-9 h-9 rounded-full animate-ping" style="background-color: ${c.ring};"></span>`
          : ''
      }
      <div 
        class="w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all transform hover:scale-110"
        style="background: linear-gradient(135deg, ${c.bg}, ${c.bg}ee); box-shadow: 0 4px 12px ${c.ring};"
        title="${c.label}"
      >
        ${c.symbolSvg}
      </div>
      <div 
        class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-[1px] drop-shadow-sm"
        style="border-top-color: ${c.bg};"
      ></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-civic-pin',
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 10],
    popupAnchor: [0, -(size + 8)],
  });
}

function createPickerPinIcon(): L.DivIcon {
  const html = `
    <div class="relative flex flex-col items-center animate-bounce" style="width: 38px; height: 50px;">
      <div class="w-10 h-10 rounded-full bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center">
        <svg viewBox="0 0 24 24" class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
        </svg>
      </div>
      <div class="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[9px] -mt-[1px] border-t-blue-600 drop-shadow-md"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'picker-civic-pin',
    iconSize: [38, 50],
    iconAnchor: [19, 48],
    popupAnchor: [0, -44],
  });
}

export function InteractiveCivicMap({
  reports,
  hotspots = [],
  zones = [],
  showHotspots = true,
  selectedReportId,
  onSelectReport,
  selectedHotspotId,
  onSelectHotspot,
  pickerMode = false,
  pickedCoords = null,
  onPickCoords,
  heightClass = 'h-[500px]',
}: InteractiveCivicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hotspotsLayerRef = useRef<L.LayerGroup | null>(null);
  const wardsLayerRef = useRef<L.LayerGroup | null>(null);
  const trafficLayerRef = useRef<L.LayerGroup | null>(null);
  const scannerLayerRef = useRef<L.Circle | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  const [activeLayer, setActiveLayer] = useState<keyof typeof ADVANCED_TILE_LAYERS>('streetMap');
  const [showWards, setShowWards] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerRadius, setScannerRadius] = useState<150 | 200>(200);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTableFallback, setShowTableFallback] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ lat: number; lng: number } | null>(null);
  const [activeWardName, setActiveWardName] = useState<string>('Ward 101 — Central Corridor');

  const defaultCenter: [number, number] = [12.97214, 77.59486];
  const defaultZoom = 15;

  // Initialize Advanced Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: pickedCoords ? [pickedCoords.latitude, pickedCoords.longitude] : defaultCenter,
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: true,
      maxZoom: 20,
      minZoom: 12,
    });

    // Add Base Tile Layer
    const tileConfig = ADVANCED_TILE_LAYERS[activeLayer];
    const tiles = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);
    tileLayerRef.current = tiles;

    if (tileConfig.labelUrl) {
      const labels = L.tileLayer(tileConfig.labelUrl, { maxZoom: tileConfig.maxZoom }).addTo(map);
      labelLayerRef.current = labels;
    }

    // Layer Groups
    wardsLayerRef.current = L.layerGroup().addTo(map);
    trafficLayerRef.current = L.layerGroup().addTo(map);
    hotspotsLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Track Cursor for Real-Time HUD
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorPos({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });

      // Update interactive Haversine scanner circle if enabled
      if (scannerActive && scannerLayerRef.current) {
        scannerLayerRef.current.setLatLng(e.latlng);
      }
    });

    // Handle Map Clicks
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onPickCoords) {
        onPickCoords({
          latitude: Number(e.latlng.lat.toFixed(6)),
          longitude: Number(e.latlng.lng.toFixed(6)),
        });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer on Switch
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }

    const tileConfig = ADVANCED_TILE_LAYERS[activeLayer];
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    if (tileConfig.labelUrl) {
      labelLayerRef.current = L.tileLayer(tileConfig.labelUrl, {
        maxZoom: tileConfig.maxZoom,
      }).addTo(map);
    }
  }, [activeLayer]);

  // Update Ward Boundaries
  useEffect(() => {
    if (!mapInstanceRef.current || !wardsLayerRef.current) return;
    const group = wardsLayerRef.current;
    group.clearLayers();

    if (!showWards) return;

    MUNICIPAL_WARDS.forEach((w) => {
      const polygon = L.polygon(w.coords, {
        color: w.color,
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: w.color,
        fillOpacity: 0.08,
      });

      polygon.bindTooltip(
        `<div class="font-sans text-xs font-semibold text-slate-800">
          <strong>${w.name}</strong><br/>
          <span class="text-[11px] text-slate-600">${w.stats}</span>
        </div>`,
        { sticky: true }
      );

      polygon.on('mouseover', () => setActiveWardName(w.name));

      polygon.addTo(group);
    });
  }, [showWards]);

  // Update Traffic Corridors
  useEffect(() => {
    if (!mapInstanceRef.current || !trafficLayerRef.current) return;
    const group = trafficLayerRef.current;
    group.clearLayers();

    if (!showTraffic) return;

    TRAFFIC_CORRIDORS.forEach((corridor) => {
      const line = L.polyline(corridor.points, {
        color: corridor.color,
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
      });

      line.bindTooltip(
        `<div class="font-sans text-xs">
          <strong>${corridor.name}</strong><br/>
          <span>Flow Status: <strong style="color: ${corridor.color}">${corridor.status}</strong></span>
        </div>`,
        { sticky: true }
      );

      line.addTo(group);
    });
  }, [showTraffic]);

  // Dynamic Haversine Scanner Tool
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (scannerActive) {
      if (!scannerLayerRef.current) {
        const center = map.getCenter();
        const circle = L.circle(center, {
          radius: scannerRadius,
          color: '#6366f1',
          weight: 2,
          fillColor: '#818cf8',
          fillOpacity: 0.2,
          dashArray: '5, 5',
        }).addTo(map);

        circle.bindTooltip(
          `<strong>Haversine Scanner (${scannerRadius}m)</strong><br/>Scanning duplicate & hotspot zone`,
          { permanent: false, sticky: true }
        );

        scannerLayerRef.current = circle;
      } else {
        scannerLayerRef.current.setRadius(scannerRadius);
      }
    } else if (scannerLayerRef.current) {
      map.removeLayer(scannerLayerRef.current);
      scannerLayerRef.current = null;
    }
  }, [scannerActive, scannerRadius]);

  // Update Report Pins with Custom Icons and Detailed InfoWindows
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    reports.forEach((report) => {
      if (
        report.latitude === null ||
        report.longitude === null ||
        !Number.isFinite(report.latitude) ||
        !Number.isFinite(report.longitude)
      ) {
        return;
      }

      const isSelected = report.reportId === selectedReportId;
      const icon = createCustomPinIcon(report.priorityLevel, isSelected);

      const marker = L.marker([report.latitude, report.longitude], { icon });

      // High-Detail InfoWindow Card
      const popupContent = `
        <div class="p-1 min-w-[240px] font-sans space-y-2">
          <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span class="font-mono text-xs font-bold text-blue-700">${report.reportId}</span>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              report.priorityLevel === 'Critical'
                ? 'bg-red-100 text-red-900 border border-red-300'
                : report.priorityLevel === 'High'
                ? 'bg-orange-100 text-orange-900 border border-orange-300'
                : report.priorityLevel === 'Medium'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }">
              ${report.priorityLevel === 'Critical' ? '◆ ! Critical' : report.priorityLevel === 'High' ? '▲ High' : report.priorityLevel} (${report.priorityScore}/100)
            </span>
          </div>

          <div class="font-bold text-xs text-slate-900 leading-snug">${report.title}</div>

          <div class="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
            <div><span class="text-slate-500">Category:</span> <strong class="text-slate-800">${report.category}</strong></div>
            <div><span class="text-slate-500">Status:</span> <strong class="text-slate-800">${report.status}</strong></div>
            <div class="col-span-2 text-slate-600"><span class="text-slate-500">Dept:</span> ${report.department}</div>
          </div>

          <div class="text-[11px] text-slate-500 flex items-center gap-1 truncate">
            <span>📍</span>
            <span class="truncate">${report.locationName || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</span>
          </div>

          <div class="pt-1.5 border-t border-slate-100 flex items-center justify-between">
            <span class="text-[10px] text-slate-400 font-mono">${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</span>
            <button 
              id="btn-inspect-${report.reportId}" 
              class="px-2.5 py-1 rounded-lg bg-blue-700 text-white text-[11px] font-semibold hover:bg-blue-800 transition-colors shadow-xs"
            >
              Open Details
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280 });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${report.reportId}`);
        if (btn && onSelectReport) {
          btn.onclick = () => onSelectReport(report.reportId);
        }
      });

      marker.on('click', () => {
        if (onSelectReport) onSelectReport(report.reportId);
      });

      marker.addTo(markersGroup);
    });
  }, [reports, selectedReportId, onSelectReport]);

  // Update Hotspots Layer (DBSCAN 200m Spherical Circles)
  useEffect(() => {
    if (!mapInstanceRef.current || !hotspotsLayerRef.current) return;
    const hotspotsGroup = hotspotsLayerRef.current;
    hotspotsGroup.clearLayers();

    if (!showHotspots) return;

    hotspots.forEach((hs) => {
      const isSelected = hs.hotspotId === selectedHotspotId;

      const circle = L.circle([hs.latitude, hs.longitude], {
        radius: hs.radiusMeters || 200,
        color: '#dc2626',
        weight: isSelected ? 3 : 2,
        dashArray: '6, 6',
        fillColor: '#ef4444',
        fillOpacity: isSelected ? 0.35 : 0.16,
      });

      circle.bindTooltip(
        `<div class="font-sans text-xs font-bold text-red-950">
          <span>🚨 Hotspot ${hs.hotspotId}</span> · ${hs.reportCount} reports (${hs.dominantCategory})
        </div>`,
        { sticky: true }
      );

      circle.on('click', () => {
        if (onSelectHotspot) onSelectHotspot(hs.hotspotId);
      });

      circle.addTo(hotspotsGroup);
    });
  }, [hotspots, showHotspots, selectedHotspotId, onSelectHotspot]);

  // Update Picker Pin
  useEffect(() => {
    if (!mapInstanceRef.current || !pickerMode) return;
    const map = mapInstanceRef.current;

    if (pickedCoords) {
      const pos: [number, number] = [pickedCoords.latitude, pickedCoords.longitude];
      if (!pickerMarkerRef.current) {
        const marker = L.marker(pos, {
          icon: createPickerPinIcon(),
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const newPos = marker.getLatLng();
          if (onPickCoords) {
            onPickCoords({
              latitude: Number(newPos.lat.toFixed(6)),
              longitude: Number(newPos.lng.toFixed(6)),
            });
          }
        });

        pickerMarkerRef.current = marker;
      } else {
        pickerMarkerRef.current.setLatLng(pos);
      }
    } else if (pickerMarkerRef.current) {
      map.removeLayer(pickerMarkerRef.current);
      pickerMarkerRef.current = null;
    }
  }, [pickedCoords, pickerMode, onPickCoords]);

  // Handle Quick Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    const q = searchQuery.trim().toLowerCase();

    // Check zones
    const zoneMatch = zones.find((z) => z.name.toLowerCase().includes(q) || z.ward.toLowerCase().includes(q));
    if (zoneMatch) {
      mapInstanceRef.current.flyTo([zoneMatch.latitude, zoneMatch.longitude], 17, { duration: 1.2 });
      if (pickerMode && onPickCoords) {
        onPickCoords({ latitude: zoneMatch.latitude, longitude: zoneMatch.longitude });
      }
      return;
    }

    // Check reports
    const reportMatch = reports.find(
      (r) => r.reportId.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
    );
    if (reportMatch && reportMatch.latitude && reportMatch.longitude) {
      mapInstanceRef.current.flyTo([reportMatch.latitude, reportMatch.longitude], 17, { duration: 1.2 });
      onSelectReport?.(reportMatch.reportId);
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => mapInstanceRef.current?.setView(defaultCenter, defaultZoom);

  return (
    <div
      className={`relative bg-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-32px)]' : heightClass
      }`}
    >
      {/* Top Floating GIS Control & Search Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Search Bar & Landmark Jump */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div
            className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-300 shadow-md"
          >
            <Search className="w-4 h-4 text-slate-500 shrink-0 cursor-pointer" onClick={() => handleSearchSubmit({ preventDefault: () => {} } as React.FormEvent)} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSearchSubmit({ preventDefault: () => {} } as React.FormEvent);
                }
              }}
              placeholder="Search street, ward, or complaint ID..."
              className="text-xs bg-transparent focus:outline-none w-48 sm:w-64 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Quick Landmark Dropdown */}
          <div className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-md">
            <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <select
              onChange={(e) => {
                const z = zones.find((item) => item.name === e.target.value);
                if (z && mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([z.latitude, z.longitude], 17, { duration: 1.2 });
                  if (pickerMode && onPickCoords) onPickCoords({ latitude: z.latitude, longitude: z.longitude });
                }
              }}
              defaultValue=""
              className="text-xs font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[170px] truncate"
            >
              <option value="">Jump to Landmark...</option>
              {zones.map((z) => (
                <option key={z.name} value={z.name}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Layer Switcher, Overlays & Fullscreen */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-300 shadow-md">
          {/* Map Layer Options */}
          <select
            value={activeLayer}
            onChange={(e) => setActiveLayer(e.target.value as keyof typeof ADVANCED_TILE_LAYERS)}
            className="text-xs font-semibold text-slate-800 bg-transparent px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
          >
            {Object.entries(ADVANCED_TILE_LAYERS).map(([k, cfg]) => (
              <option key={k} value={k}>
                {cfg.name}
              </option>
            ))}
          </select>

          <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

          {/* Toggle Wards */}
          <button
            type="button"
            onClick={() => setShowWards(!showWards)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
              showWards ? 'bg-indigo-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Municipal Ward Boundaries"
          >
            🏛️ Wards
          </button>

          {/* Toggle Traffic */}
          <button
            type="button"
            onClick={() => setShowTraffic(!showTraffic)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
              showTraffic ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Live Corridor Traffic Flow"
          >
            🚦 Traffic
          </button>

          {/* Toggle Haversine Scanner Tool */}
          <button
            type="button"
            onClick={() => setScannerActive(!scannerActive)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
              scannerActive ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle 150m/200m Haversine Radius Scanner"
          >
            📐 Scanner
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

          {/* Table fallback */}
          <button
            type="button"
            onClick={() => setShowTableFallback(!showTableFallback)}
            className="p-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100"
            title="Toggle Accessibility Table View"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Floating Bottom-Right Zoom & Navigation Controls */}
      <div className="absolute bottom-10 right-3 z-[1000] flex flex-col gap-1.5 shadow-md rounded-xl overflow-hidden bg-white/95 backdrop-blur-md border border-slate-300">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom In"
          className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-100 border-b border-slate-200 font-bold text-sm"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom Out"
          className="w-8 h-8 flex items-center justify-center text-slate-800 hover:bg-slate-100 font-bold text-sm"
        >
          &minus;
        </button>
        <button
          type="button"
          onClick={handleResetView}
          aria-label="Reset Map Center"
          title="Reset to City Center"
          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 border-t border-slate-200"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scanner Radius Switcher (when scanner is active) */}
      {scannerActive && (
        <div className="absolute top-16 right-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-400 shadow-md text-xs flex items-center gap-2">
          <span className="font-semibold text-blue-900">Radius:</span>
          <button
            type="button"
            onClick={() => setScannerRadius(150)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              scannerRadius === 150 ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            150m (Duplicate)
          </button>
          <button
            type="button"
            onClick={() => setScannerRadius(200)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              scannerRadius === 200 ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            200m (Hotspot)
          </button>
        </div>
      )}

      {/* Bottom GIS Status & Accessible Legend Bar */}
      <div className="absolute bottom-2 left-2 right-2 sm:right-auto z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-300 shadow-md text-xs text-slate-800 flex flex-wrap items-center gap-3">
        {/* New Symbols Indicator */}
        <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">Symbols:</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded-xs bg-red-600 border border-white shadow-xs flex items-center justify-center text-[9px] font-bold text-white">!</span>
          <span className="font-semibold text-red-900">Critical (◆ !)</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3.5 h-3.5 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-orange-600 flex items-center justify-center"></span>
          <span className="font-semibold text-orange-900">High (▲)</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-amber-600 rounded-xs"></span>
          <span className="text-slate-700">Medium (■)</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></span>
          <span className="text-slate-700">Low (●)</span>
        </span>

        {/* Live Coordinate & Ward HUD */}
        {cursorPos && (
          <span className="hidden md:inline-flex items-center gap-2 border-l border-slate-200 pl-3 font-mono text-[11px] text-slate-600">
            <span>📍 {cursorPos.lat}, {cursorPos.lng}</span>
            <span className="text-slate-400">·</span>
            <span className="text-blue-700 font-sans font-medium">{activeWardName}</span>
          </span>
        )}
      </div>

      {/* Accessible Tabular Fallback Drawer */}
      {showTableFallback && (
        <div className="absolute inset-0 z-[1001] bg-white/98 backdrop-blur-md p-5 overflow-auto space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Tabular Geocoded Incident List ({reports.length} reports)
            </h3>
            <button
              type="button"
              onClick={() => setShowTableFallback(false)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              Close Table View
            </button>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Title</th>
                <th className="p-2">Category</th>
                <th className="p-2">Coordinates</th>
                <th className="p-2">Priority</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.reportId} className="hover:bg-slate-50">
                  <td className="p-2 font-mono text-blue-700 font-semibold">{r.reportId}</td>
                  <td className="p-2 text-slate-900 font-medium">{r.title}</td>
                  <td className="p-2 text-slate-600">{r.category}</td>
                  <td className="p-2 font-mono text-[11px] text-slate-500">
                    {r.latitude ? `${r.latitude.toFixed(4)}, ${r.longitude?.toFixed(4)}` : 'Unmapped'}
                  </td>
                  <td className="p-2">
                    <PriorityIndicator level={r.priorityLevel} score={r.priorityScore} />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTableFallback(false);
                        onSelectReport?.(r.reportId);
                      }}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
