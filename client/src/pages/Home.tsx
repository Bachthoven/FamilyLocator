import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocationLogger } from '@/hooks/useLocationLogger';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import Map from '@/components/Map';
import BottomSheet from '@/components/BottomSheet';
import FamilyMemberCard from '@/components/FamilyMemberCard';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';

import { Skeleton } from '@/components/ui/skeleton';
import { Users, MapPin } from 'lucide-react';
import { User, Location } from '@shared/schema';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<(Location & { user: User }) | null>(null);
  const [isFamilyPanelExpanded, setIsFamilyPanelExpanded] = useState(false);

  // This component is now protected by authentication in App.tsx
  // No need for manual redirect logic

  // Use the location logger hook for automatic location tracking
  const { 
    currentLocation, 
    locationError, 
    isLoggingLocation 
  } = useLocationLogger();

  // WebSocket for real-time updates
  const { lastMessage, sendMessage } = useWebSocket();

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user && sendMessage) {
      sendMessage({ type: 'auth', userId: user.id });
    }
  }, [user, sendMessage]);

  // Get family locations
  const { data: familyLocations = [], isLoading: locationsLoading } = useQuery<Array<Location & { user: User }>>({
    queryKey: ['/api/locations/family'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get user places  
  const { data: places = [], isLoading: placesLoading } = useQuery<Array<{ id: number; name: string; createdAt: Date | null; address: string | null; userId: number; latitude: number; longitude: number; category: string | null; }>>({
    queryKey: ['/api/places'],
    enabled: !!user,
  });

  // Helper functions for last seen indicator
  const isLocationRecent = (timestamp: string | Date) => {
    const locationTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
    return (now - locationTime) < fifteenMinutes;
  };

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

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'locationUpdate') {
      // Refresh family locations when receiving updates
      queryClient.invalidateQueries({ queryKey: ['/api/locations/family'] });
      
      // Show notification for location updates
      const updatedUser = familyLocations.find(loc => loc.userId === lastMessage.userId)?.user;
      if (updatedUser) {
        toast({
          title: "Location Updated",
          description: `${updatedUser.firstName || updatedUser.email} shared their location`,
        });
      }
    } else if (lastMessage?.type === 'geofence') {
      // Handle geofence notifications
      const { userName, placeName, action, message } = lastMessage;
      
      // Show toast notification only (system notification is handled by useWebSocket.ts)
      toast({
        title: message,
        duration: 5000,
      });
      
    }
  }, [lastMessage, familyLocations, queryClient, toast]);

  // Handle location errors
  useEffect(() => {
    if (locationError) {
      toast({
        title: "Location Error", 
        description: locationError,
        variant: "destructive",
      });
    }
  }, [locationError, toast]);

  const handleLocationClick = (location: Location & { user: User }) => {
    setSelectedLocation(location);
    // Center map on selected location would be handled by Map component
  };

  const handlePlaceClick = (place: any) => {
    toast({
      title: "Saved Place",
      description: `${place.name} - ${place.address}`,
    });
  };

  // Use all family locations since search was removed
  const filteredFamilyLocations = familyLocations;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
          <Skeleton className="w-32 h-4" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Protected by authentication in App.tsx
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Map Interface */}
      <div className="h-screen w-full relative">
        <Map
          currentLocation={currentLocation}
          familyLocations={familyLocations}
          places={places}
          onLocationClick={handleLocationClick}
          onPlaceClick={handlePlaceClick}
        />
        
        {/* Top Header - Clean status indicator only */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-12">
          <div className="flex items-center justify-center">
            <div className="bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">
                {familyLocations.length} member{familyLocations.length !== 1 ? 's' : ''} online
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Expandable Family Panel Button */}
      {!isFamilyPanelExpanded && (
        <div className="absolute bottom-4 left-4 right-4 z-40">
          <Button
            onClick={() => setIsFamilyPanelExpanded(true)}
            className="w-full bg-background/90 backdrop-blur-sm border border-border text-foreground hover:bg-background/95"
            variant="outline"
          >
            <Users className="w-4 h-4 mr-2" />
            View Family Members ({familyLocations.length})
          </Button>
        </div>
      )}

      {/* Expandable Bottom Sheet Panel */}
      {isFamilyPanelExpanded && (
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-background rounded-t-3xl shadow-lg border-t border-border">
          {/* Handle and Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-semibold">Family Members</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFamilyPanelExpanded(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </Button>
          </div>
          
          {/* Content */}
          <div className="px-4 pb-20 max-h-96 overflow-y-auto">
            <div className="space-y-3 pt-4">
              {locationsLoading ? (
                // Loading skeletons
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="w-32 h-4 mb-2" />
                      <Skeleton className="w-24 h-3" />
                    </div>
                    <Skeleton className="w-16 h-8" />
                  </div>
                ))
              ) : filteredFamilyLocations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No family members added yet</p>
                  <Link href="/family">
                    <Button variant="outline" className="mt-2">
                      <Users className="w-4 h-4 mr-2" />
                      Add Family Member
                    </Button>
                  </Link>
                </div>
              ) : (
                filteredFamilyLocations.map((location) => {
                  const isRecent = isLocationRecent(location.timestamp!);
                  return (
                    <FamilyMemberCard
                      key={location.id}
                      user={location.user}
                      location={location}
                      isRecent={isRecent}
                      lastSeen={isRecent ? null : formatTimeSince(location.timestamp!)}
                      onViewLocation={() => handleLocationClick(location)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
