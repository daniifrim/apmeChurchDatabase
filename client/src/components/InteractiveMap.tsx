import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Church } from "@/types";

interface InteractiveMapProps {
  searchQuery: string;
  selectedCountyId: string;
  selectedRegionId: string;
  selectedChurch: Church | null;
  onChurchSelect: (church: Church) => void;
  onChurchEdit?: (church: Church) => void;
  onChurchPopup?: (church: Church | null) => void;
  userLocation?: {lat: number, lng: number} | null;
}

const ENGAGEMENT_COLORS = {
  high: "#228B22",
  medium: "#FF6B35", 
  low: "#EAB308",
  new: "#2E5BBA"
};

export default function InteractiveMap({
  searchQuery,
  selectedCountyId,
  selectedRegionId,
  selectedChurch,
  onChurchSelect,
  onChurchEdit,
  onChurchPopup,
  userLocation,
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: churches = [], error: churchesError, isLoading } = useQuery<Church[]>({
    queryKey: ["/api/churches", searchQuery, selectedCountyId, selectedRegionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCountyId) params.set('countyId', selectedCountyId);
      if (selectedRegionId) params.set('regionId', selectedRegionId);
      
      const url = `/api/churches?${params}`;
      console.log('🗺️ InteractiveMap: Fetching churches:', { url, params: Object.fromEntries(params) });
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('❌ InteractiveMap: API error:', response.status, response.statusText);
        throw new Error(`Churches API error: ${response.status}`);
      }
      const result = await response.json();
      console.log('✅ InteractiveMap: Churches loaded:', { count: result.length });
      return result;
    },
    retry: false,
  });

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([45.9432, 24.9668], 7);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Close popup when clicking on map
    map.on('click', () => {
      if (onChurchPopup) {
        onChurchPopup(null);
      }
    });

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when churches change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    churches.forEach((church) => {
      const lat = parseFloat(church.latitude);
      const lng = parseFloat(church.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      const color = ENGAGEMENT_COLORS[church.engagementLevel as keyof typeof ENGAGEMENT_COLORS] || "#6B7280";
      
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([lat, lng], { icon: customIcon })
        .on('click', (e) => {
          e.originalEvent?.stopPropagation();
          if (onChurchPopup) {
            onChurchPopup(church);
          }
        });

      markersRef.current!.addLayer(marker);
    });
  }, [churches, onChurchSelect]);

  // Center on selected church
  useEffect(() => {
    if (!mapRef.current || !selectedChurch) return;

    const lat = parseFloat(selectedChurch.latitude);
    const lng = parseFloat(selectedChurch.longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      mapRef.current.setView([lat, lng], 12);
    }
  }, [selectedChurch]);

  // Center on user location
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    mapRef.current.setView([userLocation.lat, userLocation.lng], 12);
    
    // Add a user location marker
    const userMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: `<div style="background-color: #2E5BBA; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(46,91,186,0.5);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      })
    });
    
    // Remove any existing user location marker and add the new one
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker && (layer as any)._isUserLocation) {
        mapRef.current!.removeLayer(layer);
      }
    });
    
    (userMarker as any)._isUserLocation = true;
    userMarker.addTo(mapRef.current);
  }, [userLocation]);

  console.log('🗺️ InteractiveMap render:', { 
    searchQuery, 
    selectedCountyId, 
    selectedRegionId, 
    churchesCount: churches.length,
    isLoading,
    hasError: !!churchesError
  });

  if (churchesError) {
    console.error('❌ InteractiveMap: Rendering error state');
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-4">
          <p className="text-red-600 font-medium">Failed to load map data</p>
          <p className="text-gray-600 text-sm mt-1">{churchesError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div ref={containerRef} className="h-full w-full" />
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 space-y-2">
        <button 
          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-ministry-blue transition-colors"
          onClick={() => mapRef.current?.zoomIn()}
          title="Zoom In"
        >
          <span className="text-lg font-bold">+</span>
        </button>
        <button 
          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-ministry-blue transition-colors"
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom Out"
        >
          <span className="text-lg font-bold">−</span>
        </button>
        <button 
          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-ministry-blue transition-colors"
          onClick={() => mapRef.current?.setView([45.9432, 24.9668], 7)}
          title="Reset View"
        >
          <span className="text-xs">🏠</span>
        </button>
      </div>



    </div>
  );
}
