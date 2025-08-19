import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User, Location, Place } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { NotificationBell } from '@/components/NotificationBell';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createUserIcon = (color: string, isRecent: boolean = true) => new L.DivIcon({
  html: `
    <div class="relative">
      <div class="w-4 h-4 bg-${color}-500 rounded-full border-2 border-white shadow-lg ${isRecent ? '' : 'opacity-60'}"></div>
      ${isRecent ? `<div class="absolute inset-0 w-4 h-4 bg-${color}-500 rounded-full animate-ping opacity-75"></div>` : ''}
      ${!isRecent ? '<div class="absolute -top-1 -right-1 w-2 h-2 bg-gray-400 rounded-full border border-white"></div>' : ''}
    </div>
  `,
  className: 'custom-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const currentUserIcon = createUserIcon('blue');

// Helper function to check if location is recent (within last 15 minutes)
const isLocationRecent = (timestamp: string | Date) => {
  const locationTime = new Date(timestamp).getTime();
  const now = new Date().getTime();
  const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
  return (now - locationTime) < fifteenMinutes;
};

// Helper function to format time since last seen
const formatTimeSince = (timestamp: string | Date) => {
  const locationTime = new Date(timestamp).getTime();
  const now = new Date().getTime();
  const diffMinutes = Math.floor((now - locationTime) / (1000 * 60));
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffMinutes < 1440) { // Less than 24 hours
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return `${days}d ago`;
  }
};

// Create place marker icons based on category
const createPlaceIcon = (category: string) => {
  const categoryColors = {
    home: 'purple',
    work: 'orange', 
    school: 'yellow',
    other: 'gray'
  };
  
  const color = categoryColors[category as keyof typeof categoryColors] || 'gray';
  
  return new L.DivIcon({
    html: `
      <div class="relative">
        <div class="w-6 h-6 bg-${color}-500 rounded-lg border-2 border-white shadow-lg flex items-center justify-center">
          <div class="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
    `,
    className: 'custom-place-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface MapProps {
  currentLocation: { latitude: number; longitude: number } | null;
  familyLocations: Array<Location & { user: User }>;
  places: Place[];
  onLocationClick?: (location: Location & { user: User }) => void;
  onPlaceClick?: (place: Place) => void;
}

function MapCenter({ center, shouldUpdate }: { center: [number, number]; shouldUpdate: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (shouldUpdate) {
      map.setView(center, map.getZoom());
    }
  }, [center, map, shouldUpdate]);
  
  return null;
}

export default function Map({ currentLocation, familyLocations, places, onLocationClick, onPlaceClick }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [shouldUpdateCenter, setShouldUpdateCenter] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { toast } = useToast();

  // Check for focus location from family page navigation
  useEffect(() => {
    const focusLocationData = sessionStorage.getItem('focusLocation');
    if (focusLocationData) {
      try {
        const focusLocation = JSON.parse(focusLocationData);
        setMapCenter([focusLocation.latitude, focusLocation.longitude]);
        setShouldUpdateCenter(true);
        setHasInitialized(true);
        
        // Clear the session storage
        sessionStorage.removeItem('focusLocation');
        
        // Reset the flag after a short delay
        setTimeout(() => setShouldUpdateCenter(false), 100);
        
        toast({
          title: "Map centered",
          description: "Showing family member's location",
        });
        
        return; // Exit early so we don't set center to current location
      } catch (error) {
        console.error('Failed to parse focus location:', error);
        sessionStorage.removeItem('focusLocation');
      }
    }
    
    // Only set initial center once when location first becomes available (and no focus location)
    if (currentLocation && !hasInitialized) {
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
      setShouldUpdateCenter(true);
      setHasInitialized(true);
      // Reset the flag after a short delay to allow the map to update
      setTimeout(() => setShouldUpdateCenter(false), 100);
    }
  }, [currentLocation, hasInitialized, toast]);

  const centerOnUser = () => {
    if (currentLocation) {
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
      setShouldUpdateCenter(true);
      // Reset the flag after a short delay
      setTimeout(() => setShouldUpdateCenter(false), 100);
    }
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={mapCenter}
        zoom={15}
        minZoom={1}
        maxZoom={22}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={false}
      >
        {mapType === 'street' ? (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
            maxZoom={22}
            maxNativeZoom={20}
          />
        ) : (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
            attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
            maxZoom={22}
            maxNativeZoom={20}
          />
        )}
        
        <MapCenter center={mapCenter} shouldUpdate={shouldUpdateCenter} />
        
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
        {familyLocations.map((location) => {
          const isRecent = isLocationRecent(location.timestamp!);
          const familyMemberIcon = createUserIcon('green', isRecent);
          
          return (
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
                    {isRecent ? (
                      <>Active now • {new Date(location.timestamp!).toLocaleTimeString()}</>
                    ) : (
                      <>Last seen {formatTimeSince(location.timestamp!)}</>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Saved places */}
        {places.map((place) => (
          <Marker
            key={`place-${place.id || Math.random()}`}
            position={[place.latitude, place.longitude]}
            icon={createPlaceIcon(place.category || 'other')}
            draggable={!!place.id}
            eventHandlers={{
              click: () => onPlaceClick?.(place),
              dragstart: () => {
                if (place.id) {
                  setIsDragging(place.id);
                }
              },
              dragend: async (event) => {
                const marker = event.target;
                const position = marker.getLatLng();
                
                // Check if place has an ID before making API call
                if (!place.id) {
                  console.error('Cannot update place without ID');
                  toast({
                    title: "Cannot update location",
                    description: "This place needs to be saved first",
                    variant: "destructive",
                  });
                  marker.setLatLng([place.latitude, place.longitude]);
                  setIsDragging(null);
                  return;
                }
                
                try {
                  console.log(`Updating place ${place.id} to ${position.lat}, ${position.lng}`);
                  await apiRequest('PATCH', `/api/places/${place.id}/location`, {
                    latitude: position.lat,
                    longitude: position.lng,
                  });
                  
                  // Update the place data locally on success
                  place.latitude = position.lat;
                  place.longitude = position.lng;
                  
                  // Invalidate places query to refresh the data
                  queryClient.invalidateQueries({ queryKey: ['/api/places'] });
                  
                  toast({
                    title: "Location updated",
                    description: `${place.name} has been moved to the new position`,
                  });
                } catch (error: any) {
                  console.error('Failed to update place location:', error);
                  const errorMessage = error?.message || "Please try again";
                  
                  toast({
                    title: "Failed to update location",
                    description: errorMessage,
                    variant: "destructive",
                  });
                  
                  // Reset marker to original position on error
                  marker.setLatLng([place.latitude, place.longitude]);
                } finally {
                  setIsDragging(null);
                }
              },
            }}
          >
            <Popup>
              <div className="text-center">
                <div className="font-medium">{place.name}</div>
                <div className="text-sm text-gray-500 capitalize">
                  {place.category} • Saved Place
                </div>
                <div className="text-xs text-gray-400">
                  {place.address}
                </div>
                {place.id && (
                  <div className="text-xs text-blue-600 mt-2 font-medium">
                    {isDragging === place.id ? "Drag to reposition" : "Drag pin to adjust location"}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Top Left Controls - Notification Bell */}
      <div className="absolute top-4 right-4 z-[1000]">
        <NotificationBell />
      </div>
      
      {/* Map Controls */}
      <div className="absolute bottom-32 right-4 z-[1000] flex flex-col space-y-2">
        {/* Map Type Toggle */}
        <button
          onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
          className="w-14 h-14 bg-white border border-gray-300 rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          title={mapType === 'street' ? 'Switch to satellite view' : 'Switch to street view'}
        >
          {mapType === 'street' ? (
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          )}
        </button>

        {/* Zoom In Button */}
        <button
          onClick={() => {
            const map = mapRef.current;
            if (map) {
              map.zoomIn();
            }
          }}
          className="w-14 h-14 bg-white border border-gray-300 rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Zoom in"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Zoom Out Button */}
        <button
          onClick={() => {
            const map = mapRef.current;
            if (map) {
              map.zoomOut();
            }
          }}
          className="w-14 h-14 bg-white border border-gray-300 rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Zoom out"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        {/* Center on user button */}
        {currentLocation && (
          <button
            onClick={centerOnUser}
            className="w-14 h-14 bg-primary rounded-lg shadow-lg flex items-center justify-center text-white hover:bg-primary/90 transition-colors"
            title="Center on my location"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
