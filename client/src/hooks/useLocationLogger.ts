import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  type?: string;
}

export function useLocationLogger() {
  const { user, isAuthenticated } = useAuth();
  const { location, error } = useGeolocation({ 
    watch: true, 
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 300000 // 5 minutes
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveLocationMutation = useMutation({
    mutationFn: (locationData: LocationData) => 
      apiRequest('/api/locations', {
        method: 'POST',
        body: JSON.stringify(locationData),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations/family'] });
    },
    onError: (error: any) => {
      console.error('Failed to save location:', error);
    },
  });

  // Auto-save location when it changes (for real-time updates)
  useEffect(() => {
    if (
      isAuthenticated && 
      user?.locationSharingEnabled && 
      location && 
      !error
    ) {
      saveLocationMutation.mutate({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        type: 'manual',
      });
    }
  }, [location, error, isAuthenticated, user?.locationSharingEnabled]);

  // Handle location errors
  useEffect(() => {
    if (error && isAuthenticated) {
      console.warn('Location error:', error);
      // Don't show toast for every error to avoid spam
    }
  }, [error, isAuthenticated, toast]);

  return {
    currentLocation: location,
    locationError: error,
    isLoggingLocation: saveLocationMutation.isPending,
    saveLocation: (locationData: LocationData) => saveLocationMutation.mutate(locationData),
  };
}