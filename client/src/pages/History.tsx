import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MapPin, Users, List, Map } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@shared/schema';
import { getUserColor } from '@/utils/familyColors';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationWithUser {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string | null;
  type: string;
  timestamp: string;
  user: User;
}

interface FamilyLocationHistory {
  [userId: string]: {
    user: User;
    locations: LocationWithUser[];
  };
}

export default function History() {
  const { user } = useAuth();
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [, setLocation] = useLocation();

  // Fetch location history for the past 24 hours
  const { data: locationHistory = {}, isLoading, error } = useQuery<FamilyLocationHistory>({
    queryKey: ['/api/locations/history'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    retryDelay: 2000,
  });

  // Show error state if there's an authentication or fetch error
  if (error) {
    console.error('History fetch error:', error);
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <MapPin className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-red-500 font-medium">Unable to load location history</p>
            <p className="text-muted-foreground text-sm mt-2">
              {error.message || 'Please try refreshing the page'}
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Refresh Page
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    }
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLocationAccuracy = (accuracy: number) => {
    if (accuracy <= 10) return { label: 'High', color: 'bg-green-500' };
    if (accuracy <= 50) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-red-500' };
  };

  const getColorForUser = (userId: number) => {
    const userIds = Object.keys(locationHistory).map(Number);
    return getUserColor(userId, userIds);
  };

  const familyMembers = Object.entries(locationHistory);
  const totalLocations = familyMembers.reduce((sum, [_, data]) => sum + data.locations.length, 0);

  // Prepare all locations for map view
  const allLocations = familyMembers.flatMap(([userId, data]) => 
    data.locations.map(location => ({
      ...location,
      userId: parseInt(userId),
      userName: data.user.firstName || data.user.email,
      color: getColorForUser(parseInt(userId))
    }))
  );

  // Calculate map center from all locations
  const getMapCenter = (): [number, number] => {
    if (allLocations.length === 0) return [37.7749, -122.4194]; // Default to SF
    
    const avgLat = allLocations.reduce((sum, loc) => sum + loc.latitude, 0) / allLocations.length;
    const avgLng = allLocations.reduce((sum, loc) => sum + loc.longitude, 0) / allLocations.length;
    return [avgLat, avgLng];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading location history...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Location History</h1>
              <p className="text-sm text-muted-foreground">Past 24 hours</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <Map className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{familyMembers.length} members</p>
            <p className="text-xs text-muted-foreground">{totalLocations} locations</p>
          </div>
          
          {familyMembers.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedMember === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMember(null)}
                className="whitespace-nowrap"
              >
                <Users className="w-4 h-4 mr-1" />
                All Members
              </Button>
              {familyMembers.map(([userId, data]) => (
                <Button
                  key={userId}
                  variant={selectedMember === parseInt(userId) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMember(parseInt(userId))}
                  className="whitespace-nowrap"
                  style={{
                    borderColor: selectedMember === parseInt(userId) ? getColorForUser(parseInt(userId)) : undefined,
                    backgroundColor: selectedMember === parseInt(userId) ? getColorForUser(parseInt(userId)) : undefined,
                  }}
                >
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: getColorForUser(parseInt(userId)) }}
                  />
                  {data.user.firstName || data.user.email}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {data.locations.length}
                  </Badge>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {totalLocations === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Location History</h3>
              <p className="text-muted-foreground text-center">
                Location history will appear here once family members start sharing their locations.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'map' ? (
          <div className="space-y-4">
            {/* Map View */}
            <Card>
              <CardContent className="p-0">
                <div className="h-96 w-full rounded-lg overflow-hidden">
                  <MapContainer
                    center={getMapCenter()}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {allLocations
                      .filter(location => selectedMember === null || location.userId === selectedMember)
                      .map((location, index) => (
                        <CircleMarker
                          key={`${location.id}-${index}`}
                          center={[location.latitude, location.longitude]}
                          radius={6}
                          fillColor={location.color}
                          color="#ffffff"
                          weight={2}
                          fillOpacity={0.8}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-medium">{location.userName}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {formatTime(location.timestamp)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                ±{location.accuracy.toFixed(0)}m accuracy
                              </p>
                              {location.address && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {location.address}
                                </p>
                              )}
                            </div>
                          </Popup>
                          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                            <span className="text-xs">
                              {location.userName} • {formatTime(location.timestamp)}
                            </span>
                          </Tooltip>
                        </CircleMarker>
                      ))}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Legend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {familyMembers.map(([userId, data]) => (
                    <div key={userId} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: getColorForUser(parseInt(userId)) }}
                      />
                      <span className="text-sm text-foreground">
                        {data.user.firstName || data.user.email} ({data.locations.length})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {familyMembers
              .filter(([userId]) => selectedMember === null || selectedMember === parseInt(userId))
              .map(([userId, data]) => (
                <Card key={userId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: getColorForUser(parseInt(userId)) }}
                        />
                        <div>
                          <CardTitle className="text-base">
                            {data.user.firstName || data.user.email}
                          </CardTitle>
                          <CardDescription>
                            {data.locations.length} locations in the past 24 hours
                          </CardDescription>
                        </div>
                      </div>

                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {data.locations.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No locations recorded in the past 24 hours
                          </p>
                        ) : (
                          data.locations.map((location, index) => {
                            const accuracy = getLocationAccuracy(location.accuracy);
                            return (
                              <div key={location.id} className="relative">
                                {index > 0 && (
                                  <div className="absolute left-4 -top-3 w-px h-6 bg-border" />
                                )}
                                <button
                                  className="flex items-start space-x-3 w-full text-left hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                                  onClick={() => {
                                    // Navigate to Home page with focus location data in URL
                                    const focusData = {
                                      latitude: location.latitude,
                                      longitude: location.longitude,
                                      zoom: 16,
                                      timestamp: location.timestamp,
                                      userName: data.user.firstName || data.user.email
                                    };
                                    setLocation(`/?focus=${encodeURIComponent(JSON.stringify(focusData))}`);
                                  }}
                                >
                                  <div 
                                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                    style={{ backgroundColor: getColorForUser(parseInt(userId)) }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex flex-col">
                                        <p className="text-sm font-medium text-foreground">
                                          {formatTime(location.timestamp)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(location.timestamp).toLocaleString()}
                                        </p>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge
                                          variant="secondary"
                                          className={`text-xs text-white ${accuracy.color}`}
                                        >
                                          {accuracy.label}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {location.type}
                                        </Badge>
                                        <MapPin className="w-3 h-3 text-muted-foreground" />
                                      </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      <div className="flex items-center space-x-4">
                                        <span>
                                          📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                        </span>
                                        <span>±{location.accuracy.toFixed(0)}m</span>
                                      </div>
                                      {location.address && (
                                        <p className="mt-1 truncate">{location.address}</p>
                                      )}
                                      <p className="mt-1 text-xs text-blue-600">Click to view on map</p>
                                    </div>
                                  </div>
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}