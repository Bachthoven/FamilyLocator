import { renderHook, act } from '@testing-library/react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useLocationService } from '../useLocationService';

// Mock dependencies
jest.mock('expo-location');
jest.mock('expo-task-manager');

const mockLocation = Location as jest.Mocked<typeof Location>;
const mockTaskManager = TaskManager as jest.Mocked<typeof TaskManager>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useLocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    });

    const { result } = renderHook(() => useLocationService());

    expect(result.current.currentLocation).toBeNull();
    expect(result.current.isLocationEnabled).toBe(false);
    expect(result.current.locationPermissions).toBeNull();
  });

  it('should check location permissions on mount', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });

    const { result } = renderHook(() => useLocationService());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockLocation.getForegroundPermissionsAsync).toHaveBeenCalled();
    expect(result.current.locationPermissions).toBe('granted');
    expect(result.current.isLocationEnabled).toBe(true);
  });

  it('should request location permissions successfully', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });

    const { result } = renderHook(() => useLocationService());

    let permissionResult: boolean = false;
    await act(async () => {
      permissionResult = await result.current.requestLocationPermissions();
    });

    expect(permissionResult).toBe(true);
    expect(result.current.isLocationEnabled).toBe(true);
    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(mockLocation.requestBackgroundPermissionsAsync).toHaveBeenCalled();
  });

  it('should handle denied location permissions', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    });

    const { result } = renderHook(() => useLocationService());

    let permissionResult: boolean = false;
    await act(async () => {
      permissionResult = await result.current.requestLocationPermissions();
    });

    expect(permissionResult).toBe(false);
  });

  it('should get current location successfully', async () => {
    const mockLocationData = {
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 5,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    };

    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.getCurrentPositionAsync.mockResolvedValue(mockLocationData);

    const { result } = renderHook(() => useLocationService());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    let currentLocation: any = null;
    await act(async () => {
      currentLocation = await result.current.getCurrentLocation();
    });

    expect(currentLocation).toEqual({
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 5,
      timestamp: mockLocationData.timestamp,
    });
    expect(result.current.currentLocation).toEqual(currentLocation);
  });

  it('should handle location permission denied for getCurrentLocation', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    });

    const { result } = renderHook(() => useLocationService());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    let currentLocation: any = null;
    await act(async () => {
      currentLocation = await result.current.getCurrentLocation();
    });

    expect(currentLocation).toBeNull();
  });

  it('should start location tracking successfully', async () => {
    const mockLocationData = {
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 5,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    };

    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.getCurrentPositionAsync.mockResolvedValue(mockLocationData);
    mockTaskManager.isTaskDefined.mockReturnValue(true);

    const { result } = renderHook(() => useLocationService());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    let trackingResult: boolean = false;
    await act(async () => {
      trackingResult = await result.current.startLocationTracking();
    });

    expect(trackingResult).toBe(true);
    expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
      'background-location-task',
      expect.objectContaining({
        accuracy: Location.Accuracy.High,
        timeInterval: 60000,
        distanceInterval: 10,
      })
    );
  });

  it('should stop location tracking', async () => {
    mockLocation.hasStartedLocationUpdatesAsync.mockResolvedValue(true);

    const { result } = renderHook(() => useLocationService());

    await act(async () => {
      await result.current.stopLocationTracking();
    });

    expect(mockLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith(
      'background-location-task'
    );
    expect(result.current.isLocationEnabled).toBe(false);
  });

  it('should update location to server successfully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
    } as Response);

    const { result } = renderHook(() => useLocationService());

    const locationData = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 5,
      timestamp: Date.now(),
    };

    let updateResult: boolean = false;
    await act(async () => {
      updateResult = await result.current.updateLocationToServer(locationData);
    });

    expect(updateResult).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/locations',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          timestamp: new Date(locationData.timestamp).toISOString(),
        }),
      })
    );
  });

  it('should handle server update failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    } as Response);

    const { result } = renderHook(() => useLocationService());

    const locationData = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 5,
      timestamp: Date.now(),
    };

    let updateResult: boolean = false;
    await act(async () => {
      updateResult = await result.current.updateLocationToServer(locationData);
    });

    expect(updateResult).toBe(false);
  });

  it('should watch position successfully', async () => {
    const mockLocationData = {
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 5,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    };

    const mockSubscription = { remove: jest.fn() };
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.watchPositionAsync.mockImplementation(
      (options, callback) => {
        // Simulate calling the callback
        setTimeout(() => callback(mockLocationData), 0);
        return Promise.resolve(mockSubscription);
      }
    );

    const { result } = renderHook(() => useLocationService());
    const mockCallback = jest.fn();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    let subscription: any = null;
    await act(async () => {
      subscription = await result.current.watchPosition(mockCallback);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(subscription).toBe(mockSubscription);
    expect(mockCallback).toHaveBeenCalledWith({
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 5,
      timestamp: mockLocationData.timestamp,
    });
  });
});