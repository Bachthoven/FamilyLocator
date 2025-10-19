# FamilyLocator Mobile App Setup Guide

## Quick Start

### Prerequisites

- Install **Expo Go** app on your phone:
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Running the Mobile App

1. **Start the backend server** (if not already running):

   ```bash
   npm run dev
   ```

   This runs the Express backend on port 5000.

2. **In a new terminal, start Expo**:

   ```bash
   npx expo start --clear
   ```

   This runs the Metro bundler on port 8081.

3. **Connect your phone**:
   - A QR code will appear in the terminal
   - **iOS**: Open Camera app and scan the QR code
   - **Android**: Open Expo Go app and scan the QR code

### Alternative: Use the Development Script

Run both servers with one command:

```bash
./scripts/dev-mobile.sh
```

## Testing on Physical Device

When testing on a physical device (not simulator), you need to update the API URL to point to your computer's IP address:

1. Find your computer's local IP address:

   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows
   ipconfig
   ```

2. Edit `mobile/src/api/config.ts`:

   ```typescript
   // Replace 'localhost' with your computer's IP address
   const devUrl = "http://192.168.1.XXX:5000"; // Replace XXX
   ```

3. Restart Expo after making the change.

## Project Structure

```
/
├── App.tsx                 # Main mobile app entry point
├── app.json               # Expo configuration
├── babel.config.js        # Babel configuration
├── metro.config.js        # Metro bundler configuration
├── mobile/
│   ├── assets/           # App icons and images
│   └── src/
│       ├── api/          # API configuration
│       ├── components/   # React Native components
│       ├── navigation/   # Navigation setup
│       ├── screens/      # App screens
│       └── utils/        # Utility functions
└── server/               # Shared Express backend
```

## Current Status

✅ **Completed:**

- Expo project initialization
- TypeScript configuration
- Metro bundler setup
- Backend connection (/api/health endpoint)
- ES module compatibility

🚧 **In Progress:**

- React Navigation (Phase 2)
- UI components and screens
- Map integration
- Real-time location features

## Troubleshooting

### "ReferenceError: require is not defined"

This is fixed! Config files now use ES module syntax.

### "Cannot connect to Metro bundler"

- Make sure Expo is running (`npx expo start`)
- Check that port 8081 is not in use
- Try clearing Metro cache: `npx expo start --clear`

### Backend connection fails

- Verify Express backend is running on port 5000
- Test health endpoint: `curl http://localhost:5000/api/health`
- Update API URL in `mobile/src/api/config.ts` if using physical device

## Next Steps

After completing Phase 1 setup, proceed with:

1. Install and configure React Navigation
2. Set up react-native-maps for location features
3. Build authentication screens
4. Implement family member location display

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Replit Expo Template](https://replit.com/@replit/Expo)
