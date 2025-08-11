import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Users, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User, Location } from '@shared/schema';

interface FamilyLocation extends Location {
  user: User;
}

// Custom marker icons for different family members
const createCustomIcon = (profileImageUrl?: string, color = '#3B82F6') => {
  const iconHtml = profileImageUrl 
    ? `<div style="
        width: 40px; 
        height: 40px; 
        border-radius: 50%; 
        border: 3px solid ${color}; 
        background-image: url(${profileImageUrl}); 
        background-size: cover; 
        background-position: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>`
    : `<div style="
        width: 40px; 
        height: 40px; 
        border-radius: 50%; 
        border: 3px solid ${color}; 
        background-color: ${color}; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        color: white; 
        font-weight: bold; 
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${profileImageUrl}</div>`;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// Component to fit map bounds to show all markers
function MapBoundsController({ locations }: { locations: FamilyLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      );
      
      // Add padding and fit bounds
      map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 10 
      });
    } else {
      // Default world view
      map.setView([20, 0], 2);
    }
  }, [map, locations]);

  return null;
}

// Component for map controls
function MapControls() {
  const map = useMap();

  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();
  const fitWorld = () => map.setView([20, 0], 2);

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={zoomIn}
        className="h-10 w-10 p-0 shadow-lg"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={zoomOut}
        className="h-10 w-10 p-0 shadow-lg"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={fitWorld}
        className="h-10 w-10 p-0 shadow-lg"
        title="View Full World"
      >
        <Maximize2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function WorldMap() {
  const { user } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyLocation | null>(null);

  // Get family locations from API
  const { data: familyLocations = [], isLoading, error } = useQuery<FamilyLocation[]>({
    queryKey: ['/api/locations/family'],
    refetchInterval: 60000, // Refresh every minute for world map
  });

  // Use only family locations from the API (includes current user if location sharing is enabled)
  const allLocations: FamilyLocation[] = familyLocations;

  const getMarkerColor = (userId: string) => {
    if (userId === user?.id) return '#10B981'; // Green for current user
    const colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatLastSeen = (timestamp: Date | null) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading world map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load locations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* Header */}
      <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Family World Map</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {allLocations.length} family member{allLocations.length !== 1 ? 's' : ''}
        </p>
        
        {/* Legend */}
        <div className="mt-3 space-y-2">
          {allLocations.slice(0, 5).map((location) => (
            <div key={location.user?.id || location.id} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getMarkerColor(location.user?.id || 'default') }}
              />
              <span className="font-medium">
                {location.user?.id === user?.id ? 'You' : (location.user?.firstName || location.user?.email || 'Unknown')}
              </span>
              <Badge variant="outline" className="text-xs">
                {formatLastSeen(location.timestamp)}
              </Badge>
            </div>
          ))}
          {allLocations.length > 5 && (
            <div className="text-xs text-muted-foreground">
              +{allLocations.length - 5} more
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <MapContainer
        ref={mapRef}
        center={[20, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Map bounds controller */}
        <MapBoundsController locations={allLocations} />
        
        {/* Map controls */}
        <MapControls />

        {/* Family member markers */}
        {allLocations.map((location) => {
          const isCurrentUser = location.user?.id === user?.id;
          const displayName = isCurrentUser ? 'You' : 
            (location.user?.firstName || location.user?.email?.split('@')[0] || 'Unknown');
          
          return (
            <Marker
              key={`${location.user?.id || location.id}-${location.timestamp || Date.now()}`}
              position={[location.latitude, location.longitude]}
              icon={createCustomIcon(
                location.user?.profileImageUrl || displayName[0]?.toUpperCase(),
                getMarkerColor(location.user?.id || 'default')
              )}
              eventHandlers={{
                click: () => setSelectedMember(location),
              }}
            >
              <Popup>
                <div className="p-2 min-w-48">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage 
                        src={location.user?.profileImageUrl || undefined}
                        alt={displayName}
                      />
                      <AvatarFallback>
                        {displayName?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{displayName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {location.user?.email || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span>{location.address || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coordinates:</span>
                      <span className="font-mono">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last updated:</span>
                      <span>{formatLastSeen(location.timestamp)}</span>
                    </div>
                    {location.accuracy && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span>±{Math.round(location.accuracy)}m</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant={location.type === 'automatic_hourly' ? 'secondary' : 'default'}>
                        {location.type === 'automatic_hourly' ? 'Auto' : 'Manual'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Empty state */}
      {allLocations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 z-[1000]">
          <div className="text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Family Members Found</h3>
            <p className="text-muted-foreground mb-4">
              Add family members to see their locations on the world map
            </p>
          </div>
        </div>
      )}
    </div>
  );
}