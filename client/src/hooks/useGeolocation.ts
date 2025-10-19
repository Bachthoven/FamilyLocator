import { useState, useEffect, useRef } from 'react';

interface GeolocationState {
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  error: string | null;
  loading: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
  });

  const watchId = useRef<number | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    watch = false,
  } = options;

  const attemptGeolocation = (isRetry = false) => {
    if (!isRetry) {
      retryCount.current = 0;
    }

    const onSuccess = (position: GeolocationPosition) => {
      console.log('✅ Geolocation success:', position.coords);
      setState({
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        },
        error: null,
        loading: false,
      });
      retryCount.current = 0;
    };

    const onError = (error: GeolocationPositionError) => {
      console.error('❌ Geolocation error:', error);
      let errorMessage = 'An unknown error occurred';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied by user';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out';
          break;
      }

      // Retry with lower accuracy if high accuracy failed
      if (retryCount.current < maxRetries && enableHighAccuracy) {
        retryCount.current++;
        console.log(`⏱️ Retrying geolocation (attempt ${retryCount.current}/${maxRetries}) with lower accuracy...`);
        
        // Try with lower accuracy settings
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (retryError) => {
            setState({
              location: null,
              error: errorMessage,
              loading: false,
            });
          },
          {
            enableHighAccuracy: false,
            timeout: timeout * 2, // Double the timeout
            maximumAge: maximumAge,
          }
        );
        return;
      }

      setState({
        location: null,
        error: errorMessage,
        loading: false,
      });
    };

    const geoOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    if (watch) {
      watchId.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        geoOptions
      );
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptions);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        location: null,
        error: 'Geolocation is not supported by this browser',
        loading: false,
      });
      return;
    }

    attemptGeolocation();

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [enableHighAccuracy, timeout, maximumAge, watch]);

  const getCurrentLocation = () => {
    setState(prev => ({ ...prev, loading: true }));
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMessage = 'An unknown error occurred';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setState({
          location: null,
          error: errorMessage,
          loading: false,
        });
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  };

  return {
    ...state,
    getCurrentLocation,
  };
}
