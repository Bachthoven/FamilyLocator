import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User, Location } from '@shared/schema';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createUserIcon = (color: string) => new L.DivIcon({
  html: `
    <div class="relative">
      <div class="w-4 h-4 bg-${color}-500 rounded-full border-2 border-white shadow-lg"></div>
      <div class="absolute inset-0 w-4 h-4 bg-${color}-500 rounded-full animate-ping opacity-75"></div>
    </div>
  `,
  className: 'custom-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const currentUserIcon = createUserIcon('blue');
const familyMemberIcon = createUserIcon('green');

interface MapProps {
  currentLocation: { latitude: number; longitude: number } | null;
  familyLocations: Array<Location & { user: User }>;
  onLocationClick?: (location: Location & { user: User }) => void;
}

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

export default function Map({ currentLocation, familyLocations, onLocationClick }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC

  useEffect(() => {
    if (currentLocation) {
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
    }
  }, [currentLocation]);

  const centerOnUser = () => {
    if (currentLocation) {
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
    }
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={mapCenter}
        zoom={13}
        className="h-full w-full"
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MapCenter center={mapCenter} />
        
        {/* Current user location */}
        {currentLocation && (
          <Marker
            position={[currentLocation.latitude, currentLocation.longitude]}
            icon={currentUserIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="font-medium">You</div>
                <div className="text-sm text-gray-500">Current location</div>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Family member locations */}
        {familyLocations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={familyMemberIcon}
            eventHandlers={{
              click: () => onLocationClick?.(location),
            }}
          >
            <Popup>
              <div className="text-center">
                <div className="font-medium">
                  {location.user.firstName || location.user.email}
                </div>
                <div className="text-sm text-gray-500">
                  {location.address || 'Unknown location'}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(location.timestamp!).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Center on user button */}
      {currentLocation && (
        <button
          onClick={centerOnUser}
          className="absolute bottom-32 right-4 z-[1000] w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-white hover:bg-primary/90 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
