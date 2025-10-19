import { useEffect, useRef } from 'react';
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
    enableHighAccuracy: false, // Use WiFi/IP location (works better on desktops without GPS)
    timeout: 60000, // 60 seconds timeout
    maximumAge: 300000 // 5 minutes
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Track last saved location to prevent duplicates
  const lastSavedLocationRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const saveInProgressRef = useRef(false);

  const saveLocationMutation = useMutation({
    mutationFn: async (locationData: LocationData) => {
      // Prevent multiple simultaneous saves
      if (saveInProgressRef.current) {
        console.log('⏸️ Save already in progress, skipping duplicate');
        return null;
      }
      
      saveInProgressRef.current = true;
      console.log('🔄 Attempting to save location:', locationData);
      
      try {
        const response = await apiRequest('POST', '/api/locations', locationData);
        console.log('✅ Location save response:', response);
        
        // Update last saved location
        lastSavedLocationRef.current = {
          lat: locationData.latitude,
          lng: locationData.longitude,
          timestamp: Date.now()
        };
        
        return response;
      } finally {
        saveInProgressRef.current = false;
      }
    },
    onSuccess: (data) => {
      if (data) {
        console.log('🎉 Location saved successfully:', data);
        queryClient.invalidateQueries({ queryKey: ['/api/locations/family'] });
      }
    },
    onError: (error: any) => {
      console.error('❌ Failed to save location:', error);
      saveInProgressRef.current = false;
      toast({
        title: "Location Save Failed",
        description: error.message || "Unable to save location. Please try logging in again.",
        variant: "destructive",
      });
    },
  });

  // Helper function to check if location is significantly different
  const isLocationSignificantlyDifferent = (newLat: number, newLng: number): boolean => {
    if (!lastSavedLocationRef.current) return true;
    
    const { lat: oldLat, lng: oldLng, timestamp } = lastSavedLocationRef.current;
    
    // If last save was more than 30 seconds ago, allow save
    if (Date.now() - timestamp > 30000) return true;
    
    // Calculate distance (simple approximation)
    const latDiff = Math.abs(newLat - oldLat);
    const lngDiff = Math.abs(newLng - oldLng);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    
    // Only save if moved more than ~10 meters (rough approximation: 0.0001 degrees ≈ 11 meters)
    return distance > 0.0001;
  };

  // Auto-save location when it changes (for real-time updates)
  useEffect(() => {
    if (
      isAuthenticated && 
      user && 
      (user as any).locationSharingEnabled !== false && 
      location && 
      !error &&
      !saveInProgressRef.current &&
      isLocationSignificantlyDifferent(location.latitude, location.longitude)
    ) {
      console.log('📍 Saving location:', { lat: location.latitude, lng: location.longitude });
      saveLocationMutation.mutate({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        type: 'manual',
      });
    }
  }, [location, error, isAuthenticated, user]);

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
  }, [isAuthenticated, user, location, error]);

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