import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Church } from "@/types";

interface InteractiveMapProps {
  searchQuery: string;
  selectedCounty: string;
  selectedEngagementLevel: string;
  selectedChurch: Church | null;
  onChurchSelect: (church: Church) => void;
}

const ENGAGEMENT_COLORS = {
  high: "#228B22",
  medium: "#FF6B35", 
  low: "#EAB308",
  new: "#2E5BBA"
};

export default function InteractiveMap({
  searchQuery,
  selectedCounty,
  selectedEngagementLevel,
  selectedChurch,
  onChurchSelect,
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: churches = [] } = useQuery<Church[]>({
    queryKey: ["/api/churches", searchQuery, selectedCounty, selectedEngagementLevel],
    retry: false,
  });

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([45.9432, 24.9668], 7);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

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
        .bindPopup(
          `<div class="p-2">
            <h3 class="font-semibold text-sm">${church.name}</h3>
            <p class="text-xs text-gray-600">${church.address}</p>
            <p class="text-xs text-gray-500 mt-1">
              Pastor: ${church.pastor || 'N/A'}<br/>
              Members: ${church.memberCount || 'N/A'}<br/>
              Engagement: ${church.engagementLevel}
            </p>
          </div>`
        )
        .on('click', () => {
          onChurchSelect(church);
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

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <h4 className="text-sm font-semibold text-dark-blue-grey mb-2">Engagement Levels</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-growth-green"></div>
            <span>High Engagement</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-warm-orange"></div>
            <span>Medium Engagement</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Low Engagement</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-ministry-blue"></div>
            <span>New Church</span>
          </div>
        </div>
      </div>
    </div>
  );
}
