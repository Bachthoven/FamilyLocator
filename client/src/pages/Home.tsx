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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Search, Plus, Settings, Users, MapPin } from 'lucide-react';
import { User, Location } from '@shared/schema';
import { Link } from 'wouter';

export default function Home() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<(Location & { user: User }) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  // Filter family locations based on search query
  const filteredFamilyLocations = familyLocations.filter(location => {
    if (!searchQuery) return true;
    const user = location.user;
    const searchLower = searchQuery.toLowerCase();
    return (
      user?.firstName?.toLowerCase().includes(searchLower) ||
      user?.lastName?.toLowerCase().includes(searchLower) ||
      user?.email?.toLowerCase().includes(searchLower) ||
      location.address?.toLowerCase().includes(searchLower)
    );
  });

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
        <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-12">
          <div className="flex items-center justify-between">
            {/* Hamburger Menu - positioned to avoid map controls */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full shadow-lg">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    FamilyLocator
                  </SheetTitle>
                  <SheetDescription>
                    Navigate to different sections of the app
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <Link href="/">
                    <Button variant="ghost" className="w-full justify-start">
                      <MapPin className="w-4 h-4 mr-2" />
                      Map
                    </Button>
                  </Link>
                  <Link href="/family">
                    <Button variant="ghost" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      Family Members
                    </Button>
                  </Link>
                  <Link href="/places">
                    <Button variant="ghost" className="w-full justify-start">
                      <MapPin className="w-4 h-4 mr-2" />
                      Places
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button variant="ghost" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">
                {familyLocations.length} member{familyLocations.length !== 1 ? 's' : ''} online
              </span>
            </div>
            
            {/* Search Button */}
            <Button 
              variant="secondary" 
              size="icon" 
              className="rounded-full shadow-lg"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Search Bar */}
          {isSearchOpen && (
            <div className="mt-4">
              <Input
                placeholder="Search family members or places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background/90 backdrop-blur-sm border-border"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Sheet Panel */}
      <BottomSheet>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Family Members</h3>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
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
          ) : filteredFamilyLocations.length === 0 && searchQuery ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              <Button variant="outline" className="mt-2" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            </div>
          ) : filteredFamilyLocations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No family members added yet</p>
              <Link href="/family">
                <Button variant="outline" className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Family Member
                </Button>
              </Link>
            </div>
          ) : (
            filteredFamilyLocations.map((location) => (
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
