import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../useAuth';
import { apiService } from '../../services/api';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('expo-secure-store');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

// Test wrapper component
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
};

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error when used outside of AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('should initialize with no user and loading state', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true);

    // Wait for the effect to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should load stored user on initialization', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };
    mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle login successfully', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };
    const mockLoginResponse = {
      user: mockUser,
      sessionToken: 'mock-token',
    };
    mockApiService.login.mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(mockApiService.login).toHaveBeenCalledWith(
      'test@example.com',
      'password'
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'user',
      JSON.stringify(mockUser)
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'sessionToken',
      'mock-token'
    );
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle login error', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    const mockError = new Error('Invalid credentials');
    mockApiService.login.mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrong-password');
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle registration successfully', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };
    const mockRegisterResponse = {
      user: mockUser,
      sessionToken: 'mock-token',
    };
    mockApiService.register.mockResolvedValue(mockRegisterResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const userData = {
      email: 'test@example.com',
      password: 'password',
      firstName: 'John',
      lastName: 'Doe',
    };

    await act(async () => {
      await result.current.register(userData);
    });

    expect(mockApiService.register).toHaveBeenCalledWith(userData);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'user',
      JSON.stringify(mockUser)
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'sessionToken',
      'mock-token'
    );
    expect(result.current.user).toEqual(mockUser);
  });

  it('should handle logout successfully', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };
    mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.user).toEqual(mockUser);

    await act(async () => {
      await result.current.logout();
    });

    expect(mockApiService.logout).toHaveBeenCalled();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('user');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'sessionToken'
    );
    expect(result.current.user).toBeNull();
  });

  it('should handle logout error gracefully', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };
    mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockUser));
    mockApiService.logout.mockRejectedValue(new Error('Logout failed'));

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.logout();
    });

    // Should still clear user data even if API call fails
    expect(result.current.user).toBeNull();
  });
});
