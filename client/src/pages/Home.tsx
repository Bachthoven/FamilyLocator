import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
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
import { Menu, Search, Plus } from 'lucide-react';
import { User, Location } from '@shared/schema';

export default function Home() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<(Location & { user: User }) | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Geolocation hook
  const { location: currentLocation, error: locationError } = useGeolocation({
    watch: true,
    enableHighAccuracy: true,
  });

  // WebSocket for real-time updates
  const { lastMessage } = useWebSocket();

  // Send location updates to server
  const saveLocationMutation = useMutation({
    mutationFn: async (locationData: any) => {
      await apiRequest('POST', '/api/locations', locationData);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      console.error('Failed to save location:', error);
    },
  });

  // Send location to server when it changes
  useEffect(() => {
    if (currentLocation && user?.locationSharingEnabled) {
      saveLocationMutation.mutate({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
      });
    }
  }, [currentLocation, user?.locationSharingEnabled]);

  // Fetch family members and their locations
  const { data: familyLocations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['/api/locations/family'],
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

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

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Map Interface */}
      <div className="h-screen w-full relative">
        <Map
          currentLocation={currentLocation}
          familyLocations={familyLocations}
          onLocationClick={handleLocationClick}
        />
        
        {/* Top Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-12">
          <div className="flex items-center justify-between">
            <Button variant="secondary" size="icon" className="rounded-full">
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">
                {familyLocations.length} member{familyLocations.length !== 1 ? 's' : ''} online
              </span>
            </div>
            
            <Button variant="secondary" size="icon" className="rounded-full">
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Bottom Sheet Panel */}
      <BottomSheet>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Family Members</h3>
          <Button variant="ghost" size="sm" className="text-primary">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
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
          ) : familyLocations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No family members added yet</p>
              <Button variant="outline" className="mt-2">
                <Plus className="w-4 h-4 mr-2" />
                Add Family Member
              </Button>
            </div>
          ) : (
            familyLocations.map((location) => (
              <FamilyMemberCard
                key={location.id}
                user={location.user}
                location={location}
                onViewLocation={() => handleLocationClick(location)}
              />
            ))
          )}
        </div>
      </BottomSheet>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
