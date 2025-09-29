import '@testing-library/jest-native/extend-expect';

// Mock expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  LocationAccuracy: {
    Balanced: 1,
    High: 2,
  },
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MapView = React.forwardRef((props: any, ref: any) => React.createElement(View, { ...props, ref }));
  MapView.Marker = View;
  MapView.Circle = View;

  return MapView;
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Silence console logs during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};