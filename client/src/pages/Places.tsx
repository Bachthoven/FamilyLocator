import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import BottomNavigation from '@/components/BottomNavigation';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Bookmark, MapPin, Home, Briefcase, GraduationCap, Trash2 } from 'lucide-react';
import { Place, User } from '@shared/schema';

const categoryIcons = {
  home: Home,
  work: Briefcase,
  school: GraduationCap,
  other: MapPin,
};

const categoryColors = {
  home: 'text-blue-500',
  work: 'text-green-500',
  school: 'text-purple-500',
  other: 'text-orange-500',
};

export default function Places() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addPlaceDialogOpen, setAddPlaceDialogOpen] = useState(false);
  const [newPlace, setNewPlace] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    category: 'other' as const,
  });
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  // Fetch family places (now includes user info for each place)
  const { data: places = [], isLoading } = useQuery<Array<Place & { user: User }>>({
    queryKey: ['/api/places'],
    enabled: !!user,
  });

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewPlace(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: `GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          }));
          setUseCurrentLocation(true);
          toast({
            title: "Location captured",
            description: "Using your current GPS coordinates",
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Location error",
            description: "Could not get your current location",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive",
      });
    }
  };

  // Add place mutation
  const addPlaceMutation = useMutation({
    mutationFn: async (placeData: typeof newPlace) => {
      const response = await apiRequest('POST', '/api/places', placeData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Place saved",
        description: "Your place has been saved successfully.",
      });
      setAddPlaceDialogOpen(false);
      setNewPlace({
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        category: 'other',
      });
      setUseCurrentLocation(false);
      queryClient.invalidateQueries({ queryKey: ['/api/places'] });
      // Trigger a toast to indicate the place was added to the map
      setTimeout(() => {
        toast({
          title: "Place Added to Map",
          description: "Your new place is now visible on the map!",
        });
      }, 500);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save place. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete place mutation
  const deletePlaceMutation = useMutation({
    mutationFn: async (placeId: number) => {
      await apiRequest('DELETE', `/api/places/${placeId}`);
    },
    onSuccess: () => {
      toast({
        title: "Place deleted",
        description: "Your place has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/places'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete place. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddPlace = () => {
    if (!newPlace.name.trim() || !newPlace.address.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if coordinates were set by autocomplete
    if (newPlace.latitude === 0 && newPlace.longitude === 0) {
      toast({
        title: "Location Not Found",
        description: "Please select an address from the suggestions to get precise coordinates.",
        variant: "destructive",
      });
      return;
    }
    
    addPlaceMutation.mutate(newPlace);
  };

  const handleDeletePlace = (placeId: number, placeName: string) => {
    if (confirm(`Are you sure you want to delete "${placeName}"?`)) {
      console.log('Deleting place:', placeId, 'User ID:', user?.id);
      deletePlaceMutation.mutate(placeId);
    }
  };

  const groupedPlaces = places.reduce((acc: Record<string, Array<Place & { user: User }>>, place: Place & { user: User }) => {
    const category = place.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(place);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Bookmark className="w-6 h-6 mr-2" />
              Saved Places
            </h1>
            <p className="text-muted-foreground">
              Manage your favorite and frequently visited places
            </p>
          </div>
          
          <Dialog open={addPlaceDialogOpen} onOpenChange={setAddPlaceDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Place
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Place</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Place Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Home, Office, School"
                    value={newPlace.name}
                    onChange={(e) => setNewPlace(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="address">Address *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      className="text-xs"
                    >
                      <MapPin className="w-3 h-3 mr-1" />
                      Use Current Location
                    </Button>
                  </div>
                  {!useCurrentLocation ? (
                    <AddressAutocomplete
                      value={newPlace.address}
                      onValueChange={(address) => setNewPlace(prev => ({ ...prev, address }))}
                      onLocationSelect={(location) => setNewPlace(prev => ({
                        ...prev,
                        address: location.address,
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }))}
                      placeholder="Start typing an address..."
                    />
                  ) : (
                    <Input
                      value={newPlace.address}
                      readOnly
                      className="bg-green-50 border-green-200"
                      placeholder="Using current GPS location"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newPlace.category}
                    onValueChange={(value: any) => setNewPlace(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setAddPlaceDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddPlace}
                    disabled={addPlaceMutation.isPending}
                  >
                    {addPlaceMutation.isPending ? 'Saving...' : 'Save Place'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Places List */}
        {isLoading ? (
          // Loading skeletons
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="w-24 h-6 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <Card key={j}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="w-32 h-5 mb-2" />
                            <Skeleton className="w-48 h-4" />
                          </div>
                          <Skeleton className="w-8 h-8" />
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : places.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No saved places yet</h3>
            <p className="text-muted-foreground mb-6">
              Save your favorite places for quick access and easy sharing
            </p>
            <Button onClick={() => setAddPlaceDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Place
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPlaces).map(([category, categoryPlaces]) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons];
              const colorClass = categoryColors[category as keyof typeof categoryColors];
              
              return (
                <div key={category}>
                  <h2 className="text-lg font-semibold mb-4 flex items-center capitalize">
                    <Icon className={`w-5 h-5 mr-2 ${colorClass}`} />
                    {category}
                  </h2>
                  
                  <div className="space-y-3">
                    {categoryPlaces.map((place: Place & { user: User }) => (
                      <Card key={place.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colorClass}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm sm:text-base truncate">{place.name}</CardTitle>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{place.address}</p>
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  Added by {place.user.firstName || place.user.email}
                                </p>
                              </div>
                            </div>
                            
                            {/* Delete button - allow family members to delete any place */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePlace(place.id, place.name)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2 w-8 h-8 sm:w-10 sm:h-10"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Statistics */}
        {places.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{places.length}</div>
                    <div className="text-sm text-muted-foreground">Total Places</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {Object.keys(groupedPlaces).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Categories</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
