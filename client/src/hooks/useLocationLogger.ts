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
    mutationFn: async (locationData: LocationData) => {
      console.log('🔄 Attempting to save location:', locationData);
      console.log('🔐 User authenticated:', isAuthenticated);
      console.log('👤 User data:', user);
      const response = await apiRequest('POST', '/api/locations', locationData);
      console.log('✅ Location save response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('🎉 Location saved successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/locations/family'] });
    },
    onError: (error: any) => {
      console.error('❌ Failed to save location:', error);
      toast({
        title: "Location Save Failed",
        description: error.message || "Unable to save location. Please try logging in again.",
        variant: "destructive",
      });
    },
  });

  // Auto-save location when it changes (for real-time updates)
  useEffect(() => {
    console.log('🗺️ Location change detected:', {
      isAuthenticated,
      hasUser: !!user,
      locationSharingEnabled: (user as any)?.locationSharingEnabled,
      hasLocation: !!location,
      hasError: !!error,
      locationData: location
    });
    
    if (
      isAuthenticated && 
      user && 
      (user as any).locationSharingEnabled !== false && 
      location && 
      !error
    ) {
      console.log('📍 All conditions met, saving location...');
      saveLocationMutation.mutate({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        type: 'manual',
      });
    } else {
      console.log('❌ Location save conditions not met:', {
        authenticated: isAuthenticated,
        user: !!user,
        sharingEnabled: (user as any)?.locationSharingEnabled,
        location: !!location,
        error: error
      });
    }
  }, [location, error, isAuthenticated, user, saveLocationMutation]);

  // Auto-location logging at configurable intervals
  useEffect(() => {
    const autoLocationEnabled = localStorage.getItem('autoLocationEnabled') === 'true';
    const intervalMinutes = parseInt(localStorage.getItem('autoLocationInterval') || '60');
    
    if (!autoLocationEnabled || !isAuthenticated || !user || !location) {
      return;
    }

    console.log(`🕰️ Setting up auto-location logging every ${intervalMinutes} minutes`);
    
    const interval = setInterval(() => {
      if (isAuthenticated && user && location && !error) {
        console.log('⏰ Auto-location logging triggered');
        saveLocationMutation.mutate({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          type: 'automatic_hourly',
        });
      }
    }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds

    return () => {
      console.log('🛑 Clearing auto-location logging interval');
      clearInterval(interval);
    };
  }, [isAuthenticated, user, location, error, saveLocationMutation]);

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