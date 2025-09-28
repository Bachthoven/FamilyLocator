import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    console.log('Received new locations', locations);
    // Here you would send the location to your server
  }
});

export function useLocationService() {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [locationPermissions, setLocationPermissions] = useState<Location.PermissionStatus | null>(null);

  useEffect(() => {
    checkLocationPermissions();
  }, []);

  const checkLocationPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermissions(status);
      setIsLocationEnabled(status === 'granted');
    } catch (error) {
      console.error('Error checking location permissions:', error);
    }
  };

  const requestLocationPermissions = async (): Promise<boolean> => {
    try {
      // Request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        return false;
      }

      // Request background permissions for continuous tracking
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== 'granted') {
        console.log('Background location permission denied');
        // We can still work with foreground permissions
      }

      setLocationPermissions(foregroundStatus);
      setIsLocationEnabled(true);
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      if (locationPermissions !== 'granted') {
        console.log('Location permissions not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: location.timestamp,
      };

      setCurrentLocation(locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  };

  const startLocationTracking = async (): Promise<boolean> => {
    try {
      if (locationPermissions !== 'granted') {
        console.log('Location permissions not granted');
        return false;
      }

      // Start foreground location tracking
      const location = await getCurrentLocation();
      if (!location) {
        return false;
      }

      // Check if background task is available
      const isTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (!isTaskDefined) {
        console.log('Background location task not defined');
        return true; // Still return true for foreground tracking
      }

      // Start background location tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 60000, // Update every minute
        distanceInterval: 10, // Update when moved 10 meters
        foregroundService: {
          notificationTitle: 'Family Locator',
          notificationBody: 'Sharing location with family',
        },
      });

      setIsLocationEnabled(true);
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  };

  const stopLocationTracking = async (): Promise<void> => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
      setIsLocationEnabled(false);
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  };

  const updateLocationToServer = async (location: LocationData): Promise<boolean> => {
    try {
      // This will be implemented when we connect to the backend
      const API_BASE_URL = 'http://localhost:3000/api';

      const response = await fetch(`${API_BASE_URL}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header here
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: new Date(location.timestamp).toISOString(),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating location to server:', error);
      return false;
    }
  };

  const watchPosition = async (callback: (location: LocationData) => void) => {
    try {
      if (locationPermissions !== 'granted') {
        console.log('Location permissions not granted');
        return null;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 10, // 10 meters
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? undefined,
            timestamp: location.timestamp,
          };
          setCurrentLocation(locationData);
          callback(locationData);
        }
      );

      return subscription;
    } catch (error) {
      console.error('Error watching position:', error);
      return null;
    }
  };

  return {
    currentLocation,
    isLocationEnabled,
    locationPermissions,
    requestLocationPermissions,
    getCurrentLocation,
    startLocationTracking,
    stopLocationTracking,
    updateLocationToServer,
    watchPosition,
  };
}