# Family Locator Mobile App

A React Native mobile application for family location sharing, built with Expo.

## Features

- 🔐 Authentication (Login/Register)
- 📍 Real-time location sharing
- 🗺️ Interactive maps with family member locations
- 👨‍👩‍👧‍👦 Family management with invite codes
- 📱 Push notifications
- 🏠 Saved places and geofencing
- 📊 Location history
- ⚙️ Privacy and notification settings

## Development Setup

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (for macOS) or Android Emulator
- Physical device with Expo Go app (recommended for testing location features)

### Installation

1. Navigate to the mobile directory:

   ```bash
   cd mobile
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

### Testing on Devices

#### iOS (macOS only)

1. **iOS Simulator:**

   ```bash
   npx expo start --ios
   ```

2. **Physical iOS Device:**
   - Install Expo Go from the App Store
   - Scan the QR code from the terminal/browser
   - Note: Location features work better on physical devices

#### Android

1. **Android Emulator:**

   ```bash
   npx expo start --android
   ```

2. **Physical Android Device:**
   - Install Expo Go from Google Play Store
   - Scan the QR code from the terminal/browser

### Running with Expo Go

1. Start the development server:

   ```bash
   npx expo start
   ```

2. Scan the QR code with:
   - **iOS**: Camera app or Expo Go
   - **Android**: Expo Go app

## Backend Connection

The app is configured to connect to a backend server. Update the API base URL in `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-production-url.com/api';
```

For local development, ensure your backend server is running on `http://localhost:3000`.

## Key Dependencies

- **React Navigation**: Navigation and routing
- **Expo Location**: GPS and location services
- **React Native Maps**: Map display and markers
- **Expo Notifications**: Push notifications
- **Expo Secure Store**: Secure token storage
- **React Query**: API state management
- **Expo Task Manager**: Background location tracking

## Project Structure

```
mobile/
├── src/
│   ├── hooks/           # Custom React hooks
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # App screens/pages
│   ├── services/        # API and external services
│   └── components/      # Reusable components
├── shared/              # Shared types and schemas
├── assets/              # Images and static assets
└── app.json             # Expo configuration
```

## Environment Setup

### Location Services

Location features require proper permissions:

- **iOS**: Configured in `app.json` under `ios.infoPlist`
- **Android**: Configured in `app.json` under `android.permissions`

### Push Notifications

For production push notifications:

1. Set up Expo Application Services (EAS)
2. Update the `projectId` in `app.json`
3. Build with EAS: `npx eas build`

## Building for Production

### Development Build (Recommended)

```bash
npx eas build --profile development --platform all
```

### Production Build

```bash
npx eas build --profile production --platform all
```

## Troubleshooting

### Location Services

- Test on physical devices for accurate location data
- Ensure location permissions are granted
- Check that location services are enabled on the device

### Maps

- Google Maps requires API key for production
- Apple Maps works out of the box on iOS

### Network Issues

- Ensure backend server is accessible
- Check network permissions in development
- Use appropriate URLs for development vs. production

## Contributing

1. Follow the existing code style
2. Test on both iOS and Android
3. Ensure TypeScript types are properly defined
4. Test location features on physical devices

## License

[Your License Here]
