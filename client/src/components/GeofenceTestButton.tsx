import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function GeofenceTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const testGeofencing = async () => {
    setIsLoading(true);
    
    try {
      // First, create a test place if none exists
      const testPlace = {
        name: "Test Location",
        address: "Test Address, Test City",
        latitude: 37.7749, // San Francisco coordinates as example
        longitude: -122.4194,
        category: "other"
      };

      // Save the test place
      await apiRequest('POST', '/api/places', testPlace);
      
      // Simulate entering the geofence (location very close to the place)
      const enterLocation = {
        latitude: 37.7749 + 0.0001, // About 11 meters away
        longitude: -122.4194 + 0.0001,
        accuracy: 5,
        address: "Near Test Location",
        type: "manual"
      };

      await apiRequest('POST', '/api/locations', enterLocation);
      
      // Wait a moment, then simulate exiting
      setTimeout(async () => {
        const exitLocation = {
          latitude: 37.7749 + 0.002, // About 200 meters away
          longitude: -122.4194 + 0.002,
          accuracy: 5,
          address: "Away from Test Location",
          type: "manual"
        };

        await apiRequest('POST', '/api/locations', exitLocation);
        
        toast({
          title: "Geofence Test Complete",
          description: "Check for notifications showing entry and exit events.",
        });
        
        setIsLoading(false);
      }, 2000);

      toast({
        title: "Geofence Test Started",
        description: "Simulating entering and exiting test location...",
      });

    } catch (error) {
      console.error('Geofence test error:', error);
      toast({
        title: "Test Failed",
        description: "Could not run geofence test. Check console for details.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Geofencing Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Test the geofencing notification system by simulating location changes around a test place.
        </p>
        
        <Button 
          onClick={testGeofencing}
          disabled={isLoading}
          className="w-full"
        >
          <MapPin className="h-4 w-4 mr-2" />
          {isLoading ? 'Running Test...' : 'Test Geofencing'}
        </Button>
        
        <div className="text-xs text-gray-500 dark:text-gray-500">
          <p>This will:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Create a test location</li>
            <li>Simulate entering the area (should trigger notification)</li>
            <li>Simulate leaving the area (should trigger notification)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}